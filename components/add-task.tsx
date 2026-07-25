"use client";

import { useRef, useTransition } from "react";
import { Plus } from "lucide-react";
import { addTask } from "@/lib/actions";

export function AddTask({ phaseId }: { phaseId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = ref.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(async () => {
      await addTask(phaseId, value);
    });
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
      <Plus className="h-4 w-4 text-muted" />
      <input
        ref={ref}
        placeholder="Add a task..."
        disabled={isPending}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
