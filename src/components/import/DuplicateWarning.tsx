import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DuplicateWarningProps {
  compact?: boolean;
}

export function DuplicateWarning({ compact = false }: DuplicateWarningProps) {
  const { t } = useTranslation("import");

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        {t("issues.possible_duplicate")}
      </span>
    );
  }

  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        {t("issues.possible_duplicate")}
      </AlertDescription>
    </Alert>
  );
}
