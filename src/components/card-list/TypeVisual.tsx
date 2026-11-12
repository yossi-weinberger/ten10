import type { ReactNode } from "react";
import {
  TYPE_CHIP,
  TYPE_ICON,
  TYPE_PANEL,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils/formatting";
import type { TransactionType } from "@/types/transaction";

const AMOUNT_PANEL_CLASS =
  "-my-3 -me-3 self-stretch shrink-0 w-[26%] min-w-[84px] max-w-[112px] flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center font-bold tabular-nums rounded-s-[10px]";

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
}: {
  type: TransactionType;
  children: ReactNode;
}) {
  return (
    <div className={cn(AMOUNT_PANEL_CLASS, TYPE_PANEL[type])}>{children}</div>
  );
}
