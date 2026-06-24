"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShotCard, type Shot } from "@/components/ShotCard";

type Project = { id: string; title: string; aspectRatio: string; shots: Shot[] };

export default function ProjectPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error((await res.json()).error);
      setProject(await res.json());
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  // Poll shot statuses while any are in-flight.
  useEffect(() => {
    const active = project?.shots.some((s) => s.status === "queued" || s.status === "running");
    if (!active) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [project, load]);

  async function addShot() {
    setBusy(true);
    try {
      const res = await fetch("/api/shots", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: "" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function patchShot(id: string, patch: Partial<Shot>) {
    setProject((p) => p && { ...p, shots: p.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    await fetch(`/api/shots/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function gen(kind: "image" | "video", id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shotId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function delShot(id: string) {
    await fetch(`/api/shots/${id}`, { method: "DELETE" });
    await load();
  }

  async function move(id: string, dir: -1 | 1) {
    if (!project) return;
    const ids = project.shots.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setProject({ ...project, shots: ids.map((sid) => project.shots.find((s) => s.id === sid)!) });
    await fetch("/api/shots", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: ids }),
    });
    await load();
  }

  async function startExport() {
    setExporting(true); setExportUrl(null); setExportPct(0); setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { jobId } = await res.json();
      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/export?jobId=${jobId}`);
        const job = await r.json();
        setExportPct(job.progressPercent ?? 0);
        if (job.status === "done") {
          clearInterval(pollRef.current!); setExporting(false);
          setExportUrl(`/media/${job.outputPath}`);
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!); setExporting(false);
          setError(job.errorMessage || "Export failed.");
        }
      }, 1500);
    } catch (e) { setExporting(false); setError((e as Error).message); }
  }

  if (!project) {
    return <div className="text-neutral-500 text-sm">{error ?? "Loading project…"}</div>;
  }

  const hasVideos = project.shots.some((s) => s.videoPath);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-neutral-400 text-sm">{project.aspectRatio} · {project.shots.length} shots</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addShot} disabled={busy}
            className="bg-bg border border-edge rounded-lg px-3 py-2 text-sm hover:border-accent disabled:opacity-40">
            + Add shot
          </button>
          <button onClick={startExport} disabled={exporting || !hasVideos}
            className="bg-accent text-black font-medium rounded-lg px-3 py-2 text-sm hover:opacity-90 disabled:opacity-40">
            {exporting ? `Exporting ${exportPct}%` : "Export MP4"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

      {exporting && (
        <div className="h-2 bg-bg border border-edge rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${exportPct}%` }} />
        </div>
      )}
      {exportUrl && (
        <div className="bg-panel border border-edge rounded-lg p-3 text-sm flex items-center justify-between flex-wrap gap-2">
          <span className="text-green-400">Export complete.</span>
          <a href={exportUrl} download className="text-accent hover:underline">Download MP4</a>
        </div>
      )}

      {project.shots.length === 0 ? (
        <div className="text-neutral-500 text-sm border border-dashed border-edge rounded-xl p-10 text-center">
          No shots yet. Add your first shot to start generating.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {project.shots.map((shot, i) => (
            <ShotCard
              key={shot.id} shot={shot} index={i} busy={busy}
              onChange={(patch) => patchShot(shot.id, patch)}
              onGenImage={() => gen("image", shot.id)}
              onGenVideo={() => gen("video", shot.id)}
              onDelete={() => delShot(shot.id)}
              onMove={(dir) => move(shot.id, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
