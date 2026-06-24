"use client";
import { StatusBadge } from "./StatusBadge";

export type Shot = {
  id: string; order: number; prompt: string; imagePath: string | null;
  videoPath: string | null; status: string; cameraMotion: string;
  durationSeconds: number; errorMessage?: string | null;
};

const MOTIONS = ["static", "pan_left", "pan_right", "zoom_in", "zoom_out", "dolly"];

export function ShotCard(props: {
  shot: Shot;
  index: number;
  busy: boolean;
  onChange: (patch: Partial<Shot>) => void;
  onGenImage: () => void;
  onGenVideo: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { shot, index, busy } = props;
  const working = shot.status === "queued" || shot.status === "running";
  return (
    <div className="bg-panel border border-edge rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="font-mono">#{index + 1}</span>
          <StatusBadge status={shot.status} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => props.onMove(-1)} className="px-1.5 text-neutral-500 hover:text-white" title="Move up">↑</button>
          <button onClick={() => props.onMove(1)} className="px-1.5 text-neutral-500 hover:text-white" title="Move down">↓</button>
          <button onClick={props.onDelete} className="px-1.5 text-neutral-500 hover:text-red-400" title="Delete">✕</button>
        </div>
      </div>

      <div className="aspect-[9/16] bg-bg border border-edge rounded-lg overflow-hidden flex items-center justify-center">
        {shot.videoPath ? (
          <video src={`/media/${shot.videoPath}`} controls className="w-full h-full object-cover" />
        ) : shot.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${shot.imagePath}`} alt="shot" className="w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-600 text-xs">No media yet</span>
        )}
      </div>

      <textarea
        value={shot.prompt}
        onChange={(e) => props.onChange({ prompt: e.target.value })}
        placeholder="Describe this shot…"
        rows={2}
        className="w-full bg-bg border border-edge rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent resize-none"
      />

      <div className="flex gap-2">
        <select value={shot.cameraMotion} onChange={(e) => props.onChange({ cameraMotion: e.target.value })}
          className="flex-1 bg-bg border border-edge rounded-lg px-2 py-1 text-xs outline-none focus:border-accent">
          {MOTIONS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
        </select>
        <input type="number" min={0.5} step={0.5} value={shot.durationSeconds}
          onChange={(e) => props.onChange({ durationSeconds: parseFloat(e.target.value) || 1 })}
          className="w-16 bg-bg border border-edge rounded-lg px-2 py-1 text-xs outline-none focus:border-accent" />
      </div>

      {shot.status === "failed" && shot.errorMessage && (
        <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1">{shot.errorMessage}</div>
      )}

      <div className="flex gap-2">
        <button disabled={busy || working} onClick={props.onGenImage}
          className="flex-1 bg-bg border border-edge rounded-lg px-2 py-1.5 text-xs hover:border-accent disabled:opacity-40">
          {shot.imagePath ? "Regenerate image" : "Generate image"}
        </button>
        <button disabled={busy || working || !shot.imagePath} onClick={props.onGenVideo}
          className="flex-1 bg-accent/90 text-black font-medium rounded-lg px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-40">
          Animate
        </button>
      </div>
    </div>
  );
}
