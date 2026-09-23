import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const processor = readFileSync(
  new URL(
    "../supabase/functions/process-recurring-transactions/index.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("recurring Edge processor calendar contract", () => {
  it("uses only the shared recurrence engine", () => {
    expect(processor).toMatch(
      /import \{ advanceRecurringDate \} from "\.\.\/_shared\/calendar\/index\.ts"/,
    );
    expect(processor).not.toMatch(
      /function (?:advanceMonthly|parseLocalDate|formatLocalDate)/,
    );
  });

  it("selects calendar fields and guards occurrence identity", () => {
    expect(processor).toMatch(
      /calendar_type,anchor_month_code,day_of_month/,
    );
    expect(processor).toMatch(
      /\.eq\("source_recurring_id", rec\.id\)[\s\S]*\.eq\("occurrence_number", occurrenceNumber\)/,
    );
  });

  it("does not activate scheduling or contain Hebrew calendar math", () => {
    expect(processor).not.toMatch(/cron\.|schedule\(|unschedule\(/);
    expect(processor).not.toMatch(
      /hebrew.*(?:month|year).*(?:\+|-)|(?:month|year).*(?:\+|-).*hebrew/i,
    );
  });
});
