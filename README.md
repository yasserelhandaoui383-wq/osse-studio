# Osse Studio

A **100% free, open-source, local-first** AI short-film studio: prompt -> image -> animated shot -> timeline -> exported vertical MP4. Runs entirely on a single **8GB VRAM GPU** using **ComfyUI** + **FFmpeg**. No subscriptions, no required API keys, no cloud lock-in.

> Everything here is free and open source. An optional cloud provider (Kling) exists behind a feature flag, but it is **never required** -- the app is fully usable offline with zero keys.

---

## 100% free & open-source stack

| Layer | Tool | License |
|---|---|---|
| App framework | Next.js 14 (App Router, TS) | MIT |
| Styling | Tailwind CSS | MIT |
| Database | SQLite via Prisma | Apache-2.0 |
| Image model | SDXL Turbo | open weights (free) |
| Video model | LTX-Video (distilled 0.9.x) | open weights (free) |
| Local inference | ComfyUI | GPL-3.0 |
| Video assembly | FFmpeg | LGPL/GPL |
| This project | Osse Studio | **MIT** (see `LICENSE`) |

---

## Quick start

```bash
# Windows: double-click start.bat   |   macOS/Linux: ./start.sh
# ...or manually:
npm install
npm run setup      # creates .env, SQLite db, /media
npm run dev        # -> http://localhost:3000
```

The app is fully usable for project/shot CRUD and timeline editing **even with ComfyUI offline**. Generation buttons return a clear error instead of failing silently.

---

## Enabling generation (free, local)

1. **Install ComfyUI** (free): https://github.com/comfyanonymous/ComfyUI
2. **Download the free models** into ComfyUI's `models/checkpoints/`:
   ```bash
   npm run get-models -- "C:/ComfyUI/ComfyUI/models/checkpoints"
   ```
   Pulls `sd_xl_turbo_1.0_fp16.safetensors` and `ltx-video-2b-v0.9.1.safetensors` from Hugging Face.
3. **For video**, install the **ComfyUI-LTXVideo** custom nodes via ComfyUI Manager. Image generation works without them.
4. **Start ComfyUI:** `python main.py --listen 127.0.0.1 --port 8188`
5. In Osse Studio -> **Settings**, ComfyUI shows Online. Generate -- free and unlimited.

---

## Why these model choices (8GB VRAM)

8GB cannot reliably run HunyuanVideo / Wan2.1 / full CogVideoX / Mochi. Defaults: SDXL Turbo (6 steps, cfg 1.5) for images; LTX-Video distilled at 480x832 vertical for image-to-video.

---

## Optional cloud fallback

Off by default. Add `KLING_API_KEY="..."` to `.env` and restart. With no key, the app stays in **free local mode**. The Kling adapter uses placeholder endpoints -- verify against the current Kling API before relying on cloud mode.

---

## Scripts

| Command | Does |
|---|---|
| `npm run setup` | create `.env`, SQLite db, `/media` |
| `npm run check-env` | verify Node / FFmpeg / GPU / ComfyUI |
| `npm run get-models -- <dir>` | download the free models into ComfyUI |
| `npm run dev` | run the app at localhost:3000 |
| `npm run orchestrator` | (optional) start the FastAPI helper |

---

## License

MIT -- see [`LICENSE`](./LICENSE). Model weights and bundled tools keep their own upstream licenses.
