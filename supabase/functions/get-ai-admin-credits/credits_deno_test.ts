import { parseGatewayCredits } from "./credits.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("credits parse keeps the balance and a token pass", () => {
  const credits = parseGatewayCredits({
    balance: "95.50",
    total_used: "4.50",
    token_pass: { remaining: "12.34", resets_at: "2026-12-01T00:00:00.000Z" },
  });
  assert(credits?.balance === "95.50", "balance");
  assert(credits?.totalUsed === "4.50", "used");
  assert(credits?.passRemaining === "12.34", "pass");
});

Deno.test("credits parse drops a body without a balance", () => {
  assert(parseGatewayCredits({ total_used: "4.50" }) === null, "missing balance");
  assert(parseGatewayCredits(null) === null, "empty");
});

Deno.test("credits parse allows a missing token pass", () => {
  const credits = parseGatewayCredits({ balance: "95.50", total_used: "4.50", token_pass: null });
  assert(credits?.passRemaining === null, "no pass");
});
