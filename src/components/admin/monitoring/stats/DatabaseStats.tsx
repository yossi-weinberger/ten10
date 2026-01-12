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
import { Database, ChevronDown, Server, HelpCircle } from "lucide-react";
import type { MonitoringData } from "@/lib/data-layer/monitoring.types";
import { formatDuration } from "@/lib/data-layer/monitoring.service";
import { MetricWithTooltip } from "../AdminMonitoringComponents";
import { getTooltipDescriptions } from "../monitoringUtils";

interface DatabaseStatsProps {
  data: MonitoringData;
}

export function DatabaseStats({ data }: DatabaseStatsProps) {
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
                <Database className="h-5 w-5" />
                Database Statistics
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
            {/* Active Connections */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <MetricWithTooltip
                label="Active Connections"
                tooltip={tooltipDescriptions.activeConnections}
              />
              <Badge variant="secondary">
                {data.database.activeConnections}
              </Badge>
            </div>

            {/* Slow Queries */}
            {data.database.slowQueries.length > 0 && (
              <div className="space-y-2">
                <MetricWithTooltip
                  label={`Slow Queries (${data.database.slowQueries.length})`}
                  tooltip={tooltipDescriptions.slowQueries}
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data.database.slowQueries.map((query, index) => (
                    <div
                      key={index}
                      className="p-2 rounded border bg-card text-card-foreground"
                    >
                      <code className="text-xs block truncate">
                        {query.query}
                      </code>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Calls: {query.calls}</span>
                        <span>Mean: {formatDuration(query.meanTime)}</span>
                        <span>Total: {formatDuration(query.totalTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Stats */}
            {data.database.tableStats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Table Statistics
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start p-2">Table</th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Rows
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.rowCount}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Seq Scans
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.seqScans}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Index Scans
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.indexScans}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Dead Tuples
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.deadTuples}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.database.tableStats
                        .slice(0, 10)
                        .map((table, index) => {
                          // Calculate health indicators
                          const isLargeTable = table.rowCount > 1000;
                          const seqScanRatio =
                            table.seqScans + table.indexScans > 0
                              ? table.seqScans /
                                (table.seqScans + table.indexScans)
                              : 0;
                          const hasIndexProblem =
                            isLargeTable &&
                            seqScanRatio > 0.8 &&
                            table.seqScans > 100;
                          const hasDeadTuplesProblem = table.deadTuples > 1000;
                          const hasRowWarning = table.rowCount > 100000;

                          return (
                            <tr
                              key={index}
                              className={`border-b last:border-0 ${
                                hasIndexProblem
                                  ? "bg-red-50 dark:bg-red-950/30"
                                  : hasDeadTuplesProblem
                                  ? "bg-yellow-50 dark:bg-yellow-950/30"
                                  : ""
                              }`}
                            >
                              <td className="p-2 font-mono text-xs">
                                {table.tableName}
                                {hasIndexProblem && (
                                  <span
                                    className="ml-1 text-red-500"
                                    title="Missing index - high seq scan ratio"
                                  >
                                    ⚠️
                                  </span>
                                )}
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    hasRowWarning
                                      ? "text-blue-600 font-medium"
                                      : ""
                                  }
                                >
                                  {table.rowCount.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    hasIndexProblem
                                      ? "text-red-600 font-medium"
                                      : ""
                                  }
                                >
                                  {table.seqScans.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    table.indexScans > table.seqScans
                                      ? "text-green-600"
                                      : ""
                                  }
                                >
                                  {table.indexScans.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    table.deadTuples > 5000
                                      ? "text-red-600 font-medium"
                                      : table.deadTuples > 1000
                                      ? "text-yellow-600"
                                      : ""
                                  }
                                >
                                  {table.deadTuples.toLocaleString()}
                                  {table.deadTuples > 5000 && " 🔴"}
                                  {table.deadTuples > 1000 &&
                                    table.deadTuples <= 5000 &&
                                    " 🟡"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="mt-3 p-2 bg-muted/30 rounded text-xs space-y-1">
                  <p className="font-medium">{t("monitoring.legend.title")}</p>
                  <div className="flex flex-wrap gap-4">
                    <span>
                      <span className="text-red-600">■</span>{" "}
                      {t("monitoring.legend.highSeqScans")}
                    </span>
                    <span>
                      <span className="text-green-600">■</span> Index Scans &gt;{" "}
                      {t("monitoring.legend.lowSeqScans")}
                    </span>
                    <span>
                      <span className="text-yellow-600">■</span> Dead Tuples{" "}
                      {t("monitoring.legend.highDeadTuples")}
                    </span>
                    <span>
                      <span className="text-blue-600">■</span> Rows &gt; 100K ={" "}
                      {t("monitoring.legend.largeTable")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
