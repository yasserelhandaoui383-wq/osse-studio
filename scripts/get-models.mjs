#!/usr/bin/env node
/**
 * Download the free, open-weight models Osse Studio uses into a ComfyUI
 * checkpoints folder. All models are free for local use.
 *
 * Usage:
 *   node scripts/get-models.mjs "C:/ComfyUI/ComfyUI/models/checkpoints"
 *   node scripts/get-models.mjs /path/to/ComfyUI/models/checkpoints
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const MODELS = [
  {
    name: "sd_xl_turbo_1.0_fp16.safetensors",
    url: "https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors",
    note: "SDXL Turbo (images) — free, ~6.9GB",
  },
  {
    name: "ltx-video-2b-v0.9.1.safetensors",
    url: "https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.1.safetensors",
    note: "LTX-Video distilled (image-to-video) — free, ~9GB",
  },
];

const dest = process.argv[2];
if (!dest) {
  console.error("Usage: node scripts/get-models.mjs <ComfyUI/models/checkpoints dir>");
  process.exit(1);
}
mkdirSync(dest, { recursive: true });

for (const m of MODELS) {
  const out = path.join(dest, m.name);
  if (existsSync(out)) { console.log(`✓ already present: ${m.name}`); continue; }
  console.log(`↓ downloading ${m.name}  (${m.note})`);
  const res = await fetch(m.url);
  if (!res.ok || !res.body) {
    console.error(`  FAILED (${res.status}). Download manually from:\n  ${m.url}`);
    process.exitCode = 1;
    continue;
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(out));
  console.log(`✓ saved ${out}`);
}
console.log("\nDone. Restart ComfyUI so it picks up the new checkpoints.");
