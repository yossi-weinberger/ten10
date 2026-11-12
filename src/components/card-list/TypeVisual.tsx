import type { ReactNode } from "react";
import {
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_PANEL,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils/formatting";
import type { TransactionType } from "@/types/transaction";

/** Uniform mobile card height: title + meta + one badge/wrap row, vertically centered. */
export const MOBILE_NEUTRAL_CARD_HEIGHT_CLASS = "h-[96px]";

const AMOUNT_PANEL_CLASS =
  "relative -my-3 -me-3 self-stretch shrink-0 w-[26%] min-w-[84px] max-w-[112px] flex items-center justify-center px-1.5 py-2 text-center font-bold tabular-nums rounded-s-[10px]";

const ICON_CHIP_CLASS = "size-10 shrink-0 rounded-full grid place-items-center";

export function TypeIconChip({ type }: { type: TransactionType }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className={cn(ICON_CHIP_CLASS, TYPE_CHIP[type])}>
      <Icon className="size-5" aria-hidden="true" />
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
        <div className="absolute inset-x-0 bottom-1.5 flex flex-col items-center gap-0.5 text-xs font-normal leading-tight">
          {conversion}
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
