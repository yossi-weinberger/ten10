import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const TRIAL_USER_IDS = [
  "01665dce-d261-4a9b-b89d-04ce2460859b",
  "45e3efc0-171b-48ce-9f15-4468394dfaeb",
  "a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4",
  "5403d7d1-3f44-4243-a84a-f905c4aad30c",
  "f336e5d1-4dc2-40c6-b176-c0b199ee836d",
  "a3f81dec-f634-4784-9cc0-9921838a6037",
  "c4e7d297-9ed3-421a-af9c-92ccccf95ba0",
] as const;

const intake = readFileSync("supabase/migrations/20261103100000_ai_intake.sql", "utf8");
const plans = readFileSync("supabase/migrations/20261110100000_ai_plans.sql", "utf8");

describe("trial user allowlist", () => {
  it("is gone from Edge; the intake migration still has no SQL allowlist", () => {
    expect(intake).not.toContain("is_trial_user");
    expect(intake).not.toContain("ai_trial_only");
    for (const id of TRIAL_USER_IDS) expect(intake).not.toContain(id);
    const edgeFiles = readdirSync("supabase/functions", { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts"));
    for (const file of edgeFiles) {
      const source = readFileSync(`supabase/functions/${file}`, "utf8");
      expect(source, file).not.toContain("isTrialUser");
      expect(source, file).not.toContain("AI_TRIAL_ONLY");
      expect(source, file).not.toContain("trial-users");
    }
  });

  it("seeds the former trial users into user_plans as beta", () => {
    for (const id of TRIAL_USER_IDS) expect(plans).toContain(id);
    expect(plans).toContain("INSERT INTO public.user_plans");
    expect(plans).toContain("'beta'");
  });
});
