import { NextResponse } from "next/server";
import { handle } from "@/lib/errors";
import { comfyOnline } from "@/lib/comfyui";
import { ffmpegAvailable } from "@/lib/ffmpeg";
import { cloudEnabled, env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Health snapshot for the Settings page: ComfyUI, FFmpeg, GPU, cloud mode.
export async function GET() {
  return handle(async () => {
    const [comfy, ffmpeg] = await Promise.all([comfyOnline(), ffmpegAvailable()]);

    let gpu: { name: string; vramFreeMb?: number; vramTotalMb?: number } | null = null;
    if (comfy) {
      try {
        const res = await fetch(`${env.COMFYUI_URL}/system_stats`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const data = (await res.json()) as any;
          const dev = data?.devices?.[0];
          if (dev) {
            gpu = {
              name: dev.name ?? "GPU",
              vramFreeMb: dev.vram_free ? Math.round(dev.vram_free / 1024 / 1024) : undefined,
              vramTotalMb: dev.vram_total ? Math.round(dev.vram_total / 1024 / 1024) : undefined,
            };
          }
        }
      } catch { /* GPU info is best-effort */ }
    }

    return NextResponse.json({
      comfyui: { online: comfy, url: env.COMFYUI_URL },
      ffmpeg: { available: ffmpeg, path: env.FFMPEG_PATH },
      gpu,
      mode: cloudEnabled() ? "cloud-enabled" : "local",
    });
  });
}
