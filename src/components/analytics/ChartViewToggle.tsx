import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BarChart2, PieChart as PieChartIcon } from "lucide-react";

interface ChartViewToggleProps {
  value: "bar" | "pie";
  onChange: (view: "bar" | "pie") => void;
}

export function ChartViewToggle({ value, onChange }: ChartViewToggleProps) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex border border-border rounded-md overflow-hidden shrink-0">
      <Button
        size="icon"
        variant={value === "bar" ? "secondary" : "ghost"}
        className="h-8 w-8 rounded-none"
        onClick={() => onChange("bar")}
        aria-label={t("analytics.chartTypeBar")}
      >
        <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        variant={value === "pie" ? "secondary" : "ghost"}
        className="h-8 w-8 rounded-none border-s border-border"
        onClick={() => onChange("pie")}
        aria-label={t("analytics.chartTypePie")}
      >
        <PieChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
