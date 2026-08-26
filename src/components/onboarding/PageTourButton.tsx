import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboardingUi } from "./OnboardingContext";
import type { PageTourId } from "@/lib/onboarding/types";

export function PageTourButton({ tour }: { tour: PageTourId }) {
  const { t } = useTranslation("onboarding");
  const { startPageTour, isTourRunning } = useOnboardingUi();

  if (isTourRunning) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => startPageTour(tour)}
          aria-label={t("pageTour.ariaLabel")}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("pageTour.tooltip")}</TooltipContent>
    </Tooltip>
  );
}
