import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RecurringWarningProps {
  compact?: boolean;
}

export function RecurringWarning({ compact = false }: RecurringWarningProps) {
  const { t } = useTranslation("import");

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
        <RefreshCw className="h-3 w-3" />
        {t("issues.possible_recurring")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
      <RefreshCw className="h-4 w-4" />
      {t("issues.possible_recurring")}
    </span>
  );
}
