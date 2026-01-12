import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Rocket, ChevronDown, GitCommit } from "lucide-react";
import type { VercelStats } from "@/lib/data-layer/monitoring.types";
import { formatTimestamp } from "@/lib/data-layer/monitoring.service";

interface VercelStatsDisplayProps {
  stats?: VercelStats;
}

export function VercelStatsDisplay({ stats }: VercelStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { i18n } = useTranslation("admin");

  if (!stats) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5" />
            Vercel Deployments
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
            <Rocket className="h-5 w-5" />
            Vercel Deployments
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

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "text-green-600";
      case "building":
        return "text-yellow-600";
      case "error":
      case "failed":
        return "text-red-600";
      case "canceled":
        return "text-gray-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStateBadge = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "building":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "error":
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Vercel Deployments
                {stats.lastDeployment && (
                  <Badge className={getStateBadge(stats.lastDeployment.state)}>
                    {stats.lastDeployment.state}
                  </Badge>
                )}
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
            {stats.deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent deployments
              </p>
            ) : (
              <div className="space-y-2">
                {stats.deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <GitCommit
                        className={`h-4 w-4 ${getStateColor(deployment.state)}`}
                      />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {deployment.meta?.githubCommitMessage ||
                            deployment.id}
                        </p>
                        {deployment.meta?.githubCommitRef && (
                          <p className="text-xs text-muted-foreground">
                            {deployment.meta.githubCommitRef}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStateBadge(deployment.state)}>
                        {deployment.state}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(deployment.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
