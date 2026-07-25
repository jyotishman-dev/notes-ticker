import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "ghost" | "outline";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "default" && "bg-white text-black hover:bg-zinc-200",
        variant === "outline" && "border border-border text-zinc-200 hover:bg-panel",
        variant === "ghost" && "text-zinc-400 hover:bg-panel hover:text-zinc-100",
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
