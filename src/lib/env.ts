// Centralised runtime env access. No secrets logged.
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  COMFYUI_URL: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
  MEDIA_DIR: process.env.MEDIA_DIR || "./media",
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL || "http://127.0.0.1:8123",
  KLING_API_KEY: process.env.KLING_API_KEY || "",
  KLING_API_BASE: process.env.KLING_API_BASE || "https://api.klingai.com",
};

/** True when at least one cloud provider key is present. */
export function cloudEnabled(): boolean {
  return Boolean(env.KLING_API_KEY && env.KLING_API_KEY.trim().length > 0);
}

/** Absolute path to the media directory, created lazily by callers. */
export function mediaRoot(): string {
  const path = require("path") as typeof import("path");
  return path.isAbsolute(env.MEDIA_DIR)
    ? env.MEDIA_DIR
    : path.join(process.cwd(), env.MEDIA_DIR);
}
