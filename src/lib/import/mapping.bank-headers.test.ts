import { describe, expect, it } from "vitest";
import { suggestMappings, validateMappings } from "./mapping";

/** Published header sets from the Researcher brief (synthetic probes only). */
const RESEARCHER_HEADER_SETS: Record<string, string[]> = {
  max: [
    "תאריך עסקה",
    "שם בית העסק",
    "קטגוריה",
    "4 ספרות אחרונות של כרטיס האשראי",
    "סוג עסקה",
    "סכום חיוב",
    "מטבע חיוב",
    "סכום עסקה מקורי",
    "מטבע עסקה מקורי",
    "תאריך חיוב",
    "הערות",
    "תיוגים",
    "מועדון הנחות",
    "מפתח דיסקונט",
    "אופן ביצוע ההעסקה",
    'שער המרה ממטבע מקור/התחשבנות לש"ח',
  ],
  isracard: [
    "תאריך רכישה",
    "שם בית עסק",
    "סכום עסקה",
    "מטבע עסקה",
    "סכום חיוב",
    "מטבע חיוב",
    "מס' שובר",
    "פירוט נוסף",
  ],
  cal: [
    "תאריך עסקה",
    "שם בית עסק",
    "סכום עסקה",
    "סכום חיוב",
    "סוג עסקה",
    "ענף",
    "הערות",
  ],
  discountOsh: [
    "תאריך",
    "יום ערך",
    "תיאור התנועה",
    "₪ זכות/חובה",
    "₪ יתרה",
    "אסמכתה",
    "עמלה",
    "ערוץ ביצוע",
  ],
  leumi: [
    "תאריך",
    "תאריך ערך",
    "תיאור",
    "אסמכתא",
    "בחובה",
    "בזכות",
    'היתרה בש"ח',
    "תאור מורחב",
  ],
  hapoalim: [
    "תאריך",
    "הפעולה",
    "פרטים",
    "אסמכתא",
    "חובה",
    "זכות",
    "יתרה בש''ח",
    "תאריך ערך",
  ],
  mizrahi: [
    "תאריך",
    "תאריך ערך",
    "סוג תנועה",
    "זכות",
    "חובה",
    'יתרה בש"ח',
    "אסמכתא",
  ],
  calViaDiscount: [
    "כרטיס",
    "בית עסק",
    "תאריך עסקה",
    "סכום העסקה",
    "מנפיק",
    "סוג העסקה",
    "פירוט",
    "תאריך החיוב",
    "סכום החיוב",
    "כרטיס הוצג במעמד העסקה?",
    "מטבע העסקה",
    "שער ההמרה",
    "תאריך שער המרה",
    "עמלת ההמרה",
    "מדד בסיס",
    "שם המועדון",
    "אחוז הנחה",
    "סכום הנחה",
  ],
};

function mappedPairs(headers: string[]) {
  return suggestMappings(headers)
    .filter((mapping) => mapping.targetField !== null)
    .map((mapping) => `${mapping.sourceColumn}→${mapping.targetField}`);
}

describe("suggestMappings Israeli bank/card header sets", () => {
  it("does not map מטבע חיוב to debit", () => {
    const mappings = suggestMappings(["סכום חיוב", "מטבע חיוב", "תאריך עסקה"]);
    expect(mappings.find((m) => m.sourceColumn === "מטבע חיוב")?.targetField).toBe(
      "currency",
    );
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "amount",
    );
    expect(validateMappings(mappings).valid).toBe(true);
  });

  it("prefers תאריך over תאריך ערך", () => {
    const mappings = suggestMappings(["תאריך", "תאריך ערך", "בחובה", "בזכות"]);
    expect(mappings.find((m) => m.sourceColumn === "תאריך")?.targetField).toBe("date");
    expect(mappings.find((m) => m.sourceColumn === "תאריך ערך")?.targetField).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);
  });

  it("keeps a single amount when סכום עסקה and סכום חיוב both appear", () => {
    const mappings = suggestMappings([
      "תאריך עסקה",
      "שם בית עסק",
      "סכום עסקה",
      "סכום חיוב",
    ]);
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "amount",
    );
    expect(mappings.find((m) => m.sourceColumn === "סכום עסקה")?.targetField).toBeNull();
    expect(validateMappings(mappings).errors).not.toContain("duplicateTarget");
    expect(validateMappings(mappings).errors).not.toContain("amountAndDebitCredit");
    expect(validateMappings(mappings).valid).toBe(true);
  });

  it("prefers מטבע לחיוב over מטבע מקור when amount is סכום חיוב", () => {
    const mappings = suggestMappings([
      "תאריך רכישה",
      "שם בית עסק",
      "סכום עסקה",
      "מטבע מקור",
      "סכום חיוב",
      "מטבע לחיוב",
    ]);
    expect(mappings.find((m) => m.sourceColumn === "סכום חיוב")?.targetField).toBe(
      "amount",
    );
    expect(mappings.find((m) => m.sourceColumn === "מטבע לחיוב")?.targetField).toBe(
      "currency",
    );
    expect(mappings.find((m) => m.sourceColumn === "מטבע מקור")?.targetField).toBeNull();
    expect(validateMappings(mappings).valid).toBe(true);
  });

  it("keeps מטבע מקור when it is the only currency column", () => {
    const mappings = suggestMappings([
      "תאריך רכישה",
      "שם בית עסק",
      "סכום חיוב",
      "מטבע מקור",
    ]);
    expect(mappings.find((m) => m.sourceColumn === "מטבע מקור")?.targetField).toBe(
      "currency",
    );
    expect(validateMappings(mappings).valid).toBe(true);
  });

  it("recognises Mizrahi תאור as description", () => {
    const mappings = suggestMappings(["תאריך", "תאור", "זכות", "חובה"]);
    expect(mappings.find((m) => m.sourceColumn === "תאור")?.targetField).toBe(
      "description",
    );
  });

  it.each(Object.entries(RESEARCHER_HEADER_SETS))(
    "auto-maps %s without blocking required fields",
    (name, headers) => {
      const mappings = suggestMappings(headers);
      const validation = validateMappings(mappings);
      expect(validation.errors, `${name}: ${mappedPairs(headers).join(", ")}`).not.toContain(
        "duplicateTarget",
      );
      expect(validation.errors, `${name}: ${mappedPairs(headers).join(", ")}`).not.toContain(
        "amountAndDebitCredit",
      );
      expect(validation.errors).not.toContain("dateMissing");
      expect(validation.errors).not.toContain("amountMissing");
      expect(validation.valid, `${name}: ${mappedPairs(headers).join(", ")}`).toBe(true);
    },
  );
});
