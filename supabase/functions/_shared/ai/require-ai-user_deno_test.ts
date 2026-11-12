import { assertEquals } from "jsr:@std/assert@^1.0.11";
import { requireAiUser } from "./require-ai-user.ts";

// Mock Deno.env
const originalEnv = Deno.env.get;
Deno.env.get = (key: string) => {
  if (key === "SUPABASE_URL") return "https://test.supabase.co";
  if (key === "SUPABASE_ANON_KEY") return "test-anon-key";
  return originalEnv.call(Deno.env, key);
};

Deno.test("requireAiUser - OPTIONS returns CORS response", async () => {
  const req = new Request("https://test.com", { method: "OPTIONS" });
  const result = await requireAiUser(req);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 200);
    assertEquals(await result.response.text(), "ok");
  }
});

Deno.test("requireAiUser - non-POST returns 405", async () => {
  const req = new Request("https://test.com", { method: "GET" });
  const result = await requireAiUser(req, { methodNotAllowedBody: { intent: null } });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 405);
    const body = await result.response.json();
    assertEquals(body.intent, null);
  }
});

Deno.test("requireAiUser - missing auth header returns 401", async () => {
  const req = new Request("https://test.com", { method: "POST" });
  const result = await requireAiUser(req, { skipEnabledCheck: true });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 401);
    const body = await result.response.json();
    assertEquals(body.error, "Missing authorization");
  }
});

Deno.test("requireAiUser - custom unavailable body", async () => {
  const req = new Request("https://test.com", { method: "POST" });
  const result = await requireAiUser(req, { unavailableBody: { text: null, reason: "unavailable" } });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 200);
    const body = await result.response.json();
    assertEquals(body.text, null);
    assertEquals(body.reason, "unavailable");
  }
});

// Restore original env
Deno.env.get = originalEnv;

const USER_ID = "11111111-1111-4111-8111-111111111111";

interface GateCall {
  url: string;
  apiKey: string | null;
  profile: string | null;
  body: unknown;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/**
 * Serves the real supabase-js client used by requireAiUser.
 * The gate calls one public RPC. A version mismatch is decided inside SQL.
 */
function installGateFetch(options: {
  allowed: boolean;
  consent?: boolean | { error: number };
}): GateCall[] {
  const calls: GateCall[] = [];
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    let body: unknown = null;
    if (typeof init?.body === "string" && init.body.length > 0) body = JSON.parse(init.body);
    calls.push({
      url,
      apiKey: headers.get("apikey"),
      profile: headers.get("content-profile"),
      body,
    });
    if (url.endsWith("/auth/v1/user")) {
      return Promise.resolve(jsonResponse({
        id: USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "user@example.com",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
      }));
    }
    if (url.endsWith("/rest/v1/rpc/ai_user_allowed")) {
      return Promise.resolve(jsonResponse(options.allowed));
    }
    if (url.endsWith("/rest/v1/rpc/ai_has_current_beta_consent")) {
      const consent = options.consent ?? false;
      if (typeof consent === "object") {
        return Promise.resolve(jsonResponse({ message: "consent rpc failed", code: "PGRST202" }, consent.error));
      }
      return Promise.resolve(jsonResponse(consent));
    }
    return Promise.resolve(jsonResponse({ message: `unexpected ${url}` }, 500));
  };
  return calls;
}

function withGateEnv<T>(run: () => Promise<T>): Promise<T> {
  const previousEnv = Deno.env.get;
  const previousFetch = globalThis.fetch;
  Deno.env.get = (key: string) => {
    if (key === "SUPABASE_URL") return "https://test.supabase.co";
    if (key === "SUPABASE_ANON_KEY") return "test-anon-key";
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return "test-service-key";
    try {
      return previousEnv.call(Deno.env, key);
    } catch (error) {
      if (error instanceof Deno.errors.NotCapable) return undefined;
      throw error;
    }
  };
  return run().finally(() => {
    Deno.env.get = previousEnv;
    globalThis.fetch = previousFetch;
  });
}

function callsNamed(calls: GateCall[], name: string): GateCall[] {
  return calls.filter((call) => call.url.endsWith(`/rest/v1/rpc/${name}`));
}

Deno.test({
  name: "requireAiUser beta consent gate",
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  await t.step("consented user passes through the public wrapper", async () => {
    await withGateEnv(async () => {
      const calls = installGateFetch({ allowed: true, consent: true });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, { skipEnabledCheck: true });
      assertEquals(result.ok, true);
      if (result.ok) assertEquals(result.userId, USER_ID);
      const consentCalls = callsNamed(calls, "ai_has_current_beta_consent");
      assertEquals(consentCalls.length, 1);
      assertEquals(callsNamed(calls, "has_beta_consent").length, 0);
      assertEquals(callsNamed(calls, "current_beta_terms_version").length, 0);
      assertEquals(consentCalls[0].apiKey, "test-service-key");
      assertEquals(consentCalls[0].profile, "public");
      assertEquals(consentCalls[0].body, { p_user_id: USER_ID });
    });
  });

  await t.step("a user without consent is denied with beta_consent_required", async () => {
    await withGateEnv(async () => {
      installGateFetch({ allowed: true, consent: false });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, { skipEnabledCheck: true });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.response.status, 403);
        assertEquals(await result.response.json(), {
          error: "beta_consent_required",
          code: "beta_consent_required",
        });
      }
    });
  });

  await t.step("an RPC error denies the request", async () => {
    await withGateEnv(async () => {
      installGateFetch({ allowed: true, consent: { error: 500 } });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, { skipEnabledCheck: true });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.response.status, 403);
        const body = await result.response.json();
        assertEquals(body.code, "beta_consent_required");
      }
    });
  });

  await t.step("a missing consent function denies the request", async () => {
    await withGateEnv(async () => {
      installGateFetch({ allowed: true, consent: { error: 404 } });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, { skipEnabledCheck: true });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.response.status, 403);
        const body = await result.response.json();
        assertEquals(body.code, "beta_consent_required");
      }
    });
  });

  await t.step("a user with no plan still gets the plan error, not beta_consent_required", async () => {
    await withGateEnv(async () => {
      const calls = installGateFetch({ allowed: false, consent: true });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, {
        skipEnabledCheck: true,
        notAllowedBody: { intent: null },
      });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.response.status, 200);
        assertEquals(await result.response.json(), { intent: null });
      }
      assertEquals(callsNamed(calls, "ai_has_current_beta_consent").length, 0);
    });
  });

  await t.step("skipping the plan check still requires current consent", async () => {
    await withGateEnv(async () => {
      const calls = installGateFetch({ allowed: false, consent: false });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, { skipEnabledCheck: true, skipAllowedCheck: true });
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.response.status, 403);
        const body = await result.response.json();
        assertEquals(body.code, "beta_consent_required");
      }
      assertEquals(callsNamed(calls, "ai_user_allowed").length, 0);
      assertEquals(callsNamed(calls, "ai_has_current_beta_consent").length, 1);
    });
  });

  await t.step("a saved-receipt caller can skip consent without skipping every other caller", async () => {
    await withGateEnv(async () => {
      const calls = installGateFetch({ allowed: false, consent: false });
      const req = new Request("https://test.com", {
        method: "POST",
        headers: { Authorization: "Bearer user-jwt" },
      });
      const result = await requireAiUser(req, {
        skipEnabledCheck: true,
        skipAllowedCheck: true,
        skipConsentCheck: true,
      });
      assertEquals(result.ok, true);
      assertEquals(callsNamed(calls, "ai_has_current_beta_consent").length, 0);
    });
  });
});
