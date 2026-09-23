import { getCalendarAdapter } from "./index.ts";

export interface IsraelYomTov {
  label: string;
}

const ISRAEL_YOM_TOV_BY_HEBREW_DATE: Readonly<Record<string, string>> = {
  "M01-1": "Rosh Hashana",
  "M01-2": "Rosh Hashana",
  "M01-10": "Yom Kippur",
  "M01-15": "Sukkot",
  "M01-22": "Shemini Atzeret",
  "M07-15": "Pesach",
  "M07-21": "Pesach",
  "M09-6": "Shavuot",
};

const hebrewCalendar = getCalendarAdapter("hebrew");

// Stage 5 uses Israel observance and civil dates only. Diaspora second days
// and sunset-based boundaries require location policy and remain out of scope.
export function getIsraelYomTov(isoDate: string): IsraelYomTov | null {
  const hebrewDate = hebrewCalendar.fromIsoDate(isoDate);
  const label =
    ISRAEL_YOM_TOV_BY_HEBREW_DATE[
      `${hebrewDate.monthCode}-${hebrewDate.day}`
    ];

  return label === undefined ? null : { label };
}
