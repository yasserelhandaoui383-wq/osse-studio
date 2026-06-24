import fs from "fs";
import path from "path";
import { prisma } from "./db";
import { env, mediaRoot } from "./env";
import { AppError } from "./errors";
import { runWorkflow, downloadOutput } from "./comfyui";
import { activeCloudProvider, type CameraMotion } from "./providers";
import sdxlTurbo from "./workflows/sdxl_turbo.json";
import ltxVideo from "./workflows/ltx_video.json";

const NEGATIVE = "blurry, low quality, watermark, text, deformed";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function projectDir(projectId: string): string {
  const dir = path.join(mediaRoot(), "projects", projectId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Text-to-image via SDXL Turbo on local ComfyUI. Returns a media-relative path. */
export async function generateImage(shotId: string): Promise<string> {
  const shot = await prisma.shot.findUnique({ where: { id: shotId } });
  if (!shot) throw new AppError("Shot not found.", 404);
  if (!shot.prompt.trim()) throw new AppError("Add a prompt before generating an image.", 400);

  const graph = clone(sdxlTurbo) as Record<string, any>;
  graph["6"].inputs.text = shot.prompt;
  graph["7"].inputs.text = NEGATIVE;
  graph["3"].inputs.seed = Math.floor(Math.random() * 2 ** 31);

  const { files } = await runWorkflow(graph, { timeoutMs: 120_000 });
  const relDir = path.posix.join("projects", shot.projectId);
  const rel = await downloadOutput(files[0], relDir);

  await prisma.shot.update({ where: { id: shotId }, data: { imagePath: rel } });
  await prisma.asset.create({
    data: { shotId, type: "image", filePath: rel, sourceEngine: "local" },
  });
  return rel;
}

/**
 * Image-to-video. Uses local LTX-Video by default. If a cloud provider key is
 * configured AND local ComfyUI is unreachable, falls back to the cloud provider.
 */
export async function generateVideo(shotId: string): Promise<string> {
  const shot = await prisma.shot.findUnique({ where: { id: shotId } });
  if (!shot) throw new AppError("Shot not found.", 404);
  if (!shot.imagePath) throw new AppError("Generate or upload an image for this shot first.", 400);

  const imageAbs = path.join(mediaRoot(), shot.imagePath);
  if (!fs.existsSync(imageAbs)) throw new AppError("The shot's image is missing on disk. Re-generate it.", 400);

  const relDir = path.posix.join("projects", shot.projectId);

  try {
    // 1) Upload the source image to ComfyUI, then run the LTX graph.
    const uploadedName = await uploadImageToComfy(imageAbs);
    const graph = clone(ltxVideo) as Record<string, any>;
    graph["2"].inputs.image = uploadedName;
    graph["3"].inputs.text = shot.prompt || "cinematic motion";
    graph["4"].inputs.text = NEGATIVE;
    graph["5"].inputs.motion = motionToStrength(shot.cameraMotion as CameraMotion);
    graph["5"].inputs.seed = Math.floor(Math.random() * 2 ** 31);

    const { files } = await runWorkflow(graph, { timeoutMs: 300_000 });
    const rel = await downloadOutput(files[0], relDir);
    await finalizeVideo(shotId, rel, "local");
    return rel;
  } catch (localErr) {
    const cloud = activeCloudProvider();
    if (!cloud) throw localErr; // local-only mode: surface the real error.

    // 2) Cloud fallback (only when a key exists).
    const buf = await cloud.imageToVideo({
      imageAbsPath: imageAbs,
      prompt: shot.prompt,
      cameraMotion: shot.cameraMotion as CameraMotion,
      durationSeconds: shot.durationSeconds,
    });
    const fileName = `osse_vid_${Date.now()}.mp4`;
    const absDir = path.join(mediaRoot(), relDir);
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, fileName), buf);
    const rel = path.posix.join(relDir, fileName);
    await finalizeVideo(shotId, rel, "cloud");
    return rel;
  }
}

async function finalizeVideo(shotId: string, rel: string, engine: "local" | "cloud") {
  await prisma.shot.update({ where: { id: shotId }, data: { videoPath: rel } });
  await prisma.asset.create({ data: { shotId, type: "video", filePath: rel, sourceEngine: engine } });
}

function motionToStrength(motion: CameraMotion): number {
  switch (motion) {
    case "static": return 0.2;
    case "pan_left":
    case "pan_right": return 0.6;
    case "zoom_in":
    case "zoom_out": return 0.7;
    case "dolly": return 0.9;
    default: return 0.5;
  }
}

async function uploadImageToComfy(absPath: string): Promise<string> {
  const data = fs.readFileSync(absPath);
  const form = new FormData();
  form.append("image", new Blob([data]), path.basename(absPath));
  form.append("overwrite", "true");
  const res = await fetch(`${env.COMFYUI_URL}/upload/image`, { method: "POST", body: form });
  if (!res.ok) throw new AppError("Failed to upload the source image to ComfyUI.", 502);
  const json = (await res.json()) as { name: string };
  return json.name;
}
