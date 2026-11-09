import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BASE_TYPE_ICON,
  BASE_TYPE_TEXT,
  BASE_TYPE_TINT,
  baseTypeOf,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { cn } from "@/lib/utils";

type DraftType = TextTransactionDraft["type"];

const TYPES: readonly DraftType[] = ["expense", "recognized-expense", "income", "exempt-income", "donation", "non_tithe_donation"];

/**
 * The card's type. With `onChange` it is a button that opens the list of types.
 * "pill": tinted chip. "text": the first line of a transaction card, colored icon, no chip. "compact": a small chip in a list row.
 */
export function TypeTag({
  type,
  disabled = false,
  variant = "pill",
  onChange,
}: {
  type: DraftType;
  disabled?: boolean;
  variant?: "pill" | "text" | "compact";
  onChange?: (type: DraftType) => void;
}) {
  const { t, i18n } = useTranslation("navigation");
  const base = baseTypeOf(type);
  const Icon = BASE_TYPE_ICON[base];
  const label = t(`aiIntake.types.${type}`);
  const chip = variant === "text"
    ? "inline-flex items-center gap-1 whitespace-nowrap rounded-sm text-xs font-semibold text-foreground underline-offset-4"
    : cn(
      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-xs font-medium",
      variant === "compact" ? "h-6 px-2" : "h-7 px-2.5",
      BASE_TYPE_TINT[base],
    );
  const icon = variant === "compact" ? null : (
    <Icon className={cn("size-3.5", variant === "text" && BASE_TYPE_TEXT[base])} aria-hidden />
  );
  if (!onChange) {
    return (
      <span className={chip}>
        {icon}
        {label}
      </span>
    );
  }
  return (
    <DropdownMenu dir={i18n.dir()}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(chip, variant === "text" && "hover:underline", "touch-target relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50")}
          aria-label={t("aiIntake.changeType", { type: label })}
        >
          {icon}
          {label}
          <ChevronDown className={cn("size-3", variant === "text" && "text-muted-foreground")} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={type}
          onValueChange={(value) => {
            if (value !== type) onChange(value as DraftType);
          }}
        >
          {TYPES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t(`aiIntake.types.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
