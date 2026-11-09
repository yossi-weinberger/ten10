import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRIAL_USER_IDS } from "../supabase/functions/_shared/ai/trial-users.ts";

const sql = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");

describe("trial user allowlist", () => {
  it("lives only in the Edge functions, so AI_TRIAL_ONLY is the one switch", () => {
    expect(sql).not.toContain("is_trial_user");
    expect(sql).not.toContain("ai_trial_only");
    for (const id of TRIAL_USER_IDS) expect(sql).not.toContain(id);
  });
});
