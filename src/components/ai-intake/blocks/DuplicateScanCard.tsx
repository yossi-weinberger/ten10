import { CircleAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { DuplicatePair, SavedTransactionRow } from "@/lib/ai/duplicate-scan";
import type { CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import type { DuplicateScanState } from "../assistant-reply-view";
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
            <Card key={`${pair.left.id}-${pair.right.id}`}>
              <CardHeader className="gap-2">
                <ItemGroup>
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
                </ItemGroup>
              </CardHeader>
              {interactive ? (
                <CardFooter>
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onDismissPair(pair)}>
                    {t("aiIntake.duplicateNot")}
                  </Button>
                </CardFooter>
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
    <Item variant="muted" size="sm">
      <ItemContent>
        <ItemTitle>{dateLabel}</ItemTitle>
        <ItemDescription>
          {formatCurrency(side.amount, side.currency as CurrencyCode, language)}
          {side.description ? ` · ${side.description}` : ""}
        </ItemDescription>
      </ItemContent>
      {interactive ? (
        <ItemActions>
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => onAskDelete(side.id)}>
            <Trash2 aria-hidden />
            {t("aiIntake.duplicateDelete")}
          </Button>
        </ItemActions>
      ) : null}
      {interactive && confirming ? (
        <ItemFooter>
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span className="flex items-center gap-2">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                {t("aiIntake.duplicateConfirmBody")}
              </span>
              <span className="flex flex-wrap gap-2">
                <Button type="button" variant="destructive" size="sm" className="w-fit" onClick={() => onConfirmDelete(side.id)}>
                  {t("aiIntake.duplicateConfirm")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onCancelDelete}>
                  {t("aiIntake.duplicateCancel")}
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        </ItemFooter>
      ) : null}
    </Item>
  );
}
