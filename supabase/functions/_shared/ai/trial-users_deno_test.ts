import { isTrialUser } from "./trial-users.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("trial allowlist denies anyone who is not listed by default", () => {
  assert(isTrialUser(undefined) === false, "missing id is denied");
  assert(isTrialUser("00000000-0000-4000-8000-000000000000") === false, "unknown id is denied");
  assert(isTrialUser("01665dce-d261-4a9b-b89d-04ce2460859b") === true, "trial id is allowed");
  assert(isTrialUser("c4e7d297-9ed3-421a-af9c-92ccccf95ba0") === true, "qa trial id is allowed");
});

Deno.test("AI_TRIAL_ONLY=false allows any valid user id", () => {
  let prevTrial: string | undefined;
  try {
    prevTrial = Deno.env.get("AI_TRIAL_ONLY");
  } catch {
    // ignore
  }
  try {
    Deno.env.set("AI_TRIAL_ONLY", "false");
    assert(isTrialUser("00000000-0000-4000-8000-000000000000") === true, "non-trial id is allowed when trial restriction is off");
    assert(isTrialUser(undefined) === false, "missing id remains false");
  } finally {
    if (prevTrial === undefined) Deno.env.delete("AI_TRIAL_ONLY");
    else Deno.env.set("AI_TRIAL_ONLY", prevTrial);
  }
});

Deno.test("production environment remains restricted by default unless AI_TRIAL_ONLY=false", () => {
  let prevEnv: string | undefined;
  let prevTrial: string | undefined;
  try {
    prevEnv = Deno.env.get("ENVIRONMENT");
    prevTrial = Deno.env.get("AI_TRIAL_ONLY");
  } catch {
    // ignore
  }
  try {
    Deno.env.set("ENVIRONMENT", "production");
    Deno.env.delete("AI_TRIAL_ONLY");
    assert(isTrialUser("00000000-0000-4000-8000-000000000000") === false, "production stays restricted by default (safe-by-default)");

    Deno.env.set("AI_TRIAL_ONLY", "false");
    assert(isTrialUser("00000000-0000-4000-8000-000000000000") === true, "explicit AI_TRIAL_ONLY=false opens access in production");
  } finally {
    if (prevEnv === undefined) Deno.env.delete("ENVIRONMENT");
    else Deno.env.set("ENVIRONMENT", prevEnv);
    if (prevTrial === undefined) Deno.env.delete("AI_TRIAL_ONLY");
    else Deno.env.set("AI_TRIAL_ONLY", prevTrial);
  }
});
