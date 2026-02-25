import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import type { InsightItem, Driver } from "@/lib/insights-engine";
import { logger } from "@/lib/logger";

interface AnalyticsExportData {
  periodStart: string;
  periodEnd: string;
  income: number | null;
  expenses: number | null;
  donations: number | null;
  titheBalance: number | null;
  healthScore: number;
  monthlyData: MonthlyDataPoint[];
  insights: InsightItem[];
  drivers: Driver[];
}

interface AnalyticsExportButtonProps {
  data: AnalyticsExportData;
  t: (key: string, params?: Record<string, string>) => string;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsvContent(
  data: AnalyticsExportData,
  t: (key: string, params?: Record<string, string>) => string
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  // Summary section
  lines.push("=== Summary ===");
  lines.push(
    ["period_start", "period_end", "generated_at"].map(escapeCsvCell).join(",")
  );
  lines.push(
    [data.periodStart, data.periodEnd, now].map(escapeCsvCell).join(",")
  );
  lines.push("");

  lines.push(
    ["metric", "value"].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["income", data.income ?? 0].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["expenses", data.expenses ?? 0].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["donations", data.donations ?? 0].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["tithe_balance", data.titheBalance ?? 0].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["health_score", data.healthScore].map(escapeCsvCell).join(",")
  );
  lines.push(
    [
      "net_savings",
      (data.income ?? 0) - (data.expenses ?? 0),
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push("");

  // Monthly summary
  lines.push("=== Monthly Summary ===");
  lines.push(
    ["month", "income", "expenses", "donations", "net"]
      .map(escapeCsvCell)
      .join(",")
  );
  for (const point of data.monthlyData) {
    lines.push(
      [
        point.month_label,
        point.income,
        point.expenses,
        point.donations,
        point.income - point.expenses,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  lines.push("");

  // Smart insights
  lines.push("=== Smart Insights ===");
  lines.push(["insight", "impact"].map(escapeCsvCell).join(","));
  for (const insight of data.insights) {
    lines.push(
      [
        t(insight.labelKey, insight.labelParams ?? {}),
        insight.impact,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  lines.push("");

  // Top drivers
  lines.push("=== Top Drivers ===");
  lines.push(["rank", "driver", "value", "impact"].map(escapeCsvCell).join(","));
  data.drivers.forEach((driver, idx) => {
    lines.push(
      [
        idx + 1,
        t(driver.labelKey, driver.labelParams ?? {}),
        driver.numericValue,
        driver.impact,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  });

  return lines.join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const bom = "\uFEFF"; // UTF-8 BOM for Hebrew support in Excel
  const blob = new Blob([bom + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AnalyticsExportButton({
  data,
  t,
}: AnalyticsExportButtonProps) {
  const { t: tAnalytics } = useTranslation("analytics");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const csv = generateCsvContent(data, t);
      const filename = `Ten10-analytics-${data.periodStart}-${data.periodEnd}.csv`;
      downloadBlob(csv, filename, "text/csv");
    } catch (err) {
      logger.error("AnalyticsExport: CSV export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {tAnalytics("export.button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCsv}>
          {tAnalytics("export.csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
