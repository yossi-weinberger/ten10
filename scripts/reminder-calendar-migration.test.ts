import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923171026_add_reminder_calendar_type.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("reminder calendar migration", () => {
  it("adds a non-null Gregorian profile default with a closed check", () => {
    expect(migration).toMatch(
      /add column if not exists reminder_calendar_type text not null default 'gregorian'/i,
    );
    expect(migration).toMatch(
      /if not exists[\s\S]*profiles_reminder_calendar_type_check/i,
    );
    expect(migration).toMatch(
      /check\s*\(\s*reminder_calendar_type\s+in\s*\(\s*'gregorian'\s*,\s*'hebrew'\s*\)\s*\)/i,
    );
    expect(migration).not.toMatch(
      /update\s+public\.profiles\s+set\s+reminder_calendar_type/i,
    );
  });

  it("preserves the deployed one-argument RPC and adds a filtered overload", () => {
    expect(migration).not.toMatch(
      /(?:drop|create\s+or\s+replace)\s+function\s+public\.get_reminder_users_with_emails\s*\(\s*(?:reminder_day\s+)?integer\s*\)/i,
    );
    expect(migration).toMatch(
      /create\s+or\s+replace\s+function\s+public\.get_reminder_users_with_emails\s*\(\s*reminder_day\s+integer\s*,\s*reminder_calendar\s+text\s*\)/i,
    );
    expect(migration).toMatch(
      /public\.get_reminder_users_with_emails\s*\(\s*\$1\s*\)/i,
    );
  });

  it("uses invoker security, a safe search path, and service-role-only execution", () => {
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = ''/i);
    expect(migration).not.toMatch(/security definer/i);
    expect(migration).toMatch(
      /revoke all on function public\.get_reminder_users_with_emails\(integer, text\)\s+from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.get_reminder_users_with_emails\(integer, text\)\s+to service_role/i,
    );
  });

  it("does not activate or modify cron", () => {
    expect(migration).not.toMatch(
      /cron\.|schedule\(|unschedule\(|testing\s*=\s*false/i,
    );
  });
});
