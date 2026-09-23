import type { Settings } from "@/lib/store";

export function sanitizeClientPreferences(
  settings: Partial<Settings>,
): Partial<Settings> {
  return {
    ...(settings.theme !== undefined && { theme: settings.theme }),
    ...(settings.language !== undefined && { language: settings.language }),
    ...(settings.notifications !== undefined && {
      notifications: settings.notifications,
    }),
    ...(settings.autoCalcChomesh !== undefined && {
      autoCalcChomesh: settings.autoCalcChomesh,
    }),
    ...(settings.trackChomeshSeparately !== undefined && {
      trackChomeshSeparately: settings.trackChomeshSeparately,
    }),
    ...(settings.recurringDonations !== undefined && {
      recurringDonations: settings.recurringDonations,
    }),
    ...(settings.minMaaserPercentage !== undefined && {
      minMaaserPercentage: settings.minMaaserPercentage,
    }),
    ...(settings.autoLockTimeoutMinutes !== undefined && {
      autoLockTimeoutMinutes: settings.autoLockTimeoutMinutes,
    }),
    ...(settings.onboarding !== undefined && {
      onboarding: settings.onboarding,
    }),
  };
}
