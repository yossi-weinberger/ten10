import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** The assistant's avatar. Still on purpose: the thread's "thinking" line is the one busy animation. */
export function AssistantMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "relative inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
      size === "md" ? "size-9" : "size-7",
    )}>
      <Sparkles className={size === "md" ? "size-5" : "size-3.5"} aria-hidden />
      <span className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-accent" aria-hidden />
    </span>
  );
}
