"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/input";
import { toggleTask, updateTaskNotes } from "@/lib/actions";
import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskItem({
  id,
  content,
  completed,
  notes,
}: {
  id: string;
  content: string;
  completed: boolean;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-transparent px-3 py-3 hover:border-border">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={completed}
          onChange={(v) => startTransition(() => toggleTask(id, v))}
          className="mt-0.5"
        />
        <button
          className={cn(
            "flex-1 text-left text-sm leading-relaxed",
            completed ? "text-muted line-through" : "text-zinc-200"
          )}
          onClick={() => setOpen((o) => !o)}
        >
          {content}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide",
            notes ? "text-emerald-400" : "text-muted hover:text-zinc-300"
          )}
        >
          <NotebookPen className="h-3 w-3" />
          {notes ? "Note" : "Add note"}
        </button>
      </div>

      {open && (
        <div className="ml-8 mt-2">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => startTransition(() => updateTaskNotes(id, localNotes))}
            placeholder="What did you actually do / learn here?"
            rows={3}
            className="text-sm"
          />
          {isPending && <p className="mt-1 font-mono text-[10px] text-muted">Saving…</p>}
        </div>
      )}
    </div>
  );
}
