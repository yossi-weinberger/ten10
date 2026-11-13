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
 * Uniform mobile panel min width (88px; 72px under 360), then grow with content
 * so 6+ digit amounts and wider conversion rows never clip. Grid stacks the
 * amount + conversion in one cell so panel width is max(amount, conversion).
 */
const AMOUNT_PANEL_CLASS =
  "relative isolate -my-1 -me-1 grid shrink-0 self-stretch w-auto min-w-[88px] max-[359px]:min-w-[72px] px-1.5 text-center font-bold tabular-nums text-[13px] leading-none rounded-s-[8px] max-[359px]:text-[11px] max-[359px]:px-1";

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
  /** Inline original-currency / live-rate row pinned to the panel bottom. */
  conversion?: ReactNode;
}) {
  return (
    <div className={cn(AMOUNT_PANEL_CLASS, TYPE_PANEL[type])}>
      <div className="col-start-1 row-start-1 place-self-center whitespace-nowrap px-0.5">
        {children}
      </div>
      {conversion ? (
        <div className="col-start-1 row-start-1 place-self-end justify-self-center whitespace-nowrap px-0.5 pb-0.5 text-[9px] font-normal leading-none">
          {conversion}
        </div>
      ) : null}
    </div>
  );
}
