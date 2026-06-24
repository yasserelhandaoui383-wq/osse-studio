import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { env, mediaRoot } from "./env";
import { AppError } from "./errors";

ffmpeg.setFfmpegPath(env.FFMPEG_PATH);

const DIMS: Record<string, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
};

export interface ExportClip {
  videoAbsPath: string;
  durationSeconds: number;
}

/** Confirm the ffmpeg binary is reachable; used by /api/status. */
export function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => resolve(!err));
  });
}

/**
 * Concatenate ordered clips into a single MP4 at the project's aspect ratio,
 * optionally mixing in one audio track. Reports progress 0..100 via onProgress.
 */
export async function exportTimeline(opts: {
  clips: ExportClip[];
  aspectRatio: string;
  audioAbsPath?: string | null;
  outRelPath: string;
  onProgress: (p: number) => Promise<void>;
}): Promise<string> {
  const { clips, aspectRatio, audioAbsPath, outRelPath, onProgress } = opts;
  if (clips.length === 0) throw new AppError("Timeline is empty \u2014 add at least one shot with a video.", 400);

  for (const c of clips) {
    if (!fs.existsSync(c.videoAbsPath)) {
      throw new AppError(`Missing clip on disk: ${path.basename(c.videoAbsPath)}. Re-generate that shot.`, 400);
    }
  }

  const dim = DIMS[aspectRatio] ?? DIMS["9:16"];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "osse-"));
  const normalized: string[] = [];

  // Normalize each clip to identical codec/size/fps so concat is safe.
  for (let i = 0; i < clips.length; i++) {
    const outPath = path.join(tmp, `clip_${i}.mp4`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(clips[i].videoAbsPath)
        .videoFilters([
          `scale=${dim.w}:${dim.h}:force_original_aspect_ratio=decrease`,
          `pad=${dim.w}:${dim.h}:(ow-iw)/2:(oh-ih)/2:black`,
          "fps=30",
        ])
        .outputOptions(["-c:v libx264", "-pix_fmt yuv420p", "-an", `-t ${clips[i].durationSeconds}`])
        .on("end", () => resolve())
        .on("error", (e) => reject(new AppError(`FFmpeg failed normalizing clip ${i + 1}: ${e.message}`, 500)))
        .save(outPath);
    });
    normalized.push(outPath);
    await onProgress(((i + 1) / clips.length) * 70);
  }

  // Build concat list file.
  const listFile = path.join(tmp, "concat.txt");
  fs.writeFileSync(listFile, normalized.map((p) => `file '${p}'`).join("\n"));

  const absOut = path.join(mediaRoot(), outRelPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg().input(listFile).inputOptions(["-f concat", "-safe 0"]);
    if (audioAbsPath && fs.existsSync(audioAbsPath)) {
      cmd = cmd.input(audioAbsPath);
      cmd = cmd.outputOptions(["-map 0:v:0", "-map 1:a:0", "-shortest", "-c:v libx264", "-c:a aac", "-pix_fmt yuv420p"]);
    } else {
      cmd = cmd.outputOptions(["-c:v libx264", "-pix_fmt yuv420p"]);
    }
    cmd
      .on("progress", (pr) => { void onProgress(70 + (pr.percent ?? 0) * 0.3); })
      .on("end", () => resolve())
      .on("error", (e) => reject(new AppError(`FFmpeg export failed: ${e.message}`, 500)))
      .save(absOut);
  });

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
  return outRelPath;
}
