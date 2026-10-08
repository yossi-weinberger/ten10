import * as React from "react";
import { flushSync } from "react-dom";
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
  parseLocalDate,
} from "@/lib/utils/local-date";
import { Input } from "./input";
import {
  formatGregorianDateInput,
  parseCompleteFourDigitGregorianDateInput,
  parseFlexibleGregorianDateInput,
} from "./gregorian-date-input";

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function useCommitOnFormSubmit(
  inputRef: React.RefObject<HTMLInputElement | null>,
  inputValueRef: React.MutableRefObject<string>,
  commit: (raw: string) => void,
) {
  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });

  React.useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const isSubmitControl = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest('button[type="submit"], input[type="submit"]'));

    const commitNow = () => {
      flushSync(() => {
        commitRef.current(inputValueRef.current);
      });
    };

    const onSubmitPointerDown = (event: Event) => {
      if (!isSubmitControl(event.target)) return;
      commitNow();
    };

    form.addEventListener("pointerdown", onSubmitPointerDown, true);
    form.addEventListener("mousedown", onSubmitPointerDown, true);
    form.addEventListener("submit", commitNow, true);
    return () => {
      form.removeEventListener("pointerdown", onSubmitPointerDown, true);
      form.removeEventListener("mousedown", onSubmitPointerDown, true);
      form.removeEventListener("submit", commitNow, true);
    };
  }, [inputRef, inputValueRef]);
}

export function DatePicker({
  date,
  setDate,
  minDate,
}: {
  date?: Date;
  setDate: (date?: Date) => void;
  minDate?: Date;
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const dirtyRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputValueRef = React.useRef(inputValue);
  const { i18n } = useTranslation(["dashboard", "transactions"]);
  const yearBounds = getCalendarNavigationBounds();
  const calendarType = useDonationStore(
    (state) => state.settings.calendarType,
  );
  const language = i18n.language.startsWith("he") ? "he" : "en";
  const calendarStartMonth =
    minDate && minDate > yearBounds.startMonth
      ? minDate
      : yearBounds.startMonth;

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

      return formatGregorianDateInput(value);
    },
    [calendarType, language],
  );

  const dateKey = date && isValidDate(date) ? formatLocalDate(date) : "";

  const setFieldText = (value: string) => {
    inputValueRef.current = value;
    setInputValue(value);
  };

  React.useEffect(() => {
    if (dirtyRef.current) {
      return;
    }
    if (dateKey) {
      const synced = parseLocalDate(dateKey);
      setFieldText(formatFieldDate(synced));
      setMonth(synced);
      return;
    }
    setFieldText("");
    setMonth(undefined);
  }, [dateKey, formatFieldDate]);

  const commitInput = (rawValue: string) => {
    if (calendarType === "hebrew") return;
    const result = parseFlexibleGregorianDateInput(rawValue);
    switch (result.status) {
      case "empty":
        dirtyRef.current = false;
        setFieldText("");
        setDate(undefined);
        return;
      case "parsed": {
        dirtyRef.current = false;
        setFieldText(formatFieldDate(result.date));
        setMonth(result.date);
        setDate(result.date);
        return;
      }
      case "invalid":
        dirtyRef.current = true;
        setFieldText(rawValue);
        setDate(new Date(Number.NaN));
        return;
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  };

  useCommitOnFormSubmit(inputRef, inputValueRef, commitInput);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (calendarType === "hebrew") return;
    const value = e.target.value;
    dirtyRef.current = true;
    setFieldText(value);

    const result = parseCompleteFourDigitGregorianDateInput(value);
    switch (result.status) {
      case "empty":
        setDate(undefined);
        return;
      case "parsed":
        setMonth(result.date);
        setDate(result.date);
        return;
      case "invalid":
        setDate(undefined);
        return;
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  };

  const handleSelectDate = (selectedDate: Date | undefined) => {
    dirtyRef.current = false;
    if (isValidDate(selectedDate)) {
      setDate(selectedDate);
      setFieldText(formatFieldDate(selectedDate));
    } else {
      setDate(undefined);
      setFieldText("");
    }
    setOpen(false);
  };

  const formatCaption = (captionDate: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    const monthName = format(captionDate, "LLLL", { locale: currentLocale });
    const monthNumber = captionDate.getMonth() + 1;
    const year = captionDate.getFullYear();
    return `${monthName} ${monthNumber} ${year}`;
  };

  const formatWeekday = (weekdayDate: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(weekdayDate, "EEEEEE", { locale: currentLocale });
  };

  const formatDay = (dayDate: Date) => {
    return format(dayDate, "d");
  };

  const formatMonthDropdown = (monthDate: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    const monthName = format(monthDate, "LLLL", { locale: currentLocale });
    const monthNumber = monthDate.getMonth() + 1;
    return `${monthName} ${monthNumber}`;
  };

  const formatYearDropdown = (yearDate: Date) => {
    return yearDate.getFullYear().toString();
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder={calendarType === "hebrew" ? "" : "DD/MM/YYYY"}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={() => {
          commitInput(inputValueRef.current);
        }}
        readOnly={calendarType === "hebrew"}
        className="bg-background pr-10"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            commitInput(inputValueRef.current);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
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
            startMonth={calendarStartMonth}
            endMonth={yearBounds.endMonth}
            disabled={minDate ? { before: minDate } : undefined}
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
