import { describe, expect, it } from "vitest";
import { suggestMappings, validateMappings } from "./mapping";

describe("suggestMappings Hebrew export column", () => {
  it("does not map the Hebrew date column onto the Gregorian date field", () => {
    const mappings = suggestMappings(["תאריך", "תאריך עברי", "סכום"]);
    const validation = validateMappings(mappings);

    expect(mappings.find((mapping) => mapping.sourceColumn === "תאריך")?.targetField).toBe("date");
    expect(mappings.find((mapping) => mapping.sourceColumn === "תאריך עברי")?.targetField).toBeNull();
    expect(suggestMappings(["תאריך עסקה"])[0]?.targetField).toBe("date");
    expect(validation.errors).not.toContain("duplicateTarget");
  });

  it("does not map the English Hebrew Date column onto date", () => {
    const mappings = suggestMappings(["Date", "Hebrew Date", "Amount"]);

    expect(mappings.find((mapping) => mapping.sourceColumn === "Date")?.targetField).toBe("date");
    expect(mappings.find((mapping) => mapping.sourceColumn === "Hebrew Date")?.targetField).toBeNull();
    expect(mappings.find((mapping) => mapping.sourceColumn === "Amount")?.targetField).toBe("amount");
    expect(validateMappings(mappings).errors).not.toContain("duplicateTarget");
  });
});
