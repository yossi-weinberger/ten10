import type { ReactNode } from "react";
import {
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_PANEL,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils/formatting";
import type { TransactionType } from "@/types/transaction";

/**
 * Uniform compact mobile card height (title + one meta line).
 * Target ~52–56px; !min-h overrides SwipeableCardRow's min-h-[64px].
 */
export const MOBILE_NEUTRAL_CARD_HEIGHT_CLASS = "h-[54px] !min-h-[54px]";

/** Overrides SwipeableCardRow's default p-3/gap-3 (formatting.cn has no twMerge). */
export const MOBILE_NEUTRAL_CARD_PAD_CLASS = "!gap-1 !p-1";

/**
 * Content-driven width so long amounts (e.g. 1,234,567.50 ₪) never clip.
 * Text column flex-shrinks; panel grows with its amount. Under 360px the amount
 * font steps down so ordinary 4–7 digit totals stay compact without truncating.
 */
const AMOUNT_PANEL_CLASS =
  "relative isolate -my-1 -me-1 flex shrink-0 items-center justify-center self-stretch w-auto min-w-fit px-1.5 text-center font-bold tabular-nums text-[13px] leading-none whitespace-nowrap rounded-s-[8px] max-[359px]:text-[11px] max-[359px]:px-1";

const ICON_CHIP_CLASS = "size-6 shrink-0 rounded-full grid place-items-center";

export function TypeIconChip({ type }: { type: TransactionType }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className={cn(ICON_CHIP_CLASS, TYPE_CHIP[type])}>
      <Icon className="size-3" aria-hidden="true" />
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
    <div className={cn(AMOUNT_PANEL_CLASS, TYPE_PANEL[type])}>
      <div className="px-0.5">{children}</div>
      {conversion ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center overflow-hidden px-0.5 text-[9px] font-normal leading-none">
          <div className="pointer-events-auto inline-flex max-w-full min-w-0 items-center justify-center">
            {conversion}
          </div>
        </div>
      ) : null}
    </div>
  );
}
