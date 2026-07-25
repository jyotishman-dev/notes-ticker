"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createTrack } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const COLOR_DOTS: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-400",
  pink: "bg-pink-500",
  violet: "bg-violet-500"
};

export function AddTrackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [color, setColor] = useState("emerald");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) return;

    startTransition(async () => {
      try {
        const newTrackId = await createTrack(name, category, color);
        setIsOpen(false);
        setName("");
        setCategory("General");
        setColor("emerald");
        if (newTrackId) {
          router.push(`/tracks/${newTrackId}`);
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow-lg hover:shadow-emerald-500/10 transition-all"
      >
        <Plus className="h-4 w-4" />
        New Gauntlet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-zinc-100">Create New Gauntlet</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-zinc-200 transition-colors"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                  Gauntlet Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backend Masterclass, DSA 100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 placeholder:text-muted/50 focus:border-zinc-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backend, Algorithms, System Design"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 placeholder:text-muted/50 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                  Color Theme
                </label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {Object.keys(COLOR_DOTS).map((col) => {
                    const active = color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColor(col)}
                        disabled={isPending}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] capitalize transition-all",
                          active
                            ? "bg-panel border-zinc-500 text-zinc-100 font-medium"
                            : "bg-base border-border text-muted hover:text-zinc-300 hover:border-zinc-700"
                        )}
                      >
                        <span className={cn("h-3 w-3 rounded-full mb-1", COLOR_DOTS[col])} />
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 border border-border rounded-lg text-muted hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !name.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Create Gauntlet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
