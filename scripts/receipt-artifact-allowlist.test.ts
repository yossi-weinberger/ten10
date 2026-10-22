import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRIAL_USER_IDS } from "../supabase/functions/_shared/ai/trial-users.ts";

const sql = readFileSync("supabase/migrations/20261023030000_ai_trial_user.sql", "utf8");
const start = sql.indexOf("CREATE OR REPLACE FUNCTION ai.is_trial_user");
const end = sql.indexOf("REVOKE ALL ON FUNCTION ai.is_trial_user");
const body = sql.slice(start, end);

describe("trial user allowlist", () => {
  it("keeps ai.is_trial_user aligned with the Edge list", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    for (const id of TRIAL_USER_IDS) {
      expect(body).toContain(id);
      expect(sql.split(id).length - 1).toBe(1);
    }
    expect(sql).toContain("NOT ai.is_trial_user(p_user_id)");
  });
});
