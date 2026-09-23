import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923145054_add_was_yom_tov_to_reminder_run_logs.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("reminder Yom Tov migration", () => {
  it("adds only the backward-compatible Yom Tov log column", () => {
    expect(migration).toMatch(
      /ALTER TABLE public\.reminder_run_logs\s+ADD COLUMN IF NOT EXISTS was_yom_tov BOOLEAN NOT NULL DEFAULT false;/i,
    );
    expect(migration).not.toMatch(
      /\b(?:DROP|DELETE|UPDATE|TRUNCATE|CREATE\s+OR\s+REPLACE\s+FUNCTION)\b/i,
    );
  });

  it("does not activate cron, change function signatures, or reference production", () => {
    expect(migration).not.toMatch(
      /cron\.|schedule\(|unschedule\(|CREATE\s+FUNCTION|ALTER\s+FUNCTION/i,
    );
    expect(migration).not.toMatch(
      /production|project[_ -]?ref|supabase\.co|https?:\/\//i,
    );
  });
});
