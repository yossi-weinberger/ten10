import { beforeAll, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import transactions_en from "../../../public/locales/en/transactions.json";
import transactions_he from "../../../public/locales/he/transactions.json";
import { formatDataAnswer, type DataAnswerInput } from "./format-data-answer";

type ResourceBundleLoader = {
  addResourceBundle(lng: string, ns: string, resources: object, deep: boolean, overwrite: boolean): void;
};

beforeAll(() => {
  const loader = i18n as unknown as ResourceBundleLoader;
  loader.addResourceBundle("en", "transactions", transactions_en, true, true);
  loader.addResourceBundle("he", "transactions", transactions_he, true, true);
});

function answer(overrides: Partial<DataAnswerInput>): string {
  return formatDataAnswer({
    measure: "sum",
    count: 3,
    year: "בתשפ״ו",
    type: "donation",
    amount: "1,200 ₪",
    paymentMethod: null,
    recipient: null,
    category: null,
    language: "he",
    ...overrides,
  });
}

describe("formatDataAnswer", () => {
  it("names the recipient inside each Hebrew count, including the dual", () => {
    expect(answer({ count: 1, measure: "sum", recipient: "כולל ערב" })).toBe(
      "בתשפ״ו נשמרה תרומה אחת ל«כולל ערב» בסך 1,200 ₪.",
    );
    expect(answer({ count: 2, measure: "sum", recipient: "כולל ערב" })).toBe(
      "בתשפ״ו נשמרו שתי תרומות ל«כולל ערב» בסך 1,200 ₪.",
    );
    expect(answer({ count: 3, measure: "sum", recipient: "כולל ערב" })).toBe(
      "בתשפ״ו נשמרו 3 תרומות ל«כולל ערב» בסך 1,200 ₪.",
    );
    expect(answer({ count: 0, measure: "max", recipient: "כולל ערב" })).toBe(
      "בתשפ״ו לא נמצאו תרומות ל«כולל ערב» שנשמרו.",
    );
  });

  it("shows a predefined category by its label", () => {
    const hebrew = answer({ type: "expense", category: "food" });
    expect(hebrew).toBe("בתשפ״ו נשמרו 3 הוצאות בסך 1,200 ₪ (מזון).");
    expect(hebrew).not.toContain("(food)");
    expect(answer({ type: "expense", category: "גן" })).toBe(
      "בתשפ״ו נשמרו 3 הוצאות בסך 1,200 ₪ (גן).",
    );
    expect(answer({
      language: "en",
      year: "2025",
      type: "expense",
      amount: "₪20",
      category: "food",
    })).toBe("In 2025, 3 saved expense transactions total ₪20 (Food).");
  });

  it("keeps the payment method beside the sentence", () => {
    expect(answer({ type: "expense", paymentMethod: "cash" })).toBe(
      "בתשפ״ו נשמרו 3 הוצאות בסך 1,200 ₪ (מזומן).",
    );
    expect(answer({
      language: "en",
      year: "2025",
      type: "expense",
      amount: "₪20",
      count: 1,
      paymentMethod: "cash",
    })).toBe("In 2025, 1 saved expense transaction totals ₪20 (Cash).");
  });

  it("names a recipient in English for one and for several", () => {
    expect(answer({
      language: "en",
      year: "2025",
      amount: "₪1,200",
      count: 1,
      recipient: "כולל ערב",
    })).toBe('In 2025, 1 saved donation transaction to "כולל ערב" totals ₪1,200.');
    expect(answer({
      language: "en",
      year: "2025",
      amount: "₪1,200",
      count: 2,
      recipient: "כולל ערב",
    })).toBe('In 2025, 2 saved donation transactions to "כולל ערב" total ₪1,200.');
    expect(answer({
      language: "en",
      year: "2025",
      amount: "₪1,200",
      count: 0,
      measure: "max",
      recipient: "כולל ערב",
    })).toBe('In 2025 no saved donation transactions to "כולל ערב" were found.');
  });
});
