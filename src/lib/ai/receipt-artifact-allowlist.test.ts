import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TRIAL_USER_IDS } from "../../../supabase/functions/_shared/ai/trial-users.ts";

describe("receipt artifact allowlist", () => {
  it("keeps the SQL guard aligned with the trial users", () => {
    const sql = readFileSync(
      resolve("supabase/migrations/20261021133000_ai_receipt_artifact_guards.sql"),
      "utf8",
    );
    for (const id of TRIAL_USER_IDS) {
      expect(sql).toContain(id);
    }
  });
});
