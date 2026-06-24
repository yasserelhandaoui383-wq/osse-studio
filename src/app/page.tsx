"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Project = { id: string; title: string; aspectRatio: string; createdAt: string; _count?: { shots: number } };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error((await res.json()).error);
      setProjects(await res.json());
      setError(null);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, aspectRatio: aspect }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTitle("");
      void load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Projects</h1>
        <p className="text-neutral-400 text-sm">Each project is a short film made of ordered shots.</p>
      </section>

      <form onSubmit={createProject} className="flex flex-col sm:flex-row gap-3 bg-panel border border-edge rounded-xl p-4">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="New project title…"
          className="flex-1 bg-bg border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select value={aspect} onChange={(e) => setAspect(e.target.value)}
          className="bg-bg border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent">
          <option value="9:16">9:16 vertical</option>
          <option value="16:9">16:9 horizontal</option>
        </select>
        <button className="bg-accent text-black font-medium rounded-lg px-4 py-2 text-sm hover:opacity-90 transition">
          Create
        </button>
      </form>

      {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[0,1,2].map((i) => <div key={i} className="h-28 rounded-xl bg-panel border border-edge animate-pulse-soft" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-neutral-500 text-sm border border-dashed border-edge rounded-xl p-10 text-center">
          No projects yet. Create your first short film above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/project/${p.id}`}
              className="block bg-panel border border-edge rounded-xl p-4 hover:border-accent transition">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-neutral-500 mt-1">{p.aspectRatio} · {p._count?.shots ?? 0} shots</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
