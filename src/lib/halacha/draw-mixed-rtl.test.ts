import { describe, expect, it } from "vitest";
import {
  layoutMixedRtlRuns,
  measureMixedText,
  mirrorRtlMarks,
  tokenizeMixedRuns,
} from "./draw-mixed-rtl";

describe("tokenizeMixedRuns", () => {
  it("keeps Ten10, URLs, emails, and percents as LTR runs", () => {
    const runs = tokenizeMixedRuns(
      "הודפס מתוך Ten10 https://ten10-app.com/landing contact@ten10-app.com 20%"
    );
    const ltr = runs.filter((run) => run.ltr).map((run) => run.text);
    expect(ltr).toEqual([
      "Ten10",
      "https://ten10-app.com/landing",
      "contact@ten10-app.com",
      "20%",
    ]);
  });

  it("keeps a bare domain and path as one LTR run", () => {
    const runs = tokenizeMixedRuns("לפרטים: ten10-app.com/landing");
    expect(runs.filter((run) => run.ltr).map((run) => run.text)).toEqual([
      "ten10-app.com/landing",
    ]);
  });

  it("does not reverse Hebrew parentheses", () => {
    const runs = tokenizeMixedRuns("(מלאכי ג', י')");
    expect(runs).toEqual([{ text: "(מלאכי ג', י')", ltr: false }]);
  });

  it("keeps a date number as its own LTR run", () => {
    const runs = tokenizeMixedRuns("הודפס ב-26 באוגוסט 2026");
    expect(runs.map((run) => run.text)).toEqual([
      "הודפס ב-",
      "26",
      " באוגוסט ",
      "2026",
    ]);
    expect(runs.map((run) => run.ltr)).toEqual([false, true, false, true]);
  });
});

describe("measureMixedText", () => {
  it("sums run widths", () => {
    expect(measureMixedText("ab cd", (value) => value.length)).toBe(5);
  });
});

describe("layoutMixedRtlRuns", () => {
  it("does not flip a bare landing URL", () => {
    const placed = layoutMixedRtlRuns(
      "לפרטים: ten10-app.com/landing",
      (value) => value.length,
      80
    );
    expect(placed.map((run) => run.text)).toEqual([
      "ten10-app.com/landing",
      "לפרטים: ",
    ]);
  });

  it("places the first logical run on the right without reversing Latin", () => {
    const placed = layoutMixedRtlRuns("מתוך Ten10", (value) => value.length, 100);
    expect(placed.map((run) => run.text)).toEqual(["Ten10", "מתוך "]);
    expect(placed[0]?.ltr).toBe(true);
    expect(placed.at(-1)?.text).toBe("מתוך ");
  });

  it("mirrors parentheses in Hebrew runs so they open from the right", () => {
    expect(mirrorRtlMarks("(אוכל, שכר דירה)")).toBe(")אוכל, שכר דירה(");
    const placed = layoutMixedRtlRuns("(אוכל, שכר דירה)", (value) => value.length, 40);
    expect(placed.map((run) => run.text).join("")).toBe(")אוכל, שכר דירה(");
  });

  it("keeps a date readable from the right", () => {
    const placed = layoutMixedRtlRuns(
      "הודפס ב-26 באוגוסט 2026",
      (value) => value.length,
      80
    );
    expect(placed.map((run) => run.text).join("")).toBe(
      "2026 באוגוסט 26הודפס ב-"
    );
    expect(placed.at(-1)?.text).toBe("הודפס ב-");
  });
});
