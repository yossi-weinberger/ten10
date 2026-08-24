import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { GettingStartedCard } from "@/components/onboarding/GettingStartedCard";
import { useOnboardingUi } from "@/components/onboarding/OnboardingContext";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { t } = useTranslation("dashboard");
  const { t: tOnboarding } = useTranslation("onboarding");
  const {
    showHomeCta,
    showGettingStarted,
    hasFirstTransaction,
    analyticsOpened,
    dismissChecklist,
  } = useOnboardingUi();

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("homePage.title")}
        </h2>
        <p className="text-muted-foreground">{t("homePage.subtitle")}</p>
      </div>

      {showGettingStarted && (
        <GettingStartedCard
          hasFirstTransaction={hasFirstTransaction}
          analyticsOpened={analyticsOpened}
          onDismiss={dismissChecklist}
        />
      )}

      {showHomeCta && (
        <Button asChild className="w-fit" data-onboarding="add-transaction-cta">
          <Link to="/add-transaction">
            <PlusCircle className="h-4 w-4" />
            {tOnboarding("cta.addTransaction")}
          </Link>
        </Button>
      )}

      <div data-onboarding="home-summary">
        <StatsCards />
      </div>
      <MonthlyChart />
    </div>
  );
}
