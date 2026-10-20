/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock Deno.env for testing
const originalEnv = global.Deno;
global.Deno = {
  env: {
    get: (key: string): string | undefined => {
      if (key === "SUPABASE_URL") {
        return (global as any).__TEST_SUPABASE_URL;
      }
      return undefined;
    },
  },
} as any;

// Import after Deno mock is set up
const { getCorsHeaders } = await import("./cors.ts");

describe("getCorsHeaders", () => {
  afterEach(() => {
    delete (global as any).__TEST_SUPABASE_URL;
  });

  describe("production environment (flpzqbvbymoluoeeeofg)", () => {
    beforeEach(() => {
      (global as any).__TEST_SUPABASE_URL =
        "https://flpzqbvbymoluoeeeofg.supabase.co";
    });

    it("blocks Vercel preview origins", () => {
      const headers = getCorsHeaders("https://ten10-git-feat-xyz.vercel.app");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Access-Control-Allow-Headers"]).toBe(
        "authorization, x-client-info, apikey, content-type"
      );
    });

    it("allows production origins", () => {
      const headers = getCorsHeaders("https://ten10-app.com");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://ten10-app.com"
      );
      expect(headers["Access-Control-Allow-Headers"]).toBe(
        "authorization, x-client-info, apikey, content-type"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("allows localhost", () => {
      const headers = getCorsHeaders("http://localhost:5173");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://localhost:5173"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });
  });

  describe("testing environment (bbcllewcotypedqsnwmi)", () => {
    beforeEach(() => {
      (global as any).__TEST_SUPABASE_URL =
        "https://bbcllewcotypedqsnwmi.supabase.co";
    });

    it("allows Vercel preview origins", () => {
      const headers = getCorsHeaders("https://ten10-git-feat-xyz.vercel.app");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://ten10-git-feat-xyz.vercel.app"
      );
      expect(headers["Access-Control-Allow-Headers"]).toBe(
        "authorization, x-client-info, apikey, content-type"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("allows production origins", () => {
      const headers = getCorsHeaders("https://ten10-app.com");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://ten10-app.com"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("blocks http Vercel origins (https only)", () => {
      const headers = getCorsHeaders("http://ten10-git-feat-xyz.vercel.app");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("blocks malformed Vercel origins - with path", () => {
      const headers = getCorsHeaders("https://ten10.vercel.app/malicious");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("blocks malformed Vercel origins - wrong domain", () => {
      const headers = getCorsHeaders("https://ten10-vercel-app.com");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("blocks malformed Vercel origins - double subdomain", () => {
      const headers = getCorsHeaders("https://sub.ten10.vercel.app");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });
  });

  describe("no origin (server-to-server)", () => {
    beforeEach(() => {
      (global as any).__TEST_SUPABASE_URL =
        "https://flpzqbvbymoluoeeeofg.supabase.co";
    });

    it("returns default origin", () => {
      const headers = getCorsHeaders(null);

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://ten10-app.com"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });
  });
});
