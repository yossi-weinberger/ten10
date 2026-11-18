import { handleAdminAiSpend, type AdminSpendDeps } from "./index.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const KEY = "gateway-secret-key";
const SPEND_URL = "https://example.test/get-ai-admin-spend?from=2026-10-28&to=2026-10-28";

function reportBody(kind: "model" | "day" | "eval"): unknown {
  if (kind === "model") {
    return {
      results: [{ model: "typesafe-ai/jev", total_cost: 0.07, request_count: 12, input_tokens: 30, output_tokens: 4 }],
    };
  }
  if (kind === "eval") {
    return { results: [{ day: "2026-10-28", total_cost: 0.25, request_count: 6 }] };
  }
  return { results: [{ day: "2026-10-28", total_cost: 0.5, request_count: 10 }] };
}

function gateway(creditsStatus: number, creditsBody: unknown): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = (input) => {
    const href = input instanceof Request ? input.url : String(input);
    calls.push(href);
    const target = new URL(href);
    if (target.pathname.endsWith("/credits")) {
      return Promise.resolve(new Response(JSON.stringify(creditsBody), { status: creditsStatus }));
    }
    const kind = target.searchParams.get("group_by") === "model"
      ? "model"
      : target.searchParams.has("tags")
      ? "eval"
      : "day";
    return Promise.resolve(new Response(JSON.stringify(reportBody(kind)), { status: 200 }));
  };
  return { fetchImpl, calls };
}

function deps(overrides: Partial<AdminSpendDeps> & { fetchImpl: typeof fetch }): AdminSpendDeps & { warnings: string[] } {
  const warnings: string[] = [];
  return {
    authorize: () => Promise.resolve("ok"),
    apiKey: () => KEY,
    warn: (message) => warnings.push(message),
    warnings,
    ...overrides,
  };
}

function request(headers: HeadersInit = { Authorization: "Bearer user-jwt" }): Request {
  return new Request(SPEND_URL, { headers });
}

Deno.test("credits and spend both succeed", async () => {
  const gatewayFetch = gateway(200, { balance: "95.50", total_used: "4.50", token_pass: null });
  const input = deps({ fetchImpl: gatewayFetch.fetchImpl });
  const response = await handleAdminAiSpend(request(), input);
  const body = await response.json();

  assert(response.status === 200, "status");
  assert(body.available === true, "spend available");
  assert(body.models[0].label === "typesafe-ai/jev", "model");
  assert(body.sources.app === 0.25, "app spend");
  assert(body.credits.available === true, "credits available");
  assert(body.credits.balance === "95.50" && body.credits.totalUsed === "4.50", "credits amounts");
  assert(body.credits.passRemaining === null, "no pass");
  assert(gatewayFetch.calls.filter((href) => href.includes("/v1/report")).length === 3, "three reports");
  assert(gatewayFetch.calls.filter((href) => href.includes("/v1/credits")).length === 1, "one credits call");
  assert(input.warnings.length === 0, "no warning");
  assert(!JSON.stringify(body).includes(KEY), "key stays out of the body");
});

Deno.test("a credits failure leaves spend unchanged", async () => {
  const gatewayFetch = gateway(500, { error: "down" });
  const input = deps({ fetchImpl: gatewayFetch.fetchImpl });
  const response = await handleAdminAiSpend(request(), input);
  const body = await response.json();

  assert(response.status === 200, "status");
  assert(body.available === true, "spend available");
  assert(body.models[0].label === "typesafe-ai/jev", "model");
  assert(body.sources.app === 0.25, "app spend");
  assert(body.credits.available === false, "credits unavailable");
  assert(body.credits.balance === null && body.credits.totalUsed === null && body.credits.passRemaining === null, "null credits");
  assert(input.warnings.length === 1, "one warning");
  assert(!input.warnings[0].includes(KEY), "warning hides the key");
});

Deno.test("a missing gateway key returns empty spend and unavailable credits", async () => {
  let fetched = false;
  const input = deps({
    apiKey: () => "",
    fetchImpl: () => {
      fetched = true;
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
  });
  const response = await handleAdminAiSpend(request(), input);
  const body = await response.json();

  assert(response.status === 200, "status");
  assert(body.available === false, "spend empty");
  assert(body.models.length === 0, "no models");
  assert(body.credits.available === false, "credits unavailable");
  assert(fetched === false, "no gateway call");
  assert(input.warnings.length === 1, "one warning");
});

Deno.test("a request without auth is rejected", async () => {
  let authorized = false;
  const input = deps({
    authorize: () => {
      authorized = true;
      return Promise.resolve("ok");
    },
    fetchImpl: () => Promise.resolve(new Response("{}", { status: 200 })),
  });
  const response = await handleAdminAiSpend(request({}), input);
  const body = await response.json();

  assert(response.status === 401, "status");
  assert(body.error === "Missing authorization", "error");
  assert(authorized === false, "gate not reached");
});

Deno.test("a non-admin is forbidden", async () => {
  let fetched = false;
  const input = deps({
    authorize: () => Promise.resolve("forbidden"),
    fetchImpl: () => {
      fetched = true;
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
  });
  const response = await handleAdminAiSpend(request(), input);
  const body = await response.json();

  assert(response.status === 403, "status");
  assert(body.error === "Forbidden", "error");
  assert(fetched === false, "no gateway call");
});
