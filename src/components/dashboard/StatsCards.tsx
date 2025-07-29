import React from "react";
// import { useDonationStore } from "@/lib/store"; // REMOVE IF NOT USED
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  useDateControls,
  DateRangeSelectionType,
} from "@/hooks/useDateControls";
import { useServerStats } from "@/hooks/useServerStats";
import { IncomeStatCard } from "./StatCards/IncomeStatCard";
import { ExpensesStatCard } from "./StatCards/ExpensesStatCard";
import { DonationsStatCard } from "./StatCards/DonationsStatCard";
import { OverallRequiredStatCard } from "./StatCards/OverallRequiredStatCard";

export function StatsCards({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const { user } = useAuth();
  const { platform } = usePlatform();

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
  } = useDateControls();

  const {
    serverTotalIncome,
    isLoadingServerIncome,
    serverIncomeError,
    serverChomeshAmount,
    serverTotalExpenses,
    isLoadingServerExpenses,
    serverExpensesError,
    serverTotalDonations,
    serverCalculatedDonationsData,
    isLoadingServerDonations,
    serverDonationsError,
    serverTitheBalance,
    isLoadingServerTitheBalance,
    serverTitheBalanceError,
  } = useServerStats(activeDateRangeObject, user, platform);

  const actualServerTotalDonations =
    serverCalculatedDonationsData?.total_donations_amount ??
    serverTotalDonations ??
    0;
  const actualServerTitheBalance = serverTitheBalance ?? 0;

  let donationProgress = 0; // Ensure it's initialized
  const currentDonations = actualServerTotalDonations;
  const remainingTithe =
    actualServerTitheBalance > 0 ? actualServerTitheBalance : 0;
  const totalTitheObligation = currentDonations + remainingTithe;

  if (totalTitheObligation <= 0) {
    donationProgress = 100;
  } else {
    donationProgress = Math.min(
      100,
      (currentDonations / totalTitheObligation) * 100
    );
  }

  const containerClass =
    orientation === "horizontal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "grid grid-rows-4 gap-4 flex-grow";

  const rootContainerClass =
    orientation === "vertical" ? "space-y-4 h-full flex flex-col" : "space-y-4";

  return (
    <div className={rootContainerClass}>
      <div className="flex justify-end gap-2">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[]).map(
          (rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
              className={
                dateRangeSelection !== rangeKey
                  ? "bg-transparent text-foreground hover:bg-muted/50"
                  : ""
              }
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          )
        )}
      </div>

      <div className={containerClass}>
        <OverallRequiredStatCard
          serverTitheBalance={serverTitheBalance ?? null}
          isLoadingServerTitheBalance={isLoadingServerTitheBalance}
          serverTitheBalanceError={serverTitheBalanceError}
          donationProgress={donationProgress}
        />
        <IncomeStatCard
          label={activeDateRangeObject.label ?? ""}
          serverTotalIncome={serverTotalIncome ?? null}
          isLoadingServerIncome={isLoadingServerIncome}
          serverIncomeError={serverIncomeError}
          serverChomeshAmount={serverChomeshAmount ?? null}
          platform={platform}
          user={user}
        />

        <ExpensesStatCard
          label={activeDateRangeObject.label ?? ""}
          serverTotalExpenses={serverTotalExpenses ?? null}
          isLoadingServerExpenses={isLoadingServerExpenses}
          serverExpensesError={serverExpensesError}
        />

        <DonationsStatCard
          label={activeDateRangeObject.label ?? ""}
          serverTotalDonationsData={serverCalculatedDonationsData ?? null}
          isLoadingServerDonations={isLoadingServerDonations}
          serverDonationsError={serverDonationsError}
          serverTotalIncome={serverTotalIncome ?? null}
          isLoadingServerIncome={isLoadingServerIncome}
        />
      </div>
    </div>
  );
}
