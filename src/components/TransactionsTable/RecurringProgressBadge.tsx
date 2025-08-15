import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Infinity } from "lucide-react";
import { cn } from "@/lib/utils/formatting";
import { typeBadgeColors } from "@/types/transactionLabels";
import { TransactionType } from "@/types/transaction";

interface RecurringProgressBadgeProps {
  status: "active" | "paused" | "completed" | "cancelled";
  type: TransactionType;
  executionCount: number;
  totalOccurrences?: number | null;
  occurrenceNumber?: number | null; // From the transaction row if available
  frequency: string;
  dayOfMonth?: number | null;
}

export const RecurringProgressBadge: React.FC<RecurringProgressBadgeProps> = ({
  status,
  type,
  executionCount,
  totalOccurrences,
  occurrenceNumber,
  frequency,
  dayOfMonth,
}) => {
  const { t } = useTranslation("data-tables");

  const currentExecution = occurrenceNumber ?? executionCount;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "cursor-default",
              status === "active"
                ? typeBadgeColors[type]
                : "border-gray-400 text-gray-600"
            )}
          >
            <div className="flex items-center gap-1">
              {totalOccurrences ? (
                <span>
                  {currentExecution}/{totalOccurrences}
                </span>
              ) : (
                <div className="flex items-center gap-1" dir="ltr">
                  <span>{currentExecution}</span>
                  <span>/</span>
                  <Infinity className="h-3 w-3" />
                </div>
              )}
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t("recurring.status")}: {t(`recurring.statuses.${status}`, status)}
          </p>
          <p>
            {t("recurring.frequency")}:{" "}
            {t(`recurring.frequencies.${frequency}`, frequency)}
          </p>
          {frequency === "monthly" && dayOfMonth && (
            <p>
              {t("recurring.dayOfMonth")}: {dayOfMonth}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
