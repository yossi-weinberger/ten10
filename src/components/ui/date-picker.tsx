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
import { minTransactionDateLocal } from "@/lib/utils/transaction-date";
import { Input } from "./input";
import {
  formatGregorianDateInput,
  parseCompleteFourDigitGregorianDateInput,
  parseFlexibleGregorianDateInput,
} from "./gregorian-date-input";

type DateCommitOutcome = "empty" | "valid" | "min" | "invalid";

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
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const dirtyRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputValueRef = React.useRef(inputValue);
  const { t, i18n } = useTranslation(["dashboard", "transactions"]);
  const resolvedMinDate = React.useMemo(
    () => minDate ?? minTransactionDateLocal(),
    [minDate],
  );
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

      return formatGregorianDateInput(value);
    },
    [calendarType, language],
  );

  function isValidDate(d: unknown): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
  }

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
      if (synced >= resolvedMinDate) {
        setInputError(null);
      }
      setMonth(synced);
      return;
    }
    if (!inputError) {
      setFieldText("");
    }
    setMonth(undefined);
  }, [dateKey, formatFieldDate, resolvedMinDate, inputError]);

  const commitInput = (rawValue: string): DateCommitOutcome => {
    if (calendarType === "hebrew") return "valid";
    const result = parseFlexibleGregorianDateInput(rawValue);
    switch (result.status) {
      case "empty":
        dirtyRef.current = false;
        setInputError(null);
        setFieldText("");
        setDate(undefined);
        return "empty";
      case "parsed": {
        dirtyRef.current = false;
        const parsedDate = result.date;
        setFieldText(formatFieldDate(parsedDate));
        setMonth(parsedDate);
        setDate(parsedDate);
        if (parsedDate < resolvedMinDate) {
          setInputError(t("transactions:transactionForm.validation.date.min"));
          return "min";
        }
        setInputError(null);
        return "valid";
      }
      case "invalid":
        dirtyRef.current = true;
        setFieldText(rawValue);
        setInputError(t("transactions:transactionForm.validation.date.invalid"));
        setDate(undefined);
        return "invalid";
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  };
  const commitInputRef = React.useRef(commitInput);
  React.useEffect(() => {
    commitInputRef.current = commitInput;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (calendarType === "hebrew") return;
    const value = e.target.value;
    dirtyRef.current = true;
    setFieldText(value);

    const result = parseCompleteFourDigitGregorianDateInput(value);
    switch (result.status) {
      case "empty":
        setInputError(null);
        setDate(undefined);
        return;
      case "parsed": {
        setMonth(result.date);
        if (result.date < resolvedMinDate) {
          setInputError(t("transactions:transactionForm.validation.date.min"));
        } else {
          setInputError(null);
        }
        setDate(result.date);
        return;
      }
      case "invalid":
        setInputError(null);
        setDate(undefined);
        return;
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  };

  React.useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form) return;

    const isSubmitControl = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('button[type="submit"], input[type="submit"]'));
    };

    const onSubmitPointerDown = (event: Event) => {
      if (!isSubmitControl(event.target)) return;
      flushSync(() => {
        commitInputRef.current(inputValueRef.current);
      });
    };

    const onSubmit = (event: Event) => {
      let outcome!: DateCommitOutcome;
      flushSync(() => {
        outcome = commitInputRef.current(inputValueRef.current);
      });
      switch (outcome) {
        case "valid":
          return;
        case "empty":
        case "min":
        case "invalid":
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        default: {
          const exhaustive: never = outcome;
          return exhaustive;
        }
      }
    };

    form.addEventListener("pointerdown", onSubmitPointerDown, true);
    form.addEventListener("mousedown", onSubmitPointerDown, true);
    form.addEventListener("submit", onSubmit, true);
    return () => {
      form.removeEventListener("pointerdown", onSubmitPointerDown, true);
      form.removeEventListener("mousedown", onSubmitPointerDown, true);
      form.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  const handleSelectDate = (selectedDate: Date | undefined) => {
    dirtyRef.current = false;
    if (isValidDate(selectedDate) && selectedDate >= resolvedMinDate) {
      setInputError(null);
      setDate(selectedDate);
      setFieldText(formatFieldDate(selectedDate));
    } else if (isValidDate(selectedDate)) {
      setInputError(t("transactions:transactionForm.validation.date.min"));
      setDate(selectedDate);
      setFieldText(formatFieldDate(selectedDate));
    } else {
      setInputError(null);
      setDate(undefined);
      setFieldText("");
    }
    setOpen(false);
  };

  const formatCaption = (date: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    const monthName = format(date, "LLLL", { locale: currentLocale });
    const monthNumber = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${monthName} ${monthNumber} ${year}`;
  };

  const formatWeekday = (date: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    return format(date, "EEEEEE", { locale: currentLocale });
  };

  const formatDay = (date: Date) => {
    return format(date, "d");
  };

  const formatMonthDropdown = (date: Date) => {
    const currentLocale = i18n.language === "he" ? he : enUS;
    const monthName = format(date, "LLLL", { locale: currentLocale });
    const monthNumber = date.getMonth() + 1;
    return `${monthName} ${monthNumber}`;
  };

  const formatYearDropdown = (date: Date) => {
    return date.getFullYear().toString();
  };

  const picker = (
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
        aria-invalid={inputError ? true : undefined}
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
            startMonth={
              yearBounds.startMonth > resolvedMinDate
                ? yearBounds.startMonth
                : resolvedMinDate
            }
            endMonth={yearBounds.endMonth}
            disabled={{ before: resolvedMinDate }}
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
      <div className="mt-1 min-h-5 text-sm leading-snug">
        {inputError ? (
          <p role="alert" className="break-words font-medium text-destructive">
            {inputError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
