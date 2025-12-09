import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { he, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useDonationStore } from "@/lib/store";
import { HDate } from "@hebcal/core";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "./input";

export function DatePicker({
  date,
  setDate,
}: {
  date?: Date;
  setDate: (date?: Date) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const { i18n } = useTranslation();
  const settings = useDonationStore((state) => state.settings);

  React.useEffect(() => {
    if (date && isValidDate(date)) {
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
    setMonth(date);
  }, [date]);

  function isValidDate(d: unknown): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const parsedDate = parse(value, "dd/MM/yyyy", new Date());
    if (isValidDate(parsedDate)) {
      setDate(parsedDate);
      setMonth(parsedDate);
    } else if (value === "") {
      setDate(undefined);
    }
  };

  const handleSelectDate = (selectedDate: Date | undefined) => {
    if (isValidDate(selectedDate)) {
      setDate(selectedDate);
      setInputValue(format(selectedDate, "dd/MM/yyyy"));
    } else {
      setDate(undefined);
      setInputValue("");
    }
    setOpen(false);
  };

  const formatCaption = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      // Include month number with month name for Hebrew calendar
      const monthNumber = hDate.getMonth(); // HDate months are 1-based (Nisan = 1)
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
      const monthNumber = hDate.getMonth();
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

  return (
    <div className="relative">
      <Input
        placeholder="DD/MM/YYYY"
        value={inputValue}
        onChange={handleInputChange}
        className="bg-background pr-10"
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
            selected={date}
            onSelect={handleSelectDate}
            month={month}
            onMonthChange={setMonth}
            initialFocus
            captionLayout="dropdown"
            fromYear={1960}
            toYear={new Date().getFullYear() + 5}
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
}
