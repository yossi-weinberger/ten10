import React from "react";
import { useDonationStore, selectCalculatedBalance } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  useDateControls,
  DateRangeSelectionType,
  DateRangeObject,
} from "@/hooks/useDateControls";
import { useClientStats } from "@/hooks/useClientStats";
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
  const transactions = useDonationStore((state) => state.transactions);
  const { user } = useAuth();
  const { platform } = usePlatform();

  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
  } = useDateControls();

  const {
    clientTotalIncome,
    clientTotalExpenses,
    clientTotalDonations,
    clientChomeshAmountInRange,
  } = useClientStats(transactions, activeDateRangeObject);

  const {
    serverTotalIncome,
    isLoadingServerIncome,
    serverIncomeError,
    serverChomeshAmount,
    serverTotalExpenses,
    isLoadingServerExpenses,
    serverExpensesError,
    serverTotalDonations,
    isLoadingServerDonations,
    serverDonationsError,
    serverTitheBalance,
    isLoadingServerTitheBalance,
    serverTitheBalanceError,
  } = useServerStats(activeDateRangeObject, user, platform);

  const clientCalculatedOverallRequired = useDonationStore(
    selectCalculatedBalance
  );

  const donationProgress =
    (clientCalculatedOverallRequired ?? 0) > 0
      ? Math.min(
          100,
          ((clientTotalDonations ?? 0) /
            (clientCalculatedOverallRequired ?? 1)) *
            100
        )
      : (clientCalculatedOverallRequired ?? 0) <= 0
      ? 100
      : 0;

  const containerClass =
    orientation === "horizontal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "grid gap-4";

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {(Object.keys(dateRangeLabels) as DateRangeSelectionType[]).map(
          (rangeKey) => (
            <Button
              key={rangeKey}
              variant={dateRangeSelection === rangeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(rangeKey)}
            >
              {dateRangeLabels[rangeKey]}
            </Button>
          )
        )}
      </div>

      <div className={containerClass}>
        <IncomeStatCard
          label={activeDateRangeObject.label}
          clientTotalIncome={clientTotalIncome ?? null}
          serverTotalIncome={serverTotalIncome ?? null}
          isLoadingServerIncome={isLoadingServerIncome}
          serverIncomeError={serverIncomeError}
          clientChomeshAmountInRange={clientChomeshAmountInRange ?? 0}
          serverChomeshAmount={serverChomeshAmount ?? null}
          platform={platform}
          user={user}
        />

        <ExpensesStatCard
          label={activeDateRangeObject.label}
          clientTotalExpenses={clientTotalExpenses ?? null}
          serverTotalExpenses={serverTotalExpenses ?? null}
          isLoadingServerExpenses={isLoadingServerExpenses}
          serverExpensesError={serverExpensesError}
        />

        <DonationsStatCard
          label={activeDateRangeObject.label}
          clientTotalDonations={clientTotalDonations ?? null}
          serverTotalDonations={serverTotalDonations ?? null}
          isLoadingServerDonations={isLoadingServerDonations}
          serverDonationsError={serverDonationsError}
          clientTotalIncome={clientTotalIncome ?? null}
          serverTotalIncome={serverTotalIncome ?? null}
          isLoadingServerIncome={isLoadingServerIncome}
        />

        <OverallRequiredStatCard
          clientCalculatedOverallRequired={
            clientCalculatedOverallRequired ?? null
          }
          serverTitheBalance={serverTitheBalance ?? null}
          isLoadingServerTitheBalance={isLoadingServerTitheBalance}
          serverTitheBalanceError={serverTitheBalanceError}
          donationProgress={donationProgress}
        />
      </div>
    </div>
  );
}
