import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { he, enUS } from "date-fns/locale";
import { formatHebrewDate } from "@/lib/utils/hebrew-date";
import { useDonationStore } from "@/lib/store";
import { HDate } from "@hebcal/core";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  triggerButton?: React.ReactNode;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  triggerButton,
}: DatePickerWithRangeProps) {
  const settings = useDonationStore((state) => state.settings);
  const { i18n, t } = useTranslation("dashboard");
  // Use local state to manage range selection
  const [localRange, setLocalRange] = React.useState<DateRange | undefined>(
    date
  );
  const [month, setMonth] = React.useState<Date | undefined>(date?.from);
  const [open, setOpen] = React.useState(false);

  // Helper to check if two dates are the same day
  const isSameDay = (a?: Date, b?: Date) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  // Track if we should reset on next click (after opening with complete range)
  const shouldResetOnNextClickRef = React.useRef(false);
  const lastPropDateRef = React.useRef(date);

  // Sync local state with prop when prop changes externally (but not when we're managing it internally)
  React.useEffect(() => {
    // Only sync if the prop actually changed (different reference or values)
    const propChanged =
      lastPropDateRef.current?.from?.getTime() !== date?.from?.getTime() ||
      lastPropDateRef.current?.to?.getTime() !== date?.to?.getTime();

    if (propChanged) {
      setLocalRange(date);
      setMonth(date?.from);
      lastPropDateRef.current = date;
      shouldResetOnNextClickRef.current = false;
    }
  }, [date]);

  const handleDateChange = (range: DateRange | undefined) => {
    const previousRange = localRange;

    // If we need to reset (opened with complete range), treat first click as new 'from'
    if (shouldResetOnNextClickRef.current) {
      if (range?.from) {
        // User clicked a date - start fresh with this as 'from'
        const freshRange: DateRange = { from: range.from, to: undefined };
        setLocalRange(freshRange);
        shouldResetOnNextClickRef.current = false;
        return;
      }
    }

    // If we had a complete range (from different days, not same day) and now react-day-picker
    // is trying to update 'to' (same 'from', new 'to'), intercept and start fresh
    if (
      previousRange?.from &&
      previousRange?.to &&
      range?.from &&
      range?.to &&
      !isSameDay(previousRange.from, previousRange.to) // Only if it was a real range, not first click
    ) {
      const dayInMs = 24 * 60 * 60 * 1000;
      const prevFromDay = Math.floor(previousRange.from.getTime() / dayInMs);
      const newFromDay = Math.floor(range.from.getTime() / dayInMs);

      // If 'from' stayed the same, react-day-picker is just updating 'to'
      // Start fresh with the clicked date (now in 'to') as new 'from'
      if (prevFromDay === newFromDay) {
        const freshRange: DateRange = { from: range.to, to: undefined };
        setLocalRange(freshRange);
        return;
      }
    }

    // Normal flow: update local range
    setLocalRange(range);

    // Check if we're completing a range
    // Incomplete = had only 'from', OR had 'from' and 'to' but they're the same day
    const wasIncompleteRange =
      previousRange?.from &&
      (!previousRange?.to || isSameDay(previousRange.from, previousRange.to));
    const isCompleteRange = !!(
      range?.from &&
      range?.to &&
      !isSameDay(range.from, range.to)
    );

    // Update parent component
    onDateChange(range);

    // Close popover only when completing a range (second click with different days)
    if (wasIncompleteRange && isCompleteRange && range?.from && range?.to) {
      // isCompleteRange already checks they're different days, so we can close
      setOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      return formatHebrewDate(date);
    }
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(date, "dd/MM/yyyy", { locale: currentLocale });
  };

  const formatCaption = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      // Include month number with month name for Hebrew calendar
      const monthNumber = hDate.getMonth() + 1; // HDate months are 0-based
      return `${monthNumber}. ${hDate.getMonthName()} ${hDate.getFullYear()}`;
    }
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    // Format: "MonthName MonthNumber Year" (e.g., "January 1 2024" or "ינואר 1 2024")
    const monthName = format(date, "LLLL", { locale: currentLocale });
    const monthNumber = date.getMonth() + 1; // JavaScript months are 0-based
    const year = date.getFullYear();
    return `${monthName} ${monthNumber} ${year}`;
  };

  const formatWeekday = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
      return days[date.getDay()];
    }
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(date, "EEEEEE", { locale: currentLocale });
  };

  const formatDay = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      return String(hDate.getDate());
    }
    return format(date, "d");
  };

  // Format month name for dropdown (used when captionLayout="dropdown")
  const formatMonthDropdown = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      const monthNumber = hDate.getMonth() + 1;
      return `${monthNumber}. ${hDate.getMonthName()}`;
    }
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    const monthName = format(date, "LLLL", { locale: currentLocale });
    const monthNumber = date.getMonth() + 1;
    return `${monthName} ${monthNumber}`;
  };

  // Format year for dropdown
  const formatYearDropdown = (date: Date) => {
    return date.getFullYear().toString();
  };

  // Reset range when opening popover if we have a complete range
  // This allows starting fresh selection instead of just updating 'to'
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && localRange?.from && localRange?.to) {
      // When opening with a complete range, mark that we should reset on next click
      // React-day-picker's default behavior: if there's a complete range,
      // clicking only updates 'to'. We'll intercept the first click and reset.
      shouldResetOnNextClickRef.current = true;
      // Also clear the selection visually (but keep it in state for display)
      // The actual reset will happen on first click
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {triggerButton || (
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-right font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {formatDate(date.from)} - {formatDate(date.to)}
                  </>
                ) : (
                  formatDate(date.from)
                )
              ) : (
                <span>{t("datePicker.selectDateRange")}</span>
              )}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            month={month}
            onMonthChange={setMonth}
            selected={
              shouldResetOnNextClickRef.current ? undefined : localRange
            }
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={i18n.language === "he" ? he : enUS}
            captionLayout="dropdown"
            fromYear={1960}
            toYear={new Date().getFullYear() + 5}
            formatters={{
              formatCaption,
              formatDay,
              formatWeekdayName: formatWeekday,
              formatMonthDropdown,
              formatYearDropdown,
            }}
            classNames={{
              caption: "text-right font-bold",
              nav_button_previous: "!right-auto !left-1",
              nav_button_next: "!left-auto !right-1",
              head_cell: "text-right font-normal text-muted-foreground",
              cell: "text-right [&:has([aria-selected])]:bg-primary [&:has([aria-selected].day-range-end)]:rounded-l-md [&:has([aria-selected].day-range-start)]:rounded-r-md first:[&:has([aria-selected])]:rounded-r-md last:[&:has([aria-selected])]:rounded-l-md",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
