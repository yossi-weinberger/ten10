import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { he } from "date-fns/locale";
import { formatHebrewDate } from "@/lib/utils/hebrew-date";
import { useDonationStore } from "@/lib/store";
import { HDate } from "@hebcal/core";

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
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  const { settings } = useDonationStore();

  const formatDate = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      return formatHebrewDate(date);
    }
    return format(date, "dd/MM/yyyy", { locale: he });
  };

  const formatCaption = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      return `${hDate.getMonthName()} ${hDate.getFullYear()}`;
    }
    return format(date, "LLLL yyyy", { locale: he });
  };

  const formatWeekday = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
      return days[date.getDay()];
    }
    return format(date, "EEEEEE", { locale: he });
  };

  const formatDay = (date: Date) => {
    if (settings.calendarType === "hebrew") {
      const hDate = new HDate(date);
      return String(hDate.getDate());
    }
    return format(date, "d");
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
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
              <span>בחר טווח תאריכים</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={he}
            formatters={{
              formatCaption,
              formatDay,
              formatWeekdayName: formatWeekday,
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
