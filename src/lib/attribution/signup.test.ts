import { describe, expect, it } from "vitest";
import { buildEmailSignupPayload } from "./signup";
import type { FirstTouchAttribution } from "./capture";

const machonTouch: FirstTouchAttribution = {
  code: "MACHON",
  utm: {
    utm_source: "institute",
    utm_medium: "email",
    utm_campaign: "update_2026",
  },
  capturedAt: "2026-10-19T07:00:00.000Z",
};

describe("buildEmailSignupPayload", () => {
  it("includes a valid arrival code and first-touch UTM", () => {
    const payload = buildEmailSignupPayload({
      fullName: "  ישראל ישראלי  ",
      mailingListConsent: true,
      arrivalCode: "machon",
      firstTouch: machonTouch,
      now: new Date("2026-10-19T08:00:00.000Z"),
    });

    expect(payload.authMetadata).toEqual({
      full_name: "ישראל ישראלי",
      arrival_code: "MACHON",
      signup_utm: machonTouch.utm,
    });
    expect(payload.profileUpdate).toEqual({
      full_name: "ישראל ישראלי",
      mailing_list_consent: true,
    });
    expect(payload.attributionUpdate).toEqual({
      arrival_code: "MACHON",
      signup_utm: machonTouch.utm,
      arrival_code_set_at: "2026-10-19T08:00:00.000Z",
    });
  });

  it("omits attribution when the code is missing or invalid", () => {
    const missing = buildEmailSignupPayload({
      fullName: "Ada",
      mailingListConsent: false,
      arrivalCode: "   ",
      firstTouch: machonTouch,
    });
    expect(missing.authMetadata).toEqual({ full_name: "Ada" });
    expect(missing.attributionUpdate).toBeNull();

    const invalid = buildEmailSignupPayload({
      fullName: "Ada",
      mailingListConsent: false,
      arrivalCode: "not valid!",
      firstTouch: machonTouch,
    });
    expect(invalid.authMetadata).toEqual({ full_name: "Ada" });
    expect(invalid.attributionUpdate).toBeNull();
    expect(invalid.profileUpdate).toEqual({
      full_name: "Ada",
      mailing_list_consent: false,
    });
  });

  it("saves a custom valid code without requiring UTM", () => {
    const payload = buildEmailSignupPayload({
      fullName: "Ada",
      mailingListConsent: false,
      arrivalCode: "LOCAL_PAPER",
      firstTouch: null,
      now: new Date("2026-10-19T08:00:00.000Z"),
    });
    expect(payload.authMetadata).toEqual({
      full_name: "Ada",
      arrival_code: "LOCAL_PAPER",
    });
    expect(payload.attributionUpdate).toEqual({
      arrival_code: "LOCAL_PAPER",
      signup_utm: null,
      arrival_code_set_at: "2026-10-19T08:00:00.000Z",
    });
  });
});
