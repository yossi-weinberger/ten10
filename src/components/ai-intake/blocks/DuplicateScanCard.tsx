import { CircleAlert, Copy, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { BASE_TYPE_SURFACE, baseTypeOf } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { DuplicatePair, SavedTransactionRow } from "@/lib/ai/duplicate-scan";
import type { CurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import type { DuplicateScanState } from "../assistant-reply-view";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";
import { StatusNote } from "./StatusNote";

export function DuplicateScanCard({
  scan,
  confirmDeleteId,
  actionFailed,
  interactive,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  onDismissPair,
}: {
  scan: DuplicateScanState;
  confirmDeleteId: string | null;
  actionFailed: boolean;
  interactive: boolean;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDismissPair: (pair: DuplicatePair) => void;
}) {
  const { t, i18n } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const language = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";

  switch (scan.status) {
    case "pending":
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t("aiIntake.duplicateScanPending")}
        </p>
      );
    case "failed":
      return <StatusNote status="duplicateScanFailed" />;
    case "ready":
      if (scan.count === 0) return <StatusNote status="duplicateScanEmpty" />;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {t(scan.count === 1 ? "aiIntake.duplicateScanCountOne" : "aiIntake.duplicateScanCount", { count: scan.count })}
          </p>
          {scan.pairs.map((pair) => (
            <Card key={`${pair.left.id}-${pair.right.id}`} className="grid gap-2 p-2.5">
              <div className="flex">
                <KindTag icon={Copy} tint={KIND_TINT.warning}>{t("aiIntake.duplicateTag")}</KindTag>
              </div>
              <ul className="grid gap-1">
                {[pair.left, pair.right].map((side) => (
                  <ScanSide
                    key={side.id}
                    side={side}
                    language={language}
                    dateLabel={formatDisplayDate(side.date).primary}
                    interactive={interactive}
                    confirming={confirmDeleteId === side.id}
                    onAskDelete={onAskDelete}
                    onConfirmDelete={onConfirmDelete}
                    onCancelDelete={onCancelDelete}
                  />
                ))}
              </ul>
              {interactive ? (
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => onDismissPair(pair)}>
                    {t("aiIntake.duplicateNot")}
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
          {actionFailed ? <StatusNote status="duplicateActionFailed" /> : null}
        </div>
      );
    default: {
      const unreachable: never = scan;
      return unreachable;
    }
  }
}

/** One saved transaction of the pair, tinted by its type. Delete asks once, in the row. */
function ScanSide({
  side,
  language,
  dateLabel,
  interactive,
  confirming,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  side: SavedTransactionRow;
  language: "en" | "he";
  dateLabel: string;
  interactive: boolean;
  confirming: boolean;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const { t } = useTranslation("navigation");
  return (
    <li className={cn("grid gap-1.5 rounded-md px-2 py-1.5", BASE_TYPE_SURFACE[baseTypeOf(side.type)])}>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 break-words">
          <span className="font-medium">{side.description || dateLabel}</span>
          {side.description ? <span className="text-xs text-muted-foreground"> · <bdi>{dateLabel}</bdi></span> : null}
        </span>
        <span className="shrink-0 tabular-nums">
          <bdi>{formatCurrency(side.amount, side.currency as CurrencyCode, language)}</bdi>
        </span>
        {interactive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="touch-target relative size-7 shrink-0"
            aria-label={t("aiIntake.duplicateDelete")}
            onClick={() => onAskDelete(side.id)}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
      {interactive && confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-background/70 px-2 py-1.5 text-xs text-destructive">
          <span className="flex items-center gap-1.5">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {t("aiIntake.duplicateConfirmBody")}
          </span>
          <span className="ms-auto flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={onCancelDelete}>
              {t("aiIntake.duplicateCancel")}
            </Button>
            <Button type="button" variant="destructive" size="sm" className="h-7" onClick={() => onConfirmDelete(side.id)}>
              {t("aiIntake.duplicateConfirm")}
            </Button>
          </span>
        </div>
      ) : null}
    </li>
  );
}
