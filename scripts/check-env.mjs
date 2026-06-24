#!/usr/bin/env node
/* Phase 0: sanity-check the machine. Fails loudly with clear instructions. */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const env = { ...process.env };
const COMFY = env.COMFYUI_URL || "http://127.0.0.1:8188";
const FFMPEG = env.FFMPEG_PATH || "ffmpeg";

let ok = true;
const line = (label, good, hint) => {
  console.log(`${good ? "✅" : "❌"}  ${label}`);
  if (!good && hint) console.log(`     → ${hint}`);
  if (!good) ok = false;
};

// Node
line(`Node ${process.version}`, Number(process.versions.node.split(".")[0]) >= 18,
  "Install Node 18+ from https://nodejs.org");

// .env
line(".env present", existsSync(".env"), "Run `npm run setup` to create it from .env.example");

// ffmpeg
let ffmpegOk = false;
try { execSync(`${FFMPEG} -version`, { stdio: "ignore" }); ffmpegOk = true; } catch {}
line(`FFmpeg (${FFMPEG})`, ffmpegOk, "Install ffmpeg and ensure it is on PATH, or set FFMPEG_PATH in .env");

// GPU (nvidia-smi best effort)
let gpu = "unknown";
try { gpu = execSync("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader").toString().trim(); } catch {}
console.log(gpu !== "unknown" ? `🖥️  GPU: ${gpu}` : "⚠️  GPU: nvidia-smi not found (CPU-only or non-NVIDIA — local generation may be slow/unavailable)");

// ComfyUI reachability
let comfy = false;
try {
  const res = await fetch(`${COMFY}/system_stats`, { signal: AbortSignal.timeout(2500) });
  comfy = res.ok;
} catch {}
console.log(comfy
  ? `✅  ComfyUI reachable at ${COMFY}`
  : `⚠️  ComfyUI not reachable at ${COMFY} (start it for generation; the app still runs in offline mode)`);

console.log("");
console.log(ok ? "Environment looks good." : "Some required checks failed — see hints above.");
process.exit(ok ? 0 : 1);
