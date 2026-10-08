import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { he, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDisplayDate } from "@/lib/calendar/display-date";
import { useDonationStore } from "@/lib/store";
import {
  formatLocalDate,
  getCalendarNavigationBounds,
} from "@/lib/utils/local-date";
import { minTransactionDateLocal } from "@/lib/utils/transaction-date";
import { Input } from "./input";
import { parseExactGregorianDateInput } from "./gregorian-date-input";

export function DatePicker({
  date,
  setDate,
  minDate = minTransactionDateLocal(),
}: {
  date?: Date;
  setDate: (date?: Date) => void;
  minDate?: Date;
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [minDateError, setMinDateError] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const { t, i18n } = useTranslation(["dashboard", "transactions"]);
  const yearBounds = getCalendarNavigationBounds();
  const calendarType = useDonationStore(
    (state) => state.settings.calendarType,
  );
  const language = i18n.language.startsWith("he") ? "he" : "en";

  const formatFieldDate = React.useCallback(
    (value: Date): string => {
      if (calendarType === "hebrew") {
        return formatDisplayDate(formatLocalDate(value), {
          calendarType: "hebrew",
          showSecondaryDate: false,
          language,
          style: "long",
        }).primary;
      }

      return format(value, "dd/MM/yyyy");
    },
    [calendarType, language],
  );

  React.useEffect(() => {
    if (date && isValidDate(date)) {
      setInputValue(formatFieldDate(date));
      if (date >= minDate) {
        setMinDateError(null);
      }
    } else {
      setInputValue("");
    }
    setMonth(date);
  }, [date, formatFieldDate, minDate]);

  function isValidDate(d: unknown): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (calendarType === "hebrew") return;
    const value = e.target.value;
    setInputValue(value);
    const parsedDate = parseExactGregorianDateInput(value);
    if (parsedDate && parsedDate >= minDate) {
      setMinDateError(null);
      setDate(parsedDate);
      setMonth(parsedDate);
    } else if (parsedDate) {
      setMinDateError(t("transactions:transactionForm.validation.date.min"));
    } else if (value === "") {
      setMinDateError(null);
      setDate(undefined);
    } else {
      setMinDateError(null);
    }
  };

  const handleSelectDate = (selectedDate: Date | undefined) => {
    if (isValidDate(selectedDate) && selectedDate >= minDate) {
      setMinDateError(null);
      setDate(selectedDate);
      setInputValue(formatFieldDate(selectedDate));
    } else if (isValidDate(selectedDate)) {
      setMinDateError(t("transactions:transactionForm.validation.date.min"));
    } else {
      setMinDateError(null);
      setDate(undefined);
      setInputValue("");
    }
    setOpen(false);
  };

  const formatCaption = (date: Date) => {
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    // Format: "MonthName MonthNumber Year" (e.g., "January 1 2024" or "ינואר 1 2024")
    const monthName = format(date, "LLLL", { locale: currentLocale });
    const monthNumber = date.getMonth() + 1; // JavaScript months are 0-based
    const year = date.getFullYear();
    return `${monthName} ${monthNumber} ${year}`;
  };

  const formatWeekday = (date: Date) => {
    // Use i18n language for locale selection
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(date, "EEEEEE", { locale: currentLocale });
  };

  const formatDay = (date: Date) => {
    return format(date, "d");
  };

  // Format month name for dropdown (used when captionLayout="dropdown")
  const formatMonthDropdown = (date: Date) => {
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

  const picker = (
    <div className="relative">
      <Input
        placeholder={calendarType === "hebrew" ? "" : "DD/MM/YYYY"}
        value={inputValue}
        onChange={handleInputChange}
        readOnly={calendarType === "hebrew"}
        className="bg-background pr-10"
        aria-invalid={minDateError ? true : undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="absolute top-1/2 right-2 size-7 -translate-y-1/2 p-0"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="sr-only">Open calendar</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            required
            selected={date}
            onSelect={handleSelectDate}
            month={month}
            onMonthChange={setMonth}
            initialFocus
            captionLayout="dropdown"
            startMonth={
              yearBounds.startMonth > minDate ? yearBounds.startMonth : minDate
            }
            endMonth={yearBounds.endMonth}
            disabled={{ before: minDate }}
            dir={i18n.dir()}
            locale={i18n.language === "he" ? he : enUS}
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

  return (
    <div>
      {picker}
      {minDateError ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {minDateError}
        </p>
      ) : null}
    </div>
  );
}
