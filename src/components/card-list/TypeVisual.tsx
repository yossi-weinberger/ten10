import type { ReactNode } from "react";
import {
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_PANEL,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils/formatting";
import type { TransactionType } from "@/types/transaction";

/**
 * Uniform compact mobile card height (title + single inline meta line).
 * Target ~76–84px; 80px clears measured content with p-2 + size-8 chip.
 */
export const MOBILE_NEUTRAL_CARD_HEIGHT_CLASS = "h-[80px]";

/** Overrides SwipeableCardRow's default p-3/gap-3 (formatting.cn has no twMerge). */
export const MOBILE_NEUTRAL_CARD_PAD_CLASS = "!gap-2 !p-2";

const AMOUNT_PANEL_CLASS =
  "relative -my-2 -me-2 self-stretch shrink-0 w-[26%] min-w-[76px] max-w-[104px] flex items-center justify-center px-1 py-1 text-center font-bold tabular-nums text-[15px] leading-tight rounded-s-[10px]";

const ICON_CHIP_CLASS = "size-8 shrink-0 rounded-full grid place-items-center";

export function TypeIconChip({ type }: { type: TransactionType }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className={cn(ICON_CHIP_CLASS, TYPE_CHIP[type])}>
      <Icon className="size-4" aria-hidden="true" />
    </div>
  );
}

export function AmountPanel({
  type,
  children,
  conversion,
}: {
  type: TransactionType;
  children: ReactNode;
  /** Offset under the centered amount (original currency / live-rate). */
  conversion?: ReactNode;
}) {
  return (
    <div className={cn(AMOUNT_PANEL_CLASS, "isolate", TYPE_PANEL[type])}>
      {conversion ? (
        <div className="absolute inset-x-0 bottom-0.5 flex flex-col items-center gap-0 text-[10px] font-normal leading-tight">
          {conversion}
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
