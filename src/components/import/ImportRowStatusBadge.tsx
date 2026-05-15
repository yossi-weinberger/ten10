import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ImportRowStatus } from "@/lib/import/import-session.types";

interface ImportRowStatusBadgeProps {
  status: ImportRowStatus;
}

export function ImportRowStatusBadge({ status }: ImportRowStatusBadgeProps) {
  const { t } = useTranslation("import");

  const variants: Record<
    ImportRowStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    ready: "default",
    needs_review: "secondary",
    invalid: "destructive",
  };

  return (
    <Badge variant={variants[status]} className="shrink-0 whitespace-nowrap">
      {t(`status.${status}`)}
    </Badge>
  );
}
