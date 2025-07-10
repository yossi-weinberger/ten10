import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { he } from "date-fns/locale";

import { cn } from "@/lib/utils";
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
            dir="rtl"
            locale={he}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
