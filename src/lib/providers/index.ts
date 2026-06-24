import { cloudEnabled } from "../env";
import { klingProvider } from "./kling";

export type CameraMotion = "static" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out" | "dolly";

export interface VideoRequest {
  imageAbsPath: string;
  prompt: string;
  cameraMotion: CameraMotion;
  durationSeconds: number;
}

/** A cloud video provider. Local generation lives in src/lib/comfyui.ts. */
export interface VideoProvider {
  name: string;
  /** Returns a Buffer of the produced mp4. Throws AppError with a clear message on failure. */
  imageToVideo(req: VideoRequest): Promise<Buffer>;
}

/** Returns the active cloud provider, or null when running in local-only mode. */
export function activeCloudProvider(): VideoProvider | null {
  if (!cloudEnabled()) return null;
  return klingProvider;
}
