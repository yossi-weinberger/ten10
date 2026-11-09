import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Confetti } from "./Confetti";

/** Chomesh on an income: a golden pill like the form's, with confetti when it turns on. */
export function ChomeshToggle({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const { t } = useTranslation("navigation");
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled || !onChange}
      className={cn(
        "relative inline-flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        checked ? "bg-golden-static border-transparent text-yellow-950" : "bg-background hover:bg-muted",
      )}
      onClick={() => {
        if (!checked) setBurst((value) => value + 1);
        onChange?.(!checked);
      }}
    >
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-full border",
          checked ? "border-yellow-950/40 bg-yellow-950/10" : "border-muted-foreground/40",
        )}
        aria-hidden
      >
        {checked ? <Check className="size-3" /> : null}
      </span>
      {t("aiIntake.chomesh")}
      <Confetti burst={burst} />
    </button>
  );
}
