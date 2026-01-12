import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Zap, ChevronDown, HelpCircle } from "lucide-react";
import type { MonitoringData } from "@/lib/data-layer/monitoring.types";
import { getTooltipDescriptions } from "../monitoringUtils";

interface EdgeFunctionStatsProps {
  data: MonitoringData;
}

export function EdgeFunctionStats({ data }: EdgeFunctionStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Edge Functions
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
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.edgeFunctions.invocations24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Invocations (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.invocations}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.edgeFunctions.errors24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Errors (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.errors}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        data.edgeFunctions.errorRate > 5
                          ? "text-yellow-600"
                          : ""
                      }`}
                    >
                      {data.edgeFunctions.errorRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Error Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.errorRate}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
