import fs from "fs";
import { env } from "../env";
import { AppError } from "../errors";
import type { VideoProvider, VideoRequest } from "./index";

/**
 * Kling cloud adapter (OPTIONAL fallback). Endpoints here are placeholders that
 * follow Kling's documented shape; verify them against the current Kling API
 * before relying on cloud mode. Local ComfyUI generation never depends on this.
 */
export const klingProvider: VideoProvider = {
  name: "kling",
  async imageToVideo(req: VideoRequest): Promise<Buffer> {
    if (!env.KLING_API_KEY) {
      throw new AppError("Kling API key is not set. Add KLING_API_KEY to your .env (optional) or stay in free local mode.", 400);
    }
    const imageB64 = fs.readFileSync(req.imageAbsPath).toString("base64");

    const createRes = await fetch(`${env.KLING_API_BASE}/v1/videos/image2video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.KLING_API_KEY}`,
      },
      body: JSON.stringify({
        image: imageB64,
        prompt: req.prompt,
        duration: req.durationSeconds,
        camera_control: req.cameraMotion,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      throw new AppError(`Kling request failed (${createRes.status}): ${body || "no body"}`, 502);
    }
    const { task_id: taskId } = (await createRes.json()) as { task_id: string };

    // Poll for completion.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await fetch(`${env.KLING_API_BASE}/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${env.KLING_API_KEY}` },
      });
      if (!statusRes.ok) continue;
      const data = (await statusRes.json()) as { status: string; video_url?: string };
      if (data.status === "succeed" && data.video_url) {
        const dl = await fetch(data.video_url);
        if (!dl.ok) throw new AppError("Kling produced a video but it could not be downloaded.", 502);
        return Buffer.from(await dl.arrayBuffer());
      }
      if (data.status === "failed") throw new AppError("Kling reported the video job failed.", 502);
    }
    throw new AppError("Kling video job timed out.", 504);
  },
};
