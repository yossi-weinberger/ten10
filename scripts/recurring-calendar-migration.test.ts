import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923161451_add_recurring_calendar_fields.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("recurring calendar migration", () => {
  it("adds backward-compatible calendar columns and constraints", () => {
    expect(migration).toMatch(
      /ADD COLUMN IF NOT EXISTS calendar_type text NOT NULL DEFAULT 'gregorian'/i,
    );
    expect(migration).toMatch(
      /calendar_type IN \('gregorian', 'hebrew'\)/i,
    );
    expect(migration).toMatch(
      /calendar_type = 'hebrew'[\s\S]*day_of_month BETWEEN 1 AND 30/i,
    );
    expect(migration).toMatch(
      /ADD COLUMN IF NOT EXISTS anchor_month_code text/i,
    );
    expect(migration).toMatch(/M05L/i);
    expect(migration).toMatch(/M12/i);
    expect(migration).not.toMatch(
      /UPDATE\s+public\.recurring_transactions\s+SET\s+calendar_type\s*=\s*'gregorian'/i,
    );
  });

  it("preserves the deployed update RPC and adds a non-breaking overload", () => {
    expect(migration).not.toMatch(
      /DROP FUNCTION[\s\S]*update_recurring_transaction/i,
    );
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.update_recurring_transaction\([\s\S]*p_calendar_type text,[\s\S]*p_anchor_month_code text/i,
    );
    expect(migration).toMatch(/SECURITY INVOKER/i);
    expect(migration).toMatch(
      /GRANT EXECUTE[\s\S]*TO authenticated, service_role/i,
    );
  });

  it("leaves RLS and scheduling untouched and has no production references", () => {
    expect(migration).not.toMatch(
      /(?:ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY|CREATE\s+POLICY|DROP\s+POLICY/i,
    );
    expect(migration).not.toMatch(/cron\.|schedule\(|unschedule\(/i);
    expect(migration).not.toMatch(
      /production|project[_ -]?ref|supabase\.co|https?:\/\//i,
    );
  });

  it("prevents concurrent duplicate occurrences without rewriting historical duplicates", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*source_recurring_id,\s*occurrence_number/i,
    );
    expect(migration).toMatch(
      /created_at\s*>=\s*TIMESTAMPTZ\s*'2026-09-23 00:00:00\+00'/i,
    );
    expect(migration).not.toMatch(
      /DELETE\s+FROM\s+public\.transactions/i,
    );
  });
});
