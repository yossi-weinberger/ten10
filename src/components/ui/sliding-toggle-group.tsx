import { useEffect, useRef, useState, type AriaAttributes, type ReactNode, type Ref } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SlidingToggleOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

interface SlidingToggleGroupProps<T extends string> {
  value: T;
  options: readonly SlidingToggleOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "default" | "compact";
  disabled?: boolean;
  id?: string;
  ref?: Ref<HTMLDivElement>;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
}

export function SlidingToggleGroup<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  size = "default",
  disabled,
  id,
  ref,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SlidingToggleGroupProps<T>) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sliderLeft, setSliderLeft] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const labelsKey = options
    .map((option) =>
      typeof option.label === "string" ? option.label : option.value,
    )
    .join("|");

  useEffect(() => {
    const current = itemRefs.current[activeIndex];
    if (!current) return;

    const update = () => {
      setSliderLeft(current.offsetLeft ?? 0);
      setSliderWidth(current.clientWidth ?? 0);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeIndex, labelsKey]);

  return (
    <ToggleGroup
      type="single"
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      ref={ref}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
      className={cn(
        "relative grid rounded-md border",
        size === "compact" ? "h-8 gap-0 p-0.5" : "gap-1 p-1",
        options.length === 3 ? "grid-cols-3" : "grid-cols-2",
        className,
      )}
    >
      <span
        className={cn(
          "absolute z-0 rounded-md shadow-sm transition-[left,width] duration-500 ease-in-out",
          size === "compact"
            ? "inset-y-0.5 bg-primary"
            : "inset-y-1 bg-accent",
        )}
        style={{ left: sliderLeft, width: sliderWidth }}
      />
      {options.map((option, index) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className={cn(
            "relative z-10 flex-1 justify-center hover:bg-transparent data-[state=on]:bg-transparent",
            size === "compact"
              ? "h-7 px-2.5 text-xs data-[state=on]:text-primary-foreground"
              : "data-[state=on]:text-accent-foreground",
          )}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
