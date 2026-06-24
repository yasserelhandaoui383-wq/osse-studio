"use client";
import { useEffect, useState } from "react";

type Status = {
  comfyui: { online: boolean; url: string };
  ffmpeg: { available: boolean; path: string };
  gpu: { name: string; vramFreeMb?: number; vramTotalMb?: number } | null;
  mode: string;
};

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus(await res.json()); setError(null);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

      <section className="bg-panel border border-edge rounded-xl p-4 space-y-3">
        <h2 className="font-medium">System status</h2>
        {!status ? (
          <div className="text-neutral-500 text-sm animate-pulse-soft">Checking…</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">ComfyUI ({status.comfyui.url})</span>
              <span className="flex items-center gap-2"><Dot ok={status.comfyui.online} />{status.comfyui.online ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">FFmpeg ({status.ffmpeg.path})</span>
              <span className="flex items-center gap-2"><Dot ok={status.ffmpeg.available} />{status.ffmpeg.available ? "Available" : "Missing"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">GPU</span>
              <span className="text-neutral-300">
                {status.gpu ? `${status.gpu.name}${status.gpu.vramTotalMb ? ` · ${status.gpu.vramTotalMb} MB` : ""}` : "Unknown (ComfyUI offline)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Mode</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${status.mode === "local" ? "bg-neutral-800 text-neutral-300" : "bg-accent/20 text-accent"}`}>
                {status.mode === "local" ? "Local mode" : "Cloud enabled"}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="bg-panel border border-edge rounded-xl p-4 space-y-2">
        <h2 className="font-medium">Cloud fallback (optional)</h2>
        <p className="text-sm text-neutral-400">
          Cloud providers are configured via environment variables, never required. Set
          <code className="mx-1 px-1 bg-bg border border-edge rounded">KLING_API_KEY</code>
          in your <code className="px-1 bg-bg border border-edge rounded">.env</code> file and restart to enable
          automatic fallback when local generation is unavailable. With no key set, the app runs 100% locally.
        </p>
      </section>
    </div>
  );
}
