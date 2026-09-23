import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationSettingsCard } from "./NotificationSettingsCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

describe("NotificationSettingsCard", () => {
  it("renders an explicit reminder calendar selector and calendar-aware day label", () => {
    const markup = renderToStaticMarkup(
      <NotificationSettingsCard
        notificationSettings={{
          notifications: true,
          recurringDonations: true,
          reminderEnabled: true,
          reminderDayOfMonth: 10,
          reminderCalendarType: "hebrew",
          mailingListConsent: true,
        }}
        updateSettings={vi.fn()}
      />,
    );

    expect(markup).toContain("notifications.reminderCalendarLabel");
    expect(markup).toContain("notifications.calendarOptions.hebrew");
    expect(markup).toContain("notifications.hebrewDay10");
  });

  it("does not derive reminder calendar from the display calendar", () => {
    const markup = renderToStaticMarkup(
      <NotificationSettingsCard
        notificationSettings={{
          notifications: true,
          recurringDonations: true,
          reminderEnabled: true,
          reminderDayOfMonth: 5,
          reminderCalendarType: "gregorian",
          mailingListConsent: true,
        }}
        updateSettings={vi.fn()}
      />,
    );

    expect(markup).toContain("notifications.calendarOptions.gregorian");
    expect(markup).toContain("notifications.day5");
    expect(markup).not.toContain("notifications.hebrewDay5");
  });
});
