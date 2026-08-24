import { describe, expect, it } from "vitest";
import {
  expandPaymentMethodFilterAliases,
  mergePaymentMethodOptions,
  normalizePaymentMethodValue,
  type PaymentMethodOption,
} from "./payment-methods";

describe("payment method compatibility", () => {
  it.each([
    ["credit_card", "credit_card"],
    [" Credit card ", "credit_card"],
    ["CREDIT CARD", "credit_card"],
    [" כרטיס אשראי ", "credit_card"],
  ])("normalizes official alias %j to %j", (value, expected) => {
    expect(normalizePaymentMethodValue(value)).toBe(expected);
  });

  it("preserves unknown custom descriptions after trimming", () => {
    expect(normalizePaymentMethodValue("  Corporate card  ")).toBe(
      "Corporate card",
    );
  });

  it("expands a canonical filter to the key and both official labels", () => {
    expect(expandPaymentMethodFilterAliases(["credit_card"])).toEqual([
      "credit_card",
      "Credit card",
      "כרטיס אשראי",
    ]);
  });

  it("merges trim-identical custom options but preserves case-distinct values", () => {
    const predefined: PaymentMethodOption[] = [
      {
        value: "credit_card",
        label: "Credit card",
        keywords: ["credit_card", "Credit card", "כרטיס אשראי"],
      },
    ];

    const options = mergePaymentMethodOptions(
      predefined,
      [
        "Credit card",
        " כרטיס אשראי ",
        " Corporate card ",
        "Corporate card",
        "corporate CARD",
      ],
      "en",
    );

    expect(options).toHaveLength(3);
    expect(options[0]).toEqual(predefined[0]);
    expect(options.slice(1)).toEqual(
      expect.arrayContaining([
        {
          value: "Corporate card",
          label: "Corporate card",
          keywords: ["Corporate card"],
        },
        {
          value: "corporate CARD",
          label: "corporate CARD",
          keywords: ["corporate CARD"],
        },
      ]),
    );
    expect(
      new Set(
        expandPaymentMethodFilterAliases(
          options.slice(1).map((option) => option.value),
        ),
      ),
    ).toEqual(new Set(["Corporate card", "corporate CARD"]));
  });

  it("produces unique cmdk identities even when raw labels collide", () => {
    const options = mergePaymentMethodOptions(
      [
        {
          value: "credit_card",
          label: "Credit card",
          keywords: ["credit_card", "Credit card", "כרטיס אשראי"],
        },
      ],
      ["Credit card", "כרטיס אשראי", " CREDIT CARD "],
      "en",
    );

    expect(options.map((option) => option.value)).toEqual(["credit_card"]);
    expect(new Set(options.map((option) => option.value)).size).toBe(
      options.length,
    );
  });
});
