/**
 * DEV-only shot: sticky import footer + AssistantFab with mobileHidden
 * (proves FAB does not overlap the footer below 768px).
 */
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AssistantFab } from "@/components/ai-intake/AssistantFab";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/index";

export function ImportFooterFabShotPage() {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <TooltipProvider>
      <div
        className="relative min-h-screen bg-background p-3"
        dir={i18n.dir()}
        data-shot="import-footer-fab"
      >
        <div className="mx-auto max-w-lg space-y-4 pb-40">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("mapping.title2")}</p>
          <div className="h-64 rounded-lg border border-dashed border-border" />
        </div>

        <div
          className={cn(
            "sticky bottom-0 z-10 space-y-0 bg-background/95 backdrop-blur-sm border-t border-border pt-3",
            "pb-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          )}
          data-shot-footer=""
        >
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-3 text-red-700 md:hidden"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("mapping.summary.remaining", { count: 1 })}
            </span>
            <span className="text-sm font-semibold">
              {t("mapping.summary.show")} ↑
            </span>
          </button>
          <div className="flex justify-between gap-3 max-md:items-stretch">
            <Button variant="outline" className="gap-1.5 max-md:h-11">
              <BackIcon className="h-4 w-4" aria-hidden="true" />
              {t("navigation.back")}
            </Button>
            <Button
              disabled
              aria-disabled
              className="gap-1.5 max-md:h-11 max-md:flex-1"
            >
              {t("navigation.next")}
              <NextIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Same contract as App.tsx on /transactions-table/import */}
        <AssistantFab mobileHidden />
      </div>
    </TooltipProvider>
  );
}
