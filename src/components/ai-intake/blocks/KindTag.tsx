import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The pill at the start of a card's first row: what kind of card this is. Same shape as the TypeTag. */
export function KindTag({ icon: Icon, tint, children }: { icon: LucideIcon; tint: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium", tint)}>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}
