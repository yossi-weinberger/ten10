import { HDate, HebrewCalendar, Location, Event } from "@hebcal/core";

// מיקום ברירת מחדל - ירושלים
const defaultLocation = new Location(31.7767, 35.2345, true, "Asia/Jerusalem");

export function getHebrewDate(date: Date): string {
  const hDate = new HDate(date);
  return `${hDate.getDate()}`;
}

export function getHebrewMonth(date: Date): string {
  const hDate = new HDate(date);
  // Assuming default locale or HDate constructor sets it appropriately for Hebrew month name
  return hDate.getMonthName();
}

export function getHebrewYear(date: Date): number {
  const hDate = new HDate(date);
  return hDate.getFullYear();
}

export function formatHebrewDate(date: Date): string {
  const hDate = new HDate(date);
  // Assuming default locale or HDate constructor sets it appropriately for Hebrew month name
  return `${hDate.getDate()} ${hDate.getMonthName()}`;
}

export function formatHebrewDateWithYear(date: Date): string {
  const hDate = new HDate(date);
  // Assuming default locale or HDate constructor sets it appropriately for Hebrew month name
  return `${hDate.getDate()} ${hDate.getMonthName()} ${hDate.getFullYear()}`;
}

export function getParasha(date: Date): string {
  const events = HebrewCalendar.getHolidaysOnDate(
    new HDate(date),
    defaultLocation.getIsrael() // Use getIsrael() method
  );
  if (!events) return ""; // Check if events is undefined
  const parasha = events.find((ev: Event) => ev.render("he").includes("פרשת"));
  return parasha ? parasha.render("he") : "";
}

export function isJewishHoliday(date: Date): boolean {
  const events = HebrewCalendar.getHolidaysOnDate(
    new HDate(date),
    defaultLocation.getIsrael() // Use getIsrael() method
  );
  return !!events && events.length > 0; // Check if events is truthy before accessing length
}

export function getHolidays(date: Date): string[] {
  const events = HebrewCalendar.getHolidaysOnDate(
    new HDate(date),
    defaultLocation.getIsrael() // Use getIsrael() method
  );
  if (!events) return []; // Check if events is undefined
  return events.map((ev: Event) => ev.render("he"));
}

export function convertToHebrewDate(gregorianDate: Date): string {
  return formatHebrewDate(gregorianDate);
}

export function convertToGregorianDate(
  year: number,
  month: string, // Assuming this is a Hebrew month name string e.g., "ניסן"
  day: number
): Date {
  const monthNum = HDate.monthFromName(month); // Use static HDate.monthFromName
  if (monthNum === -1) throw new Error("חודש לא תקין");
  // Note: HDate constructor month is 1-based (1=Nisan, 7=Tishrei)
  // HDate.monthFromName might return a different scheme or handle Adar/Adar II, needs verification.
  // For now, assuming monthNum from HDate.monthFromName is compatible.
  return new HDate(day, monthNum, year).greg();
}
