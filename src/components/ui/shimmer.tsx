import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Shimmer({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="shimmer"
      className={cn(
        "inline-block bg-[linear-gradient(90deg,hsl(var(--muted-foreground))_35%,hsl(var(--foreground))_50%,hsl(var(--muted-foreground))_65%)] bg-[length:250%_100%] bg-clip-text text-transparent animate-text-shimmer rtl:[animation-direction:reverse]",
        "motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
