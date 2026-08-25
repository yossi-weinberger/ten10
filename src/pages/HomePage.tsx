import { useTranslation } from "react-i18next";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { GettingStartedCard } from "@/components/onboarding/GettingStartedCard";
import { PageTourButton } from "@/components/onboarding/PageTourButton";
import { useOnboardingUi } from "@/components/onboarding/OnboardingContext";

export function HomePage() {
  const { t } = useTranslation("dashboard");
  const {
    showGettingStarted,
    hasFirstTransaction,
    analyticsOpened,
    dismissChecklist,
  } = useOnboardingUi();

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2 min-w-0" data-onboarding="home-intro">
          <h2 className="text-2xl font-bold text-foreground">
            {t("homePage.title")}
          </h2>
          <p className="text-muted-foreground">{t("homePage.subtitle")}</p>
        </div>
        <PageTourButton tour="home" />
      </div>

      {showGettingStarted && (
        <GettingStartedCard
          hasFirstTransaction={hasFirstTransaction}
          analyticsOpened={analyticsOpened}
          onDismiss={dismissChecklist}
        />
      )}

      <StatsCards />
      <MonthlyChart />
    </div>
  );
}
