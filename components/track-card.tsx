import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ChevronRight, Layers, Flame, Clock } from "lucide-react";
import { cn, computeStreak } from "@/lib/utils";

const DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-400",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
};

export function TrackCard({
  id,
  name,
  category,
  color,
  firstPhaseTitle,
  totalTasks,
  doneTasks,
  completedDates,
}: {
  id: string;
  name: string;
  category: string;
  color: string;
  firstPhaseTitle?: string;
  totalTasks: number;
  doneTasks: number;
  completedDates: Date[];
}) {
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const { streakDays, doneToday } = computeStreak(completedDates);

  return (
    <Link href={`/tracks/${id}`}>
      <Card className="group flex h-full flex-col justify-between p-5 transition-colors hover:border-zinc-600">
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", DOT[color] ?? DOT.emerald)} />
              <div>
                <h3 className="font-semibold leading-tight">{name}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                  Gauntlet · {category}
                </p>
              </div>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-zinc-300">
              {pct}%
            </div>
          </div>

          {firstPhaseTitle && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-black/30 px-3 py-2 text-xs text-zinc-300">
              <Layers className="h-3.5 w-3.5 text-muted" />
              <span className="truncate">{firstPhaseTitle}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <div>
            <p className="font-mono uppercase tracking-wide text-muted">Tasks</p>
            <p className="mt-1 text-zinc-200">
              {doneTasks}/{totalTasks}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 font-mono uppercase tracking-wide text-muted">
              <Flame className="h-3 w-3" /> Streak
            </p>
            <p className="mt-1 text-zinc-200">{streakDays}d</p>
          </div>
          <div>
            <p className="flex items-center gap-1 font-mono uppercase tracking-wide text-muted">
              <Clock className="h-3 w-3" /> Today
            </p>
            <p className="mt-1 text-zinc-200">{doneToday}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
