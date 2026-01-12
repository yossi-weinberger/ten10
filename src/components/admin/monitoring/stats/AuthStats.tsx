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
import { Shield, ChevronDown, Users, HelpCircle } from "lucide-react";
import type { MonitoringData } from "@/lib/data-layer/monitoring.types";
import { formatTimestamp } from "@/lib/data-layer/monitoring.service";
import { getTooltipDescriptions } from "../monitoringUtils";

interface AuthStatsProps {
  data: MonitoringData;
}

export function AuthStats({ data }: AuthStatsProps) {
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
                <Shield className="h-5 w-5" />
                Authentication Events
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
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help border border-dashed border-muted-foreground/30">
                    <p className="text-2xl font-bold text-muted-foreground">
                      N/A
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Failed Logins (24h)
                      <HelpCircle className="h-3 w-3 text-yellow-500" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.failedLogins}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">{data.auth.signups24h}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Signups (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.signups}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.auth.passwordResets24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Password Resets (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.passwordResets}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Recent Events */}
            {data.auth.recentEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recent Events
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.auth.recentEvents.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-2 rounded border bg-card"
                    >
                      <span className="text-sm font-medium">
                        {event.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
