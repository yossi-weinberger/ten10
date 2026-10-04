import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCTION_SUPABASE_REF } from "../_shared/email-guard.ts";
import {
  parseForceDate,
  planReminderRun,
  resolveReminderCivilDate,
} from "./reminder-run-date.ts";

const PRODUCTION_URL = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
const TESTING_URL = "https://bbcllewcotypedqsnwmi.supabase.co";
const TODAY = "2026-07-01";

describe("parseForceDate", () => {
  it("accepts a valid YYYY-MM-DD Israel civil date", () => {
    expect(parseForceDate("2026-10-03")).toBe("2026-10-03");
    expect(parseForceDate(" 2026-10-06 ")).toBe("2026-10-06");
  });

  it("rejects invalid values", () => {
    expect(parseForceDate("2026-13-40")).toBeNull();
    expect(parseForceDate("10/03/2026")).toBeNull();
    expect(parseForceDate(20261003)).toBeNull();
  });
});

describe("resolveReminderCivilDate", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores forceDate in production and logs that it was ignored", () => {
    const resolution = resolveReminderCivilDate({
      forceDate: "2026-10-03",
      fallbackDate: TODAY,
      env: { get: (name) => (name === "SUPABASE_URL" ? PRODUCTION_URL : undefined) },
    });

    expect(resolution).toEqual({
      date: TODAY,
      forceDateApplied: false,
      forceDateIgnored: true,
      requestedForceDate: "2026-10-03",
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[REMINDER] forceDate ignored in production",
      { requestedForceDate: "2026-10-03" },
    );
  });

  it("uses forceDate in non-production", () => {
    const resolution = resolveReminderCivilDate({
      forceDate: "2026-10-06",
      fallbackDate: TODAY,
      env: { get: (name) => (name === "SUPABASE_URL" ? TESTING_URL : undefined) },
    });

    expect(resolution).toEqual({
      date: "2026-10-06",
      forceDateApplied: true,
      forceDateIgnored: false,
      requestedForceDate: "2026-10-06",
    });
  });
});

describe("planReminderRun with forceDate examples", () => {
  it("skips Shemini Atzeret plus Shabbat on 2026-10-03", () => {
    const plan = planReminderRun("2026-10-03");

    expect(plan.fallback).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
    });
    expect(plan.hebrew).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
    });
    expect(plan.dueCohorts).toEqual([]);
  });

  it("treats 2026-10-06 as Hebrew day 25 send-today", () => {
    const plan = planReminderRun("2026-10-06");

    expect(plan.hebrew).toEqual({
      kind: "send-today",
      reminderDay: 25,
    });
    expect(plan.dueCohorts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendarType: "hebrew",
          reminderDay: 25,
          resolution: { kind: "send-today", reminderDay: 25 },
        }),
      ]),
    );
  });

  it("makes up Hebrew day 15 after 15 Tishrei on 2026-09-27", () => {
    const plan = planReminderRun("2026-09-27");

    expect(plan.hebrew).toEqual({
      kind: "makeup",
      reason: "yom-tov-and-shabbat",
      reminderDate: "2026-09-26",
      reminderDay: 15,
    });
    expect(plan.dueCohorts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendarType: "hebrew",
          reminderDay: 15,
          resolution: {
            kind: "makeup",
            reason: "yom-tov-and-shabbat",
            reminderDate: "2026-09-26",
            reminderDay: 15,
          },
        }),
      ]),
    );
  });
});
