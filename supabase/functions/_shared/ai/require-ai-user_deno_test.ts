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
