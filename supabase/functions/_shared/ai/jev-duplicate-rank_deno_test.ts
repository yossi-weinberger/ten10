import { buildDuplicateRankBody, dayGap, gatewaySystemOneBody, readDuplicateRanks } from "./jev-duplicate-rank.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("duplicate rank body sends amounts and keeps ids out of the model text", () => {
  const { body, idsByKey } = buildDuplicateRankBody({
    description: "מאפים באליס",
    type: "expense",
    amount: 15,
    currency: "ILS",
    candidates: [{
      id: "11111111-1111-1111-1111-111111111111",
      description: "מאפים",
      type: "expense",
      dayGap: 1,
      amount: 15,
      currency: "ILS",
    }],
  });

  const serialized = JSON.stringify(body);
  assert(body.model === "typesafe-ai/jev", "model pin");
  const sent = gatewaySystemOneBody(body);
  assert(sent.providerOptions.gateway.zeroDataRetention === true, "zero data retention");
  assert(!("models" in sent.providerOptions.gateway), "no fallback models");
  assert(!serialized.includes("11111111"), "candidate id leaked into the body");
  assert(body.state.amount === 15 && body.state.currency === "ILS", "draft amount");
  assert(body.questions.q0.instructions.candidate.amount === 15, "candidate amount");
  assert(body.state.description === "מאפים באליס", "state description");
  assert(idsByKey.q0 === "11111111-1111-1111-1111-111111111111", "key map");
  assert(body.questions.q0.instructions.candidate.day_difference === 1, "day gap");
});

Deno.test("duplicate rank reader keeps only probabilities between 0 and 1", () => {
  const ranks = readDuplicateRanks({
    answers: {
      q0: { type: "noul", noul: 0.82 },
      q1: { type: "noul", noul: 1.4 },
      q2: { type: "noul" },
    },
  }, { q0: "a", q1: "b", q2: "c" });

  assert(ranks.length === 1 && ranks[0].id === "a" && ranks[0].probability === 0.82, "valid rank");
});

Deno.test("day gap uses the calendar dates", () => {
  assert(dayGap("2026-10-19", "2026-10-17") === 2, "two days");
  assert(dayGap("yesterday", "2026-10-17") === null, "invalid date");
});
