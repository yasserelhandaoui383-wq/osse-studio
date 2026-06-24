import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import WebSocket from "ws";
import { env } from "./env";
import { AppError } from "./errors";

type ComfyGraph = Record<string, any>;

/** Quick health probe used by the status endpoint and before any generation. */
export async function comfyOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${env.COMFYUI_URL}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Queue a prompt graph and resolve when it finishes, returning saved file paths. */
export async function runWorkflow(
  graph: ComfyGraph,
  opts: { timeoutMs?: number } = {}
): Promise<{ files: { filename: string; subfolder: string; type: string }[] }> {
  if (!(await comfyOnline())) {
    throw new AppError(
      "ComfyUI is offline. Start it locally (see README) \u2014 e.g. `python main.py --listen 127.0.0.1 --port 8188` " +
        "\u2014 then retry. Generation is 100% free and runs on your own GPU; no API key required.",
      503
    );
  }

  const clientId = randomUUID();
  const promptRes = await fetch(`${env.COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: graph, client_id: clientId }),
  });
  if (!promptRes.ok) {
    const body = await promptRes.text().catch(() => "");
    throw new AppError(`ComfyUI rejected the workflow: ${promptRes.status} ${body}`, 502);
  }
  const { prompt_id: promptId } = (await promptRes.json()) as { prompt_id: string };

  await waitForCompletion(promptId, clientId, opts.timeoutMs ?? 180_000);
  return collectOutputs(promptId);
}

function waitForCompletion(promptId: string, clientId: string, timeoutMs: number) {
  const wsUrl = env.COMFYUI_URL.replace(/^http/, "ws") + `/ws?clientId=${clientId}`;
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new AppError("ComfyUI generation timed out.", 504));
    }, timeoutMs);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "executing" && msg.data?.node === null && msg.data?.prompt_id === promptId) {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
        if (msg.type === "execution_error" && msg.data?.prompt_id === promptId) {
          clearTimeout(timer);
          ws.close();
          reject(new AppError(`ComfyUI execution error: ${msg.data?.exception_message ?? "unknown"}`, 502));
        }
      } catch {
        /* ignore non-JSON frames */
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(new AppError(`ComfyUI websocket error: ${(e as Error).message}`, 502));
    });
  });
}

async function collectOutputs(promptId: string) {
  const res = await fetch(`${env.COMFYUI_URL}/history/${promptId}`);
  if (!res.ok) throw new AppError("Could not read ComfyUI history.", 502);
  const history = (await res.json()) as Record<string, any>;
  const outputs = history[promptId]?.outputs ?? {};
  const files: { filename: string; subfolder: string; type: string }[] = [];
  for (const nodeId of Object.keys(outputs)) {
    const node = outputs[nodeId];
    for (const key of ["images", "gifs", "videos"]) {
      if (Array.isArray(node[key])) {
        for (const f of node[key]) {
          files.push({ filename: f.filename, subfolder: f.subfolder ?? "", type: f.type ?? "output" });
        }
      }
    }
  }
  if (files.length === 0) throw new AppError("ComfyUI produced no output files.", 502);
  return { files };
}

/** Download a ComfyUI output file to MEDIA_DIR and return its relative media path. */
export async function downloadOutput(
  file: { filename: string; subfolder: string; type: string },
  destRelDir: string
): Promise<string> {
  const url = new URL(`${env.COMFYUI_URL}/view`);
  url.searchParams.set("filename", file.filename);
  url.searchParams.set("subfolder", file.subfolder);
  url.searchParams.set("type", file.type);

  const res = await fetch(url.toString());
  if (!res.ok) throw new AppError(`Failed to download ComfyUI output ${file.filename}.`, 502);
  const buf = Buffer.from(await res.arrayBuffer());

  const { mediaRoot } = await import("./env");
  const absDir = path.join(mediaRoot(), destRelDir);
  fs.mkdirSync(absDir, { recursive: true });
  const abs = path.join(absDir, file.filename);
  fs.writeFileSync(abs, buf);
  return path.posix.join(destRelDir, file.filename);
}
