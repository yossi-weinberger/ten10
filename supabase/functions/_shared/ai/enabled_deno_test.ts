import { isAiIntakeEnabled } from "./enabled.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("AI intake is on only when the flag is exactly true", () => {
  const previous = Deno.env.get("AI_INTAKE_ENABLED");
  try {
    Deno.env.delete("AI_INTAKE_ENABLED");
    assert(isAiIntakeEnabled() === false, "missing flag is off");
    Deno.env.set("AI_INTAKE_ENABLED", "false");
    assert(isAiIntakeEnabled() === false, "false is off");
    Deno.env.set("AI_INTAKE_ENABLED", "yes");
    assert(isAiIntakeEnabled() === false, "yes is off");
    Deno.env.set("AI_INTAKE_ENABLED", "true");
    assert(isAiIntakeEnabled() === true, "true is on");
  } finally {
    if (previous === undefined) Deno.env.delete("AI_INTAKE_ENABLED");
    else Deno.env.set("AI_INTAKE_ENABLED", previous);
  }
});
