import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260923220100_get_all_reminder_users.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("all reminder users migration", () => {
  it("adds a day-unfiltered recipient RPC without changing monthly signatures", () => {
    expect(migration).toMatch(
      /create\s+or\s+replace\s+function\s+public\.get_all_reminder_users_with_emails\s*\(\s*\)/i,
    );
    expect(migration).not.toMatch(
      /(?:drop|create\s+or\s+replace)\s+function\s+public\.get_reminder_users_with_emails/i,
    );
    expect(migration).not.toMatch(/reminder_day_of_month\s*=/i);
    expect(migration).toMatch(/p\.reminder_enabled\s*=\s*true/i);
    expect(migration).toMatch(/mailing_list_consent/i);
  });

  it("is service-role only and does not touch cron", () => {
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(
      /revoke all on function public\.get_all_reminder_users_with_emails\(\)\s+from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.get_all_reminder_users_with_emails\(\)\s+to service_role/i,
    );
    expect(migration).not.toMatch(
      /cron\.|schedule\(|unschedule\(|testing\s*=\s*false/i,
    );
  });
});
