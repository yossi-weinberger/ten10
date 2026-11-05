import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BASE_TYPE_ICON, BASE_TYPE_TINT, type BaseTransactionType } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { normalizeToBaseType } from "@/lib/data-layer/transactionForm.service";
import { cn } from "@/lib/utils";

type DraftType = TextTransactionDraft["type"];

const TYPES: readonly DraftType[] = ["expense", "recognized-expense", "income", "exempt-income", "donation", "non_tithe_donation"];

function baseTypeOf(type: DraftType): BaseTransactionType {
  const base = normalizeToBaseType(type);
  return base === "income" || base === "donation" ? base : "expense";
}

/** The card's type. With `onChange` it is a button that opens the list of types. */
export function TypeTag({
  type,
  disabled = false,
  onChange,
}: {
  type: DraftType;
  disabled?: boolean;
  onChange?: (type: DraftType) => void;
}) {
  const { t, i18n } = useTranslation("navigation");
  const base = baseTypeOf(type);
  const Icon = BASE_TYPE_ICON[base];
  const label = t(`aiIntake.types.${type}`);
  const chip = cn(
    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
    BASE_TYPE_TINT[base],
  );
  if (!onChange) {
    return (
      <span className={chip}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <DropdownMenu dir={i18n.dir()}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(chip, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50")}
          aria-label={t("aiIntake.changeType", { type: label })}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
          <ChevronDown className="size-3" aria-hidden />
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
