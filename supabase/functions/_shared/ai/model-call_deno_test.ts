import { callModel, type ModelCallInput, type ModelCallRow, readModelUsage } from "./model-call.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SYSTEMONE_PAYLOAD = {
  answers: { intent: { choice: "add_transaction", confidence: 0.9 } },
  usage: { input_tokens: 601, output_tokens: 75 },
  provider_metadata: {
    gateway: { cost: "0.000025242", gatewayCost: "0.000175242", generationId: "gen_jev" },
  },
};

const TRANSCRIPTION_PAYLOAD = {
  text: "",
  durationInSeconds: 1,
  providerMetadata: { gateway: { cost: "0.00002778", gatewayCost: "0.00002778", generationId: "gen_speech" } },
};

function input(fetchImpl: typeof fetch, rows: ModelCallRow[], overrides: Partial<ModelCallInput> = {}): ModelCallInput {
  let clock = 1000;
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    operation: "intent",
    model: "typesafe-ai/jev",
    url: "https://gateway.test/systemone",
    init: { method: "POST", body: "{}" },
    timeoutMs: 8000,
    record: (row) => {
      rows.push(row);
      return Promise.resolve();
    },
    fetchImpl,
    now: () => (clock += 250),
    ...overrides,
  };
}

Deno.test("usage is read from Jev and Responses payloads", () => {
  const usage = readModelUsage(SYSTEMONE_PAYLOAD);
  assert(usage.inputTokens === 601 && usage.outputTokens === 75, "tokens");
  assert(usage.costUsd === 0.000175242, "gateway cost includes the surcharge");
  assert(usage.generationId === "gen_jev", "generation id");
});

Deno.test("transcription has cost but no tokens", () => {
  const usage = readModelUsage(TRANSCRIPTION_PAYLOAD);
  assert(usage.inputTokens === null && usage.outputTokens === null, "no tokens");
  assert(usage.costUsd === 0.00002778, "cost from providerMetadata");
  assert(usage.generationId === "gen_speech", "generation id");
});

Deno.test("malformed usage is null, not zero", () => {
  const usage = readModelUsage({ usage: { input_tokens: -1, output_tokens: "7" }, provider_metadata: { gateway: { gatewayCost: "x" } } });
  assert(usage.inputTokens === null && usage.outputTokens === null, "tokens");
  assert(usage.costUsd === null && usage.generationId === null, "cost and id");
  assert(readModelUsage(null).costUsd === null, "null payload");
});

Deno.test("a successful call returns the payload and records one row", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.resolve(Response.json(SYSTEMONE_PAYLOAD))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(result.ok && (result.payload as typeof SYSTEMONE_PAYLOAD).usage.input_tokens === 601, "payload");
  assert(rows.length === 1, "one row");
  const row = rows[0];
  assert(row.ok && row.errorCode === null && row.httpStatus === 200, "ok row");
  assert(row.latencyMs === 250, "latency");
  assert(row.operation === "intent" && row.model === "typesafe-ai/jev", "operation and model");
  assert(row.inputTokens === 601 && row.costUsd === 0.000175242, "usage");
});

Deno.test("a 5xx is recorded with its status", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.resolve(new Response("busy", { status: 503 }))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(!result.ok && result.status === 503 && result.errorCode === "http_5xx", "result");
  assert(rows.length === 1 && !rows[0].ok && rows[0].errorCode === "http_5xx" && rows[0].httpStatus === 503, "row");
  assert(rows[0].costUsd === null, "no usage");
});

Deno.test("a 4xx is http_4xx", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.resolve(new Response("no", { status: 401 }))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(!result.ok && result.errorCode === "http_4xx", "result");
  assert(rows[0].errorCode === "http_4xx", "row");
});

Deno.test("a timeout is recorded without a status", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.reject(new DOMException("timed out", "TimeoutError"))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(!result.ok && result.status === null && result.errorCode === "timeout", "result");
  assert(rows[0].errorCode === "timeout" && rows[0].httpStatus === null, "row");
});

Deno.test("the real timeout fires and is recorded", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows, { timeoutMs: 10 }));
  assert(!result.ok && result.errorCode === "timeout", "timeout");
  assert(rows.length === 1, "row");
});

Deno.test("a network error is network", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.reject(new TypeError("connection reset"))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(!result.ok && result.errorCode === "network", "result");
  assert(rows[0].errorCode === "network", "row");
});

Deno.test("a body that is not JSON is unreadable", async () => {
  const rows: ModelCallRow[] = [];
  const fetchImpl = (() => Promise.resolve(new Response("<html>", { status: 200 }))) as typeof fetch;
  const result = await callModel(input(fetchImpl, rows));
  assert(!result.ok && result.status === 200 && result.errorCode === "unreadable", "result");
  assert(rows[0].errorCode === "unreadable" && rows[0].httpStatus === 200, "row");
});

Deno.test("a failed write does not fail the call", async () => {
  const fetchImpl = (() => Promise.resolve(Response.json(SYSTEMONE_PAYLOAD))) as typeof fetch;
  const result = await callModel(input(fetchImpl, [], {
    record: () => Promise.reject(new Error("db down")),
  }));
  assert(result.ok, "the call still succeeds");
});
