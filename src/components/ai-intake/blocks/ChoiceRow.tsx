import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export function ChoiceRow<T extends string>({
  prompt,
  options,
  onChoose,
  disabled,
}: {
  prompt: string;
  options: readonly ChoiceOption<T>[];
  onChoose: (value: T) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{prompt}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChoose(option.value)}
            >
              {Icon ? <Icon data-icon="inline-start" aria-hidden /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
