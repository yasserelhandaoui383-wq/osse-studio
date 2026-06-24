export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle:    { label: "Idle",    cls: "bg-neutral-800 text-neutral-400" },
    queued:  { label: "Queued",  cls: "bg-amber-950 text-amber-300" },
    running: { label: "Running", cls: "bg-blue-950 text-blue-300 animate-pulse-soft" },
    done:    { label: "Done",    cls: "bg-green-950 text-green-300" },
    failed:  { label: "Failed",  cls: "bg-red-950 text-red-300" },
  };
  const s = map[status] ?? map.idle;
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
