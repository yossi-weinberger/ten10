import { describe, expect, it } from "vitest";
import { textIntakePayload } from "./text-intake-payload";

describe("textIntakePayload", () => {
  it("keeps a default-currency amount out of the conversion field", () => {
    const payload = textIntakePayload(
      { amount: 50, currency: "ILS", original_amount: null, description: "לחם" },
      { description: "לחם", amount: 50 },
    );

    expect(payload.extracted_amount).toBe(50);
    expect(payload.original_amount).toBeNull();
    expect(payload).not.toHaveProperty("duplicate_choice");
  });

  it("does not replace a converted original amount with the extracted one", () => {
    const payload = textIntakePayload(
      {
        amount: 180,
        currency: "ILS",
        original_amount: 50,
        original_currency: "USD",
        description: "bread",
      },
      { description: "bread", amount: 40 },
    );

    expect(payload.original_amount).toBe(50);
    expect(payload.extracted_amount).toBe(40);
  });
});