"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked ? "border-emerald-500 bg-emerald-500/20" : "border-border bg-transparent hover:border-muted",
        className
      )}
    >
      {checked && <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />}
    </button>
  );
}
