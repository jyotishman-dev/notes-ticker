"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ChevronRight, Layers, Trash2, FileText, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteTrack } from "@/lib/actions";

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
  notesCount,
}: {
  id: string;
  name: string;
  category: string;
  color: string;
  firstPhaseTitle?: string;
  totalTasks: number;
  doneTasks: number;
  notesCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${name}"? This will permanently delete all its phases, tasks, and notes.`)) {
      startTransition(async () => {
        await deleteTrack(id);
        router.refresh();
      });
    }
  };

  return (
    <Link href={isPending ? "#" : `/tracks/${id}`} className={cn(isPending && "pointer-events-none")}>
      <Card className={cn(
        "group flex h-full flex-col justify-between p-5 transition-all duration-200 border-border hover:border-zinc-500 bg-panel/30",
        isPending && "opacity-40"
      )}>
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 shadow-sm", DOT[color] ?? DOT.emerald)} />
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-zinc-100 group-hover:text-white transition-colors truncate">{name}</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted truncate">
                  {category}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#0d0d10] font-mono text-[11px] font-medium text-zinc-300">
                {pct}%
              </div>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="p-1.5 border border-border/80 rounded-lg bg-[#0d0d10] hover:bg-red-950/20 hover:border-red-900/40 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
                title="Delete Gauntlet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {firstPhaseTitle && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-[#0a0a0c]/60 px-3 py-2 text-xs text-zinc-300">
              <Layers className="h-3.5 w-3.5 text-muted" />
              <span className="truncate">{firstPhaseTitle}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between text-xs border-t border-border/40 pt-4">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-muted shrink-0" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted leading-none">Tasks</p>
                <p className="mt-1 text-sm font-semibold text-zinc-200 leading-none">
                  {doneTasks}/{totalTasks}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted leading-none">Notes</p>
                <p className="mt-1 text-sm font-semibold text-zinc-200 leading-none">
                  {notesCount}
                </p>
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 shrink-0" />
        </div>
      </Card>
    </Link>
  );
}
