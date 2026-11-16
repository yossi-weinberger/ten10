import { describe, expect, it } from "vitest";
import { validateServiceRoleAuth, validateHours } from "./auth-helpers.ts";

/**
 * Authorization tests for send-new-user-email
 * Tests the real auth-helpers module used by the function.
 */

// Helper to create a minimal JWT for testing role/expiration checks
// (Gateway already verified signature via verify_jwt=true, we only check claims)
function makeTestToken(payload: { role: string; exp?: number }): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = "fake-signature";
  return `${header}.${payloadB64}.${signature}`;
}

describe("validateServiceRoleAuth", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  it("accepts valid service_role JWT", () => {
    const token = makeTestToken({ role: "service_role", exp: futureExp });
    const result = validateServiceRoleAuth(`Bearer ${token}`);
    
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.hours).toBe(24); // default
    }
  });

  it("rejects anon role with 403", () => {
    const token = makeTestToken({ role: "anon", exp: futureExp });
    const result = validateServiceRoleAuth(`Bearer ${token}`);
    
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("service_role required");
    }
  });

  it("rejects authenticated role with 403", () => {
    const token = makeTestToken({ role: "authenticated", exp: futureExp });
    const result = validateServiceRoleAuth(`Bearer ${token}`);
    
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("service_role required");
    }
  });

  it("rejects expired token with 401", () => {
    const token = makeTestToken({ role: "service_role", exp: pastExp });
    const result = validateServiceRoleAuth(`Bearer ${token}`);
    
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(401);
      expect(result.error).toContain("expired");
    }
  });

  it("rejects missing Authorization header with 401", () => {
    const result = validateServiceRoleAuth(null);
    
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(401);
      expect(result.error).toContain("Missing Authorization");
    }
  });

  it("rejects malformed header (no 'Bearer ') with 401", () => {
    const token = makeTestToken({ role: "service_role", exp: futureExp });
    const result = validateServiceRoleAuth(token); // missing 'Bearer '
    
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.status).toBe(401);
      expect(result.error).toContain("Invalid Authorization format");
    }
  });

  it("accepts 'Bearer ' prefix case-insensitively", () => {
    const token = makeTestToken({ role: "service_role", exp: futureExp });
    
    const lowerResult = validateServiceRoleAuth(`bearer ${token}`);
    expect(lowerResult.authorized).toBe(true);
    
    const upperResult = validateServiceRoleAuth(`BEARER ${token}`);
    expect(upperResult.authorized).toBe(true);
    
    const mixedResult = validateServiceRoleAuth(`BeArEr ${token}`);
    expect(mixedResult.authorized).toBe(true);
  });

  it("returns validated hours when provided", () => {
    const token = makeTestToken({ role: "service_role", exp: futureExp });
    
    const result1 = validateServiceRoleAuth(`Bearer ${token}`, 1);
    expect(result1.authorized).toBe(true);
    if (result1.authorized) {
      expect(result1.hours).toBe(1);
    }
    
    const result168 = validateServiceRoleAuth(`Bearer ${token}`, 168);
    expect(result168.authorized).toBe(true);
    if (result168.authorized) {
      expect(result168.hours).toBe(168);
    }
  });
});

describe("validateHours", () => {
  it("accepts valid hours (1-168)", () => {
    expect(validateHours(1)).toBe(1);
    expect(validateHours(24)).toBe(24);
    expect(validateHours(72)).toBe(72);
    expect(validateHours(168)).toBe(168);
  });

  it("rejects hours outside bounds and uses default (24)", () => {
    expect(validateHours(0)).toBe(24);
    expect(validateHours(-1)).toBe(24);
    expect(validateHours(169)).toBe(24);
    expect(validateHours(1000)).toBe(24);
  });

  it("rejects non-integer hours and uses default (24)", () => {
    expect(validateHours(1.5)).toBe(24);
    expect(validateHours(23.9)).toBe(24);
    expect(validateHours(NaN)).toBe(24);
    expect(validateHours(Infinity)).toBe(24);
  });

  it("rejects non-numeric values and uses default (24)", () => {
    expect(validateHours(undefined)).toBe(24);
    expect(validateHours(null)).toBe(24);
    expect(validateHours("24")).toBe(24);
    expect(validateHours(true)).toBe(24);
    expect(validateHours({})).toBe(24);
    expect(validateHours([])).toBe(24);
  });
});
