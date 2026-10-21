import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRIAL_USER_IDS } from "../supabase/functions/_shared/ai/trial-users.ts";

const sql = readFileSync(
  "supabase/migrations/20261021133000_ai_receipt_artifact_guards.sql",
  "utf8",
);

describe("receipt artifact allowlist", () => {
  it("keeps the SQL guard aligned with the trial users", () => {
    for (const id of TRIAL_USER_IDS) {
      expect(sql).toContain(id);
    }
  });
});
