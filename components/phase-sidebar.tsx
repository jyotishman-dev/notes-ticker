import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type PhaseSummary = {
  id: string;
  index: number;
  title: string;
  done: number;
  total: number;
};

export function PhaseSidebar({
  trackId,
  phases,
  activePhaseId,
}: {
  trackId: string;
  phases: PhaseSummary[];
  activePhaseId: string;
}) {
  const totalDone = phases.reduce((s, p) => s + p.done, 0);
  const totalTasks = phases.reduce((s, p) => s + p.total, 0);

  return (
    <aside className="w-64 shrink-0 border-r border-border">
      <div className="flex items-center justify-between px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-muted">
        <span>Phases</span>
        <span>
          {phases.filter((p) => p.done === p.total && p.total > 0).length}/{phases.length}
        </span>
      </div>
      <nav className="flex flex-col">
        {phases.map((p) => {
          const complete = p.total > 0 && p.done === p.total;
          const active = p.id === activePhaseId;
          return (
            <Link
              key={p.id}
              href={`/tracks/${trackId}?phase=${p.id}`}
              className={cn(
                "flex items-center justify-between border-l-2 px-4 py-2.5 text-sm",
                active
                  ? "border-emerald-500 bg-panel text-zinc-100"
                  : "border-transparent text-muted hover:bg-panel/60 hover:text-zinc-300"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                )}
                <span className="truncate">
                  <span className="mr-1 font-mono text-muted">P{p.index}</span>
                  {p.title}
                </span>
              </span>
              <span className="ml-2 shrink-0 font-mono text-xs text-muted">
                {p.done}/{p.total}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 font-mono text-[11px] text-muted">
        Total: {totalDone}/{totalTasks}
      </div>
    </aside>
  );
}
