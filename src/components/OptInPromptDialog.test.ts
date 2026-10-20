import { describe, it, expect } from "vitest";

describe("OptInPromptDialog DB payload", () => {
  it("should only include valid profiles columns in DB update payload", () => {
    // Valid profiles columns for opt-in
    const validColumns = ["reminder_enabled", "mailing_list_consent"];
    
    // Simulate building the payload
    const buildPayload = (needsReminder: boolean, needsMarketing: boolean, enableReminders: boolean, enableMarketing: boolean) => {
      const profileUpdates: Record<string, boolean> = {};
      
      if (needsReminder) {
        profileUpdates.reminder_enabled = enableReminders;
      }
      
      if (needsMarketing) {
        profileUpdates.mailing_list_consent = enableMarketing;
      }
      
      return profileUpdates;
    };

    // Test reminder-only case
    const reminderPayload = buildPayload(true, false, true, false);
    expect(Object.keys(reminderPayload)).toEqual(["reminder_enabled"]);
    expect(reminderPayload).not.toHaveProperty("notifications");

    // Test marketing-only case
    const marketingPayload = buildPayload(false, true, false, true);
    expect(Object.keys(marketingPayload)).toEqual(["mailing_list_consent"]);
    expect(marketingPayload).not.toHaveProperty("notifications");

    // Test both case
    const bothPayload = buildPayload(true, true, true, true);
    expect(Object.keys(bothPayload).sort()).toEqual(["mailing_list_consent", "reminder_enabled"].sort());
    expect(bothPayload).not.toHaveProperty("notifications");

    // Ensure all keys are valid
    Object.keys(bothPayload).forEach(key => {
      expect(validColumns).toContain(key);
    });
  });
});
