import { cn } from "@/lib/utils";

const CTA_EASING = "cubic-bezier(0.25,0.1,0.25,1)";

interface TextRollProps {
  children: React.ReactNode;
  className?: string;
  lineClassName?: string;
}

export function TextRoll({
  children,
  className,
  lineClassName = "h-[20px] leading-[20px]",
}: TextRollProps) {
  return (
    <span className={cn("relative block h-[20px] overflow-hidden", className)}>
      <span
        className="flex flex-col transition-transform duration-500 group-hover:-translate-y-1/2"
        style={{ transitionTimingFunction: CTA_EASING }}
      >
        <span className={lineClassName}>{children}</span>
        <span className={lineClassName}>{children}</span>
      </span>
    </span>
  );
}

