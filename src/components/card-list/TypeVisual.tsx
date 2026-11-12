import type { ReactNode } from "react";
import {
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_PANEL,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils/formatting";
import type { TransactionType } from "@/types/transaction";

/**
 * Uniform compact mobile card height (title + meta).
 * Target ~64px with tight padding and size-7 chip.
 */
export const MOBILE_NEUTRAL_CARD_HEIGHT_CLASS = "h-[64px]";

/** Overrides SwipeableCardRow's default p-3/gap-3 (formatting.cn has no twMerge). */
export const MOBILE_NEUTRAL_CARD_PAD_CLASS = "!gap-1.5 !p-1.5";

/** Narrower panel under 360 so recurring frequency/date keep full text. */
const AMOUNT_PANEL_CLASS =
  "relative isolate -my-1.5 -me-1.5 self-stretch shrink-0 w-[24%] min-w-[80px] max-w-[100px] max-[359px]:w-[72px] max-[359px]:min-w-[72px] max-[359px]:max-w-[76px] text-center font-bold tabular-nums text-sm leading-none rounded-s-[10px]";

const ICON_CHIP_CLASS = "size-7 shrink-0 rounded-full grid place-items-center";

export function TypeIconChip({ type }: { type: TransactionType }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className={cn(ICON_CHIP_CLASS, TYPE_CHIP[type])}>
      <Icon className="size-3.5" aria-hidden="true" />
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
      {/* Full-panel absolute center so conversion never shifts the amount. */}
      <div className="absolute inset-0 flex items-center justify-center px-0.5">
        {children}
      </div>
      {conversion ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center text-[10px] font-normal leading-none">
          <div className="pointer-events-auto">{conversion}</div>
        </div>
      ) : null}
    </div>
  );
}
