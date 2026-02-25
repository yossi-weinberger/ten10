import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HealthScoreResult } from "@/lib/insights-engine";
import { getScoreLabel, getScoreColor, getScoreRingColor } from "@/lib/insights-engine";

interface FinancialHealthScoreProps {
  score: HealthScoreResult;
  isLoading: boolean;
  periodLabel: string;
}

function ScoreRing({ value, className }: { value: number; className?: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      viewBox="0 0 128 128"
      className={`h-32 w-32 -rotate-90 ${className ?? ""}`}
    >
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth="10"
      />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        className={getScoreRingColor(value)}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
      />
    </svg>
  );
}

export function FinancialHealthScore({
  score,
  isLoading,
  periodLabel,
}: FinancialHealthScoreProps) {
  const { t } = useTranslation("analytics");

  const label = getScoreLabel(score.score);
  const colorClass = getScoreColor(score.score);

  const factors = [
    { key: "factorSavings", value: score.factors.savings, max: 40 },
    { key: "factorTithe", value: score.factors.tithe, max: 30 },
    { key: "factorTrend", value: score.factors.trend, max: 30 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("healthScore.title")}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
                aria-label={t("healthScore.tooltipTitle")}
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs z-50">
              <p className="font-semibold mb-1">
                {t("healthScore.tooltipTitle")}
              </p>
              <p className="text-sm">{t("healthScore.tooltipBody")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <ScoreRing value={score.score} />
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className={`text-3xl font-bold ${colorClass}`}>
                  {score.score}
                </span>
                <span className={`text-sm font-medium ${colorClass}`}>
                  {t(`healthScore.${label}`)}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2">
              {factors.map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-muted-foreground">
                    {t(`healthScore.${f.key}`)}
                  </span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{
                        width: `${(f.value / f.max) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-end text-muted-foreground tabular-nums">
                    {f.value}/{f.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
