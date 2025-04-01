import { HDate, months, HebrewCalendar, Location } from '@hebcal/core';

// מיקום ברירת מחדל - ירושלים
const defaultLocation = new Location(31.7767, 35.2345, true, 'Asia/Jerusalem');

export function getHebrewDate(date: Date): string {
  const hDate = new HDate(date);
  return `${hDate.getDate()}`;
}

export function getHebrewMonth(date: Date): string {
  const hDate = new HDate(date);
  return hDate.getMonthName('h');
}

export function getHebrewYear(date: Date): number {
  const hDate = new HDate(date);
  return hDate.getFullYear();
}

export function formatHebrewDate(date: Date): string {
  const hDate = new HDate(date);
  return `${hDate.getDate()} ${hDate.getMonthName('h')}`;
}

export function formatHebrewDateWithYear(date: Date): string {
  const hDate = new HDate(date);
  return `${hDate.getDate()} ${hDate.getMonthName('h')} ${hDate.getFullYear()}`;
}

export function getParasha(date: Date): string {
  const events = HebrewCalendar.getHolidaysOnDate(new HDate(date), defaultLocation);
  const parasha = events.find(ev => ev.getDesc('h').includes('פרשת'));
  return parasha ? parasha.getDesc('h') : '';
}

export function isJewishHoliday(date: Date): boolean {
  const events = HebrewCalendar.getHolidaysOnDate(new HDate(date), defaultLocation);
  return events.length > 0;
}

export function getHolidays(date: Date): string[] {
  const events = HebrewCalendar.getHolidaysOnDate(new HDate(date), defaultLocation);
  return events.map(ev => ev.getDesc('h'));
}

export function convertToHebrewDate(gregorianDate: Date): string {
  return formatHebrewDate(gregorianDate);
}

export function convertToGregorianDate(year: number, month: string, day: number): Date {
  const hDate = new HDate(day, 1, year); // חודש זמני
  const monthNum = hDate.getMonthObject().getMonthNumberFromName(month);
  if (monthNum === -1) throw new Error('חודש לא תקין');
  
  return new HDate(day, monthNum, year).greg();
}