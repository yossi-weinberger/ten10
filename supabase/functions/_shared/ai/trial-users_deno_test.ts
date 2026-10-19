import { isTrialUser } from "./trial-users.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("trial allowlist denies anyone who is not listed", () => {
  assert(isTrialUser(undefined) === false, "missing id is denied");
  assert(isTrialUser("00000000-0000-4000-8000-000000000000") === false, "unknown id is denied");
  assert(isTrialUser("01665dce-d261-4a9b-b89d-04ce2460859b") === true, "trial id is allowed");
  assert(isTrialUser("c4e7d297-9ed3-421a-af9c-92ccccf95ba0") === true, "qa trial id is allowed");
});
