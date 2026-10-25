import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isProductionHost, getEnvironmentType } from "./posthogClient";

// Mock window object for testing
interface MockWindow {
  location: {
    hostname: string;
  };
}

describe("isProductionHost", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockHostname(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("returns true for ten10-app.com", () => {
    mockHostname("ten10-app.com");
    expect(isProductionHost()).toBe(true);
  });

  it("returns true for www.ten10-app.com", () => {
    mockHostname("www.ten10-app.com");
    expect(isProductionHost()).toBe(true);
  });

  it("returns false for Vercel preview deployment", () => {
    mockHostname("ten10-git-feature-branch.vercel.app");
    expect(isProductionHost()).toBe(false);
  });

  it("returns false for localhost", () => {
    mockHostname("localhost");
    expect(isProductionHost()).toBe(false);
  });

  it("returns false for 127.0.0.1", () => {
    mockHostname("127.0.0.1");
    expect(isProductionHost()).toBe(false);
  });

  it("respects VITE_POSTHOG_ALLOWED_HOSTS env var", () => {
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "custom.example.com,another.example.com");
    mockHostname("custom.example.com");
    expect(isProductionHost()).toBe(true);
  });

  it("returns false for default prod hosts when custom hosts are set", () => {
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "custom.example.com");
    mockHostname("ten10-app.com");
    expect(isProductionHost()).toBe(false);
  });

  it("handles comma-separated list with spaces", () => {
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "host1.com, host2.com , host3.com");
    mockHostname("host2.com");
    expect(isProductionHost()).toBe(true);
  });

  it("returns false when window is undefined", () => {
    // @ts-expect-error - testing undefined window
    globalThis.window = undefined;
    expect(isProductionHost()).toBe(false);
  });
});

describe("getEnvironmentType", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockHostname(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("returns 'prod' for ten10-app.com", () => {
    mockHostname("ten10-app.com");
    expect(getEnvironmentType()).toBe("prod");
  });

  it("returns 'prod' for www.ten10-app.com", () => {
    mockHostname("www.ten10-app.com");
    expect(getEnvironmentType()).toBe("prod");
  });

  it("returns 'preview' for Vercel preview deployment", () => {
    mockHostname("ten10-git-feature-branch.vercel.app");
    expect(getEnvironmentType()).toBe("preview");
  });

  it("returns 'preview' for any vercel.app subdomain", () => {
    mockHostname("ten10-production.vercel.app");
    expect(getEnvironmentType()).toBe("preview");
  });

  it("returns 'dev' for localhost", () => {
    mockHostname("localhost");
    expect(getEnvironmentType()).toBe("dev");
  });

  it("returns 'dev' for 127.0.0.1", () => {
    mockHostname("127.0.0.1");
    expect(getEnvironmentType()).toBe("dev");
  });

  it("returns 'dev' for unknown hosts", () => {
    mockHostname("random.example.com");
    expect(getEnvironmentType()).toBe("dev");
  });

  it("returns 'dev' when window is undefined", () => {
    // @ts-expect-error - testing undefined window
    globalThis.window = undefined;
    expect(getEnvironmentType()).toBe("dev");
  });

  it("respects VITE_POSTHOG_ALLOWED_HOSTS for prod determination", () => {
    vi.stubEnv("VITE_POSTHOG_ALLOWED_HOSTS", "staging.example.com");
    mockHostname("staging.example.com");
    expect(getEnvironmentType()).toBe("prod");
  });
});
