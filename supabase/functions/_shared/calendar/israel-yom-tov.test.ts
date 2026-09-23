import { describe, expect, it } from "vitest";
import { getIsraelYomTov } from "./israel-yom-tov.ts";

describe("getIsraelYomTov", () => {
  it.each([
    ["2026-09-12", "Rosh Hashana"],
    ["2026-09-13", "Rosh Hashana"],
    ["2026-09-21", "Yom Kippur"],
    ["2026-09-26", "Sukkot"],
    ["2026-10-03", "Shemini Atzeret"],
    ["2027-04-22", "Pesach"],
    ["2027-04-28", "Pesach"],
    ["2027-06-11", "Shavuot"],
  ] as const)(
    "identifies 5787 Israel Yom Tov on %s",
    (isoDate, label) => {
      expect(getIsraelYomTov(isoDate)).toEqual({ label });
    },
  );

  it("identifies Yom Tov in a simple Hebrew year", () => {
    expect(getIsraelYomTov("2028-04-11")).toEqual({ label: "Pesach" });
  });

  it.each([
    "2026-09-22",
    "2026-09-27",
    "2027-03-23",
    "2027-04-23",
    "2027-04-21",
    "2027-01-01",
  ])("does not block ordinary, Chol HaMoed, Purim, or Erev dates: %s", (isoDate) => {
    expect(getIsraelYomTov(isoDate)).toBeNull();
  });
});
