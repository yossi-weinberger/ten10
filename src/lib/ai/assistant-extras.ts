import { fetchServerTitheBalance } from "@/lib/data-layer/analytics.service";
import { fetchActiveRecurring } from "@/lib/data-layer/insights.service";
import type { RecurringTransaction } from "@/types/transaction";

export type BalanceAnswer = { total: number; maaser: number; chomesh: number };

/** The same balance the dashboard shows. Null when it could not be read. */
export async function loadTitheBalance(userId: string | null): Promise<BalanceAnswer | null> {
  const row = await fetchServerTitheBalance(userId);
  return row ? { total: row.total_balance, maaser: row.maaser_balance, chomesh: row.chomesh_balance } : null;
}

export type StandingOrderRow = Pick<RecurringTransaction, "id" | "amount" | "currency" | "type" | "frequency"> & {
  description: string;
  dayOfMonth: number | null;
};

/** Active standing orders, for the chat card. */
export async function loadStandingOrders(): Promise<StandingOrderRow[]> {
  const rows = await fetchActiveRecurring();
  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    type: row.type,
    frequency: row.frequency,
    description: row.description ?? row.recipient ?? "",
    dayOfMonth: row.day_of_month ?? null,
  }));
}
