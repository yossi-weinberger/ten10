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

/** Narrower panel under 360 so recurring frequency/date stay fully visible. */
const AMOUNT_PANEL_CLASS =
  "relative isolate -my-1 -me-1 self-stretch shrink-0 w-[22%] min-w-[72px] max-w-[92px] max-[359px]:w-[64px] max-[359px]:min-w-[64px] max-[359px]:max-w-[68px] text-center font-bold tabular-nums text-[13px] leading-none rounded-s-[8px]";

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
      <div className="absolute inset-0 flex items-center justify-center px-0.5">
        {children}
      </div>
      {conversion ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center text-[9px] font-normal leading-none">
          <div className="pointer-events-auto">{conversion}</div>
        </div>
      ) : null}
    </div>
  );
}
