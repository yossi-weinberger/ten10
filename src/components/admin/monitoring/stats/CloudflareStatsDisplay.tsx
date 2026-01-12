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
import { Cloud, ChevronDown, HelpCircle } from "lucide-react";
import type { CloudflareStats } from "@/lib/data-layer/monitoring.types";
import { getTooltipDescriptions } from "../monitoringUtils";

interface CloudflareStatsDisplayProps {
  stats?: CloudflareStats;
}

export function CloudflareStatsDisplay({ stats }: CloudflareStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  if (!stats) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-5 w-5" />
            Cloudflare Workers
            <Badge variant="outline" className="ml-2">
              Requires Deployment
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!stats.available) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-5 w-5" />
            Cloudflare Workers
            <Badge variant="outline" className="ml-2">
              Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{stats.error}</p>
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
                <Cloud className="h-5 w-5 text-orange-500" />
                Cloudflare Workers
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
                      {stats.requests24h.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Requests (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.cfRequests}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        stats.errors24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {stats.errors24h.toLocaleString()}
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
                  <p>{tooltipDescriptions.cfErrors}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        stats.errorRate > 5
                          ? "text-red-600"
                          : stats.errorRate > 2
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {stats.errorRate}%
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
                  <p>{tooltipDescriptions.cfErrorRate}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
