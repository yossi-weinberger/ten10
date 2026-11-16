import { describe, expect, it } from "vitest";
import {
  CURRENCIES as DOMAIN_CURRENCIES,
  MIN_TRANSACTION_DATE as DOMAIN_MIN_TRANSACTION_DATE,
} from "../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
import { CURRENCIES } from "./currencies";
import { MIN_TRANSACTION_DATE } from "./utils/transaction-date";

describe("normalize-core constants match src", () => {
  it("lists the same currencies, codes and symbols, in the same order", () => {
    expect(DOMAIN_CURRENCIES).toEqual(
      CURRENCIES.map(({ code, symbol }) => ({ code, symbol }))
    );
  });

  it("uses the same earliest transaction date", () => {
    expect(DOMAIN_MIN_TRANSACTION_DATE).toBe(MIN_TRANSACTION_DATE);
  });
});
