"""
Optional FastAPI orchestrator for advanced ComfyUI workflows.

The Next.js app does NOT depend on this service — it talks to ComfyUI directly.
This exists as an extension point for heavier multi-step pipelines (batching,
custom node graphs, model warmup) that are easier to express in Python.

Run:  npm run orchestrator   (or: uvicorn main:app --host 127.0.0.1 --port 8123)
"""
import os
import httpx
from fastapi import FastAPI, HTTPException

COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188")

app = FastAPI(title="Osse Studio Orchestrator", version="0.1.0")


@app.get("/health")
async def health():
    return {"ok": True, "comfyui_url": COMFYUI_URL}


@app.get("/comfyui/health")
async def comfyui_health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{COMFYUI_URL}/system_stats")
            res.raise_for_status()
            return {"online": True, "stats": res.json()}
    except Exception as exc:  # noqa: BLE001 — surface a clear message
        raise HTTPException(status_code=503, detail=f"ComfyUI unreachable: {exc}") from exc
