import { roundExchangeRate } from "./currency-rules.ts";
import { fetchExchangeRateFromProviders } from "./exchange-rates.ts";
import type { ExchangeRateFetch } from "./exchange-rates.ts";
import {
  USD_ILS_MISSING_RATE_BODIES,
  USD_ILS_PROVIDER_FIXTURES,
} from "../../../../src/lib/services/__fixtures__/exchange-rate-responses.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

const [EXCHANGERATE_API, FRANKFURTER, FLOATRATES] = USD_ILS_PROVIDER_FIXTURES;

function jsonResponse(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve(body),
  };
}

Deno.test("provider fixtures parse to the saved rounded rates", async () => {
  for (const fixture of USD_ILS_PROVIDER_FIXTURES) {
    const calls: string[] = [];
    const fetchImpl: ExchangeRateFetch = (url) => {
      calls.push(url);
      if (url !== fixture.url) return Promise.resolve(jsonResponse(false, null, 503));
      return Promise.resolve(jsonResponse(true, fixture.body));
    };

    const result = await fetchExchangeRateFromProviders("USD", "ILS", fetchImpl);
    assertEquals(result?.provider, fixture.provider);
    assertEquals(roundExchangeRate(result?.rate ?? 0), fixture.expectedRate);
    assertEquals(calls[calls.length - 1], fixture.url);
  }
});

Deno.test("a failed provider falls through to the next", async () => {
  const calls: string[] = [];
  const fetchImpl: ExchangeRateFetch = (url) => {
    calls.push(url);
    if (url === EXCHANGERATE_API.url) return Promise.resolve(jsonResponse(false, null, 500));
    if (url === FRANKFURTER.url) return Promise.reject(new TypeError("offline"));
    if (url === FLOATRATES.url) return Promise.resolve(jsonResponse(true, FLOATRATES.body));
    return Promise.reject(new TypeError(`network error: ${url}`));
  };

  const result = await fetchExchangeRateFromProviders("USD", "ILS", fetchImpl);
  assertEquals(result, { provider: "floatrates", rate: 3.7140221 });
  assertEquals(calls, [EXCHANGERATE_API.url, FRANKFURTER.url, FLOATRATES.url]);
});

Deno.test("a missing or zero rate falls through", async () => {
  const fetchImpl: ExchangeRateFetch = (url) => {
    if (url === EXCHANGERATE_API.url) {
      return Promise.resolve(jsonResponse(true, { rates: { ILS: 0 } }));
    }
    if (url === FRANKFURTER.url) {
      return Promise.resolve(jsonResponse(true, USD_ILS_MISSING_RATE_BODIES.frankfurter));
    }
    return Promise.resolve(jsonResponse(true, FLOATRATES.body));
  };

  const result = await fetchExchangeRateFromProviders("USD", "ILS", fetchImpl);
  assertEquals(result?.provider, "floatrates");
});

Deno.test("equal currencies are not a shortcut", async () => {
  const calls: string[] = [];
  const fetchImpl: ExchangeRateFetch = (url) => {
    calls.push(url);
    return Promise.resolve(jsonResponse(false, null, 404));
  };

  const result = await fetchExchangeRateFromProviders("USD", "USD", fetchImpl);
  assertEquals(result, null);
  assertEquals(calls.length, 3);
});
