import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPlatformMock, invokeMock } = vi.hoisted(() => ({
  getPlatformMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/platformManager", () => ({ getPlatform: getPlatformMock }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { ExchangeRateService } from "./exchange-rate.service";
import {
  USD_ILS_MISSING_RATE_BODIES,
  USD_ILS_PROVIDER_FIXTURES,
} from "./__fixtures__/exchange-rate-responses";

const [EXCHANGERATE_API, FRANKFURTER, FLOATRATES] = USD_ILS_PROVIDER_FIXTURES;
const HOUR = 60 * 60 * 1000;

type Route = { ok: boolean; status?: number; body?: unknown } | Error;

function jsonResponse(route: Exclude<Route, Error>) {
  return {
    ok: route.ok,
    status: route.status ?? (route.ok ? 200 : 500),
    statusText: route.ok ? "OK" : "Internal Server Error",
    json: async () => route.body,
  };
}

/** Unlisted URLs fail with a network error. */
function mockFetch(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (url: string) => {
    const route = routes[url];
    if (!route) throw new TypeError(`network error: ${url}`);
    if (route instanceof Error) throw route;
    return jsonResponse(route);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calledUrls(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls.map(([url]) => url);
}

// The service keeps a module-level cache that cannot be reset from outside.
// Each test starts a day later so earlier fresh entries are expired, and tests
// that need "nothing cached at all" use a currency pair no other test touches.
let clock = Date.UTC(2026, 9, 18, 12);

beforeEach(() => {
  clock += 24 * HOUR;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  vi.stubGlobal("navigator", { onLine: true });
  getPlatformMock.mockReturnValue("web");
  invokeMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ExchangeRateService.fetchExchangeRate", () => {
  it("returns 1 for the same currency without fetching", async () => {
    const fetchMock = mockFetch({});
    await expect(ExchangeRateService.fetchExchangeRate("ILS", "ILS")).resolves.toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(USD_ILS_PROVIDER_FIXTURES.map((f) => [f.provider, f] as const))(
    "parses and rounds the %s response",
    async (_provider, fixture) => {
      const routes: Record<string, Route> = {};
      for (const other of USD_ILS_PROVIDER_FIXTURES) {
        if (other === fixture) break;
        routes[other.url] = { ok: false, status: 503 };
      }
      routes[fixture.url] = { ok: true, body: fixture.body };
      const fetchMock = mockFetch(routes);

      await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(
        fixture.expectedRate,
      );
      const urls = calledUrls(fetchMock);
      expect(urls[urls.length - 1]).toBe(fixture.url);
    },
  );

  it("tries providers in order: exchangerate-api, frankfurter, floatrates", async () => {
    const fetchMock = mockFetch({
      [EXCHANGERATE_API.url]: { ok: false, status: 500 },
      [FRANKFURTER.url]: new TypeError("offline"),
      [FLOATRATES.url]: { ok: true, body: FLOATRATES.body },
    });

    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.714);
    expect(calledUrls(fetchMock)).toEqual([
      EXCHANGERATE_API.url,
      FRANKFURTER.url,
      FLOATRATES.url,
    ]);
  });

  it("stops at the first provider that returns a rate", async () => {
    const fetchMock = mockFetch({
      [EXCHANGERATE_API.url]: { ok: true, body: EXCHANGERATE_API.body },
      [FRANKFURTER.url]: { ok: true, body: FRANKFURTER.body },
    });

    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7124);
    expect(calledUrls(fetchMock)).toEqual([EXCHANGERATE_API.url]);
  });

  it("moves on when a provider responds without the target rate", async () => {
    const fetchMock = mockFetch({
      [EXCHANGERATE_API.url]: { ok: true, body: USD_ILS_MISSING_RATE_BODIES["exchangerate-api"] },
      [FRANKFURTER.url]: { ok: true, body: USD_ILS_MISSING_RATE_BODIES.frankfurter },
      [FLOATRATES.url]: { ok: true, body: FLOATRATES.body },
    });

    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.714);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("treats a rate of 0 as missing and moves on", async () => {
    mockFetch({
      [EXCHANGERATE_API.url]: { ok: true, body: { rates: { ILS: 0 } } },
      [FRANKFURTER.url]: { ok: true, body: FRANKFURTER.body },
    });

    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7123);
  });

  it.each([
    [3.71234, 3.7123],
    [3.71235, 3.7124],
    [3.71245, 3.7125],
    [1.00005, 1.0001],
    [0.27025, 0.2703],
    [1.23456789, 1.2346],
  ])("rounds %s to 4 decimals as %s", async (raw, rounded) => {
    mockFetch({ [EXCHANGERATE_API.url]: { ok: true, body: { rates: { ILS: raw } } } });
    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(rounded);
  });

  it("returns null on web when every provider fails and nothing is cached", async () => {
    const fetchMock = mockFetch({});
    await expect(ExchangeRateService.fetchExchangeRate("GBP", "CHF")).resolves.toBeNull();
    expect(calledUrls(fetchMock)).toEqual([
      "https://api.exchangerate-api.com/v4/latest/GBP",
      "https://api.frankfurter.app/latest?from=GBP&symbols=CHF",
      "https://www.floatrates.com/daily/gbp.json",
    ]);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("ExchangeRateService cache", () => {
  it("serves a cached rate for up to one hour", async () => {
    const fetchMock = mockFetch({
      [EXCHANGERATE_API.url]: { ok: true, body: EXCHANGERATE_API.body },
    });

    await ExchangeRateService.fetchExchangeRate("USD", "ILS");
    vi.setSystemTime(clock + HOUR - 1);
    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7124);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(clock + HOUR);
    await ExchangeRateService.fetchExchangeRate("USD", "ILS");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches the reverse rate, rounded from the unrounded forward rate", async () => {
    const fetchMock = mockFetch({
      "https://api.exchangerate-api.com/v4/latest/EUR": {
        ok: true,
        body: { rates: { GBP: 0.27025 } },
      },
    });

    await expect(ExchangeRateService.fetchExchangeRate("EUR", "GBP")).resolves.toBe(0.2703);
    await expect(ExchangeRateService.fetchExchangeRate("GBP", "EUR")).resolves.toBe(3.7003);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a stale cached rate when every provider fails", async () => {
    mockFetch({ [EXCHANGERATE_API.url]: { ok: true, body: EXCHANGERATE_API.body } });
    await ExchangeRateService.fetchExchangeRate("USD", "ILS");

    vi.setSystemTime(clock + 5 * HOUR);
    const fetchMock = mockFetch({});
    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7124);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("ExchangeRateService offline and last-known rate", () => {
  it("does not fetch while offline and returns a stale cached rate", async () => {
    mockFetch({ [EXCHANGERATE_API.url]: { ok: true, body: EXCHANGERATE_API.body } });
    await ExchangeRateService.fetchExchangeRate("USD", "ILS");

    vi.setSystemTime(clock + 2 * HOUR);
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = mockFetch({});
    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7124);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a fresh cached rate even while offline", async () => {
    mockFetch({ [EXCHANGERATE_API.url]: { ok: true, body: EXCHANGERATE_API.body } });
    await ExchangeRateService.fetchExchangeRate("USD", "ILS");

    vi.stubGlobal("navigator", { onLine: false });
    await expect(ExchangeRateService.fetchExchangeRate("USD", "ILS")).resolves.toBe(3.7124);
  });

  it("returns null on web while offline with nothing cached", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = mockFetch({});
    await expect(ExchangeRateService.fetchExchangeRate("CAD", "AUD")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the desktop DB for the last known rate when nothing is cached", async () => {
    getPlatformMock.mockReturnValue("desktop");
    invokeMock.mockResolvedValue(3.55);
    mockFetch({});

    await expect(ExchangeRateService.fetchExchangeRate("BRL", "ZAR")).resolves.toBe(3.55);
    expect(invokeMock).toHaveBeenCalledWith("get_last_known_rate", {
      fromCurrency: "BRL",
      toCurrency: "ZAR",
    });
  });

  it("returns null on desktop when the DB has no rate or the call fails", async () => {
    getPlatformMock.mockReturnValue("desktop");
    vi.stubGlobal("navigator", { onLine: false });

    invokeMock.mockResolvedValueOnce(null);
    await expect(ExchangeRateService.fetchExchangeRate("UAH", "MXN")).resolves.toBeNull();

    invokeMock.mockRejectedValueOnce(new Error("db locked"));
    await expect(ExchangeRateService.fetchExchangeRate("UAH", "MXN")).resolves.toBeNull();
  });
});
