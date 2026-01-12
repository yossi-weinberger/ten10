import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, ChevronDown, HelpCircle } from "lucide-react";
import type { EmailStats } from "@/lib/data-layer/monitoring.types";
import { getTooltipDescriptions } from "../monitoringUtils";

interface EmailStatsDisplayProps {
  emailStats: EmailStats;
}

export function EmailStatsDisplay({ emailStats }: EmailStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  if (!emailStats.available) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-5 w-5" />
            Email Statistics
            <Badge variant="outline" className="ml-2">
              Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emailStats.error || "AWS credentials not configured"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("monitoring.addAwsKeys")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Statistics (SES)
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">{emailStats.sends24h}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Sends (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailSends}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold text-green-600">
                      {emailStats.deliveries24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Delivered (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailDeliveries}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.bounces24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {emailStats.bounces24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Bounces (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailBounces}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Rates & Complaints */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.deliveryRate >= 95
                          ? "text-green-600"
                          : emailStats.deliveryRate >= 90
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {emailStats.deliveryRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Delivery Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailDeliveryRate}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.bounceRate > 5
                          ? "text-red-600"
                          : emailStats.bounceRate > 2
                          ? "text-yellow-600"
                          : ""
                      }`}
                    >
                      {emailStats.bounceRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Bounce Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailBounceRate}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`p-3 rounded-lg text-center cursor-help ${
                      emailStats.complaints24h > 0
                        ? "bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800"
                        : "bg-muted/50"
                    }`}
                  >
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.complaints24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {emailStats.complaints24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Complaints (24h)
                      <HelpCircle className="h-3 w-3 text-yellow-500" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailComplaints}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Legend */}
            <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
              <p className="font-medium">{t("monitoring.legend.emailTitle")}</p>
              <div className="flex flex-wrap gap-4">
                <span>
                  <span className="text-green-600">■</span> Delivery Rate ≥95% ={" "}
                  {t("monitoring.legend.excellent")}
                </span>
                <span>
                  <span className="text-yellow-600">■</span> Bounce Rate 2-5% ={" "}
                  {t("monitoring.legend.check")}
                </span>
                <span>
                  <span className="text-red-600">■</span> Bounce Rate &gt;5% ={" "}
                  {t("monitoring.legend.problematic")}
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
