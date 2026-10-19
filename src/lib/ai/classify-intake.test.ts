import { describe, expect, it } from "vitest";
import { classifyIntent } from "./classify-intake";

describe("classifyIntent via the app re-export", () => {
  it("treats Hebrew maqaf as a space, same as String#replaceAll", () => {
    expect(classifyIntent("עזרה־בבקשה")).toBe("help");
    expect(classifyIntent("שלשום קניתי ספרים ב־120")).toBe("add_transaction");
  });
});
