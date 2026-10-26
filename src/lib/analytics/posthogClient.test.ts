import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isProductionHost,
  getEnvironmentType,
  isPostHogSupported,
  initPostHog,
  capturePostHogPageview,
  capturePostHogEvent,
  identifyPostHogUser,
  resetPostHogUser,
} from "./posthogClient";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock window object for testing
interface MockWindow {
  location: {
    hostname: string;
    href: string;
  };
  __TAURI_INTERNALS__?: unknown;
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
      location: { hostname, href: `https://${hostname}` },
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
      location: { hostname, href: `https://${hostname}` },
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

describe("isPostHogSupported", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(props: Partial<MockWindow> = {}) {
    const mockWindow: MockWindow = {
      location: { hostname: "test.com", href: "https://test.com" },
      ...props,
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("returns true when window exists, not Tauri, and token is set", () => {
    mockWindow();
    expect(isPostHogSupported()).toBe(true);
  });

  it("returns false when Tauri internals are present", () => {
    mockWindow({ __TAURI_INTERNALS__: {} });
    expect(isPostHogSupported()).toBe(false);
  });

  it("returns false when token is not set", () => {
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    mockWindow();
    expect(isPostHogSupported()).toBe(false);
  });

  it("returns false when window is undefined", () => {
    // @ts-expect-error - testing undefined window
    globalThis.window = undefined;
    expect(isPostHogSupported()).toBe(false);
  });
});

describe("initPostHog", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
    vi.stubEnv("VITE_PUBLIC_POSTHOG_HOST", "https://test.posthog.com");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname, href: `https://${hostname}` },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("initializes on prod with full capture enabled", () => {
    mockWindow("ten10-app.com");
    initPostHog();
    const initCall = (posthog.init as any).mock.calls[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    const config = initCall[1];
    
    expect(posthog.init).toHaveBeenCalledWith("test-token", expect.objectContaining({
      capture_pageleave: true,
      capture_exceptions: true,
      autocapture: true,
      disable_session_recording: false,
      disable_surveys: false,
    }));
    
    // Prod must NOT set these keys (so remote config controls them)
    expect(config).not.toHaveProperty("capture_dead_clicks");
    expect(config).not.toHaveProperty("capture_performance");
    expect(config).not.toHaveProperty("capture_heatmaps");
    
    expect(posthog.register).toHaveBeenCalledWith({ env: "prod" });
  });

  it("initializes on preview with capture disabled", () => {
    mockWindow("ten10-git-feature.vercel.app");
    initPostHog();
    expect(posthog.init).toHaveBeenCalledWith("test-token", expect.objectContaining({
      capture_pageleave: false,
      capture_exceptions: false,
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      capture_dead_clicks: false,
      capture_performance: false,
      capture_heatmaps: false,
    }));
    expect(posthog.register).toHaveBeenCalledWith({ env: "preview" });
  });

  it("does not initialize on localhost", () => {
    mockWindow("localhost");
    initPostHog();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("does not initialize on Tauri desktop", () => {
    const mockWindow: MockWindow = {
      location: { hostname: "tauri.localhost", href: "https://tauri.localhost" },
      __TAURI_INTERNALS__: {},
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
    initPostHog();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("preview before_send returns null for all events", () => {
    mockWindow("ten10-git-feature.vercel.app");
    initPostHog();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initCall = (posthog.init as any).mock.calls[0];
    const beforeSend = initCall[1].before_send;
    const mockEvent = { event: "$pageview", properties: {} };
    expect(beforeSend(mockEvent)).toBeNull();
  });

  it("prod before_send processes events normally", () => {
    mockWindow("ten10-app.com");
    initPostHog();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initCall = (posthog.init as any).mock.calls[0];
    const beforeSend = initCall[1].before_send;
    const mockEvent = { event: "$pageview", properties: {} };
    expect(beforeSend(mockEvent)).toBeTruthy();
  });
});

describe("capturePostHogPageview", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname, href: `https://${hostname}/test` },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("captures on prod", () => {
    mockWindow("ten10-app.com");
    capturePostHogPageview();
    expect(posthog.capture).toHaveBeenCalledWith("$pageview", expect.objectContaining({
      $current_url: expect.any(String),
    }));
  });

  it("does not capture on preview", () => {
    mockWindow("ten10-git-feature.vercel.app");
    capturePostHogPageview();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("does not capture on localhost", () => {
    mockWindow("localhost");
    capturePostHogPageview();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe("capturePostHogEvent", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname, href: `https://${hostname}` },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("captures on prod", () => {
    mockWindow("ten10-app.com");
    capturePostHogEvent("test_event", { test: "prop" });
    expect(posthog.capture).toHaveBeenCalledWith("test_event", {
      platform: "web",
      test: "prop",
    });
  });

  it("does not capture on preview", () => {
    mockWindow("ten10-git-feature.vercel.app");
    capturePostHogEvent("test_event");
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("does not capture on localhost", () => {
    mockWindow("localhost");
    capturePostHogEvent("test_event");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe("identifyPostHogUser", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname, href: `https://${hostname}` },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
  } as User;

  it("identifies on prod", () => {
    mockWindow("ten10-app.com");
    identifyPostHogUser(mockUser, "en", { name: "Test User", email: "test@example.com" });
    expect(posthog.identify).toHaveBeenCalledWith(
      "user-123",
      { language: "en", name: "Test User", email: "test@example.com" },
      expect.objectContaining({ first_login_at: expect.any(String) })
    );
  });

  it("identifies on preview for flag evaluation", () => {
    mockWindow("ten10-git-feature.vercel.app");
    identifyPostHogUser(mockUser, "en", { name: "Test User", email: "test@example.com" });
    expect(posthog.identify).toHaveBeenCalledWith(
      "user-123",
      { language: "en", name: "Test User", email: "test@example.com" },
      expect.objectContaining({ first_login_at: expect.any(String) })
    );
  });

  it("does not identify on localhost", () => {
    mockWindow("localhost");
    identifyPostHogUser(mockUser, "en");
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe("resetPostHogUser", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = typeof window !== "undefined" ? window : undefined;
    vi.clearAllMocks();
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-token");
  });

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    vi.unstubAllEnvs();
  });

  function mockWindow(hostname: string) {
    const mockWindow: MockWindow = {
      location: { hostname, href: `https://${hostname}` },
    };
    // @ts-expect-error - mocking window for testing
    globalThis.window = mockWindow;
  }

  it("resets on prod", () => {
    mockWindow("ten10-app.com");
    resetPostHogUser();
    expect(posthog.reset).toHaveBeenCalled();
  });

  it("resets on preview", () => {
    mockWindow("ten10-git-feature.vercel.app");
    resetPostHogUser();
    expect(posthog.reset).toHaveBeenCalled();
  });

  it("does not reset on localhost", () => {
    mockWindow("localhost");
    resetPostHogUser();
    expect(posthog.reset).not.toHaveBeenCalled();
  });
});
