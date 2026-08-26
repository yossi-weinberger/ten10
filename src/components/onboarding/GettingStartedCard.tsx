import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GettingStartedCardProps {
  hasFirstTransaction: boolean;
  analyticsOpened: boolean;
  onDismiss: () => void;
}

export function GettingStartedCard({
  hasFirstTransaction,
  analyticsOpened,
  onDismiss,
}: GettingStartedCardProps) {
  const { t } = useTranslation("onboarding");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("checklist.title")}</CardTitle>
        <CardDescription>{t("checklist.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {hasFirstTransaction ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{t("checklist.firstTransaction")}</span>
          </li>
          <li className="flex items-center gap-2">
            {analyticsOpened ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            {analyticsOpened ? (
              <span>{t("checklist.openAnalytics")}</span>
            ) : (
              <Link to="/analytics" className="underline underline-offset-2">
                {t("checklist.openAnalytics")}
              </Link>
            )}
          </li>
        </ul>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          {t("checklist.dismiss")}
        </Button>
      </CardContent>
    </Card>
  );
}
