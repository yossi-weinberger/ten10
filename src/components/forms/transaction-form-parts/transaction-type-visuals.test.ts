import { describe, expect, it } from "vitest";
import {
  CreditCard,
  HandCoins,
  HeartHandshake,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { transactionTypes } from "@/types/transaction";
import { typeBadgeColors } from "@/types/transactionLabels";
import { TYPE_CHIP, TYPE_ICON, TYPE_PANEL } from "./transaction-type-visuals";

describe("transaction type visuals", () => {
  it("maps every transaction type to an icon and panel/chip colors", () => {
    expect(Object.keys(TYPE_ICON).sort()).toEqual([...transactionTypes].sort());
    expect(Object.keys(TYPE_CHIP).sort()).toEqual([...transactionTypes].sort());
    expect(Object.keys(TYPE_PANEL).sort()).toEqual([...transactionTypes].sort());

    expect(TYPE_ICON.income).toBe(Wallet);
    expect(TYPE_ICON["exempt-income"]).toBe(ShieldCheck);
    expect(TYPE_ICON.expense).toBe(CreditCard);
    expect(TYPE_ICON["recognized-expense"]).toBe(ReceiptText);
    expect(TYPE_ICON.donation).toBe(HandCoins);
    expect(TYPE_ICON.non_tithe_donation).toBe(HeartHandshake);
    expect(TYPE_ICON.initial_balance).toBe(Landmark);
  });

  it("reuses typeBadgeColors hues for panel and chip surfaces", () => {
    for (const type of transactionTypes) {
      const badge = typeBadgeColors[type];
      const hue = badge.match(/bg-([a-z]+)-100/)?.[1];
      expect(hue).toBeTruthy();
      expect(TYPE_PANEL[type]).toContain(`bg-${hue}-100`);
      expect(TYPE_PANEL[type]).toContain(`text-${hue}-800`);
      expect(TYPE_PANEL[type]).toContain(`dark:bg-${hue}-900/40`);
      expect(TYPE_PANEL[type]).toContain(`dark:text-${hue}-300`);
      expect(TYPE_CHIP[type]).toContain(`bg-${hue}-100`);
      expect(TYPE_CHIP[type]).toContain(`text-${hue}-700`);
      expect(TYPE_CHIP[type]).toContain(`dark:bg-${hue}-900/40`);
      expect(TYPE_CHIP[type]).toContain(`dark:text-${hue}-300`);
    }
  });
});
