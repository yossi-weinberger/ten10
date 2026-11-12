import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MobileSortOption<Field extends string = string> {
  field: Field;
  label: string;
}

export interface MobileSortPickerProps<Field extends string = string> {
  fields: readonly MobileSortOption<Field>[];
  field: Field;
  direction: "asc" | "desc";
  onChange: (field: Field) => void;
}

function sortDirectionPresentation(direction: "asc" | "desc"): {
  labelKey: "sort.ascending" | "sort.descending";
  Icon: typeof ArrowUp;
} {
  switch (direction) {
    case "asc":
      return { labelKey: "sort.ascending", Icon: ArrowUp };
    case "desc":
      return { labelKey: "sort.descending", Icon: ArrowDown };
    default: {
      const exhaustive: never = direction;
      return exhaustive;
    }
  }
}

export function MobileSortPicker<Field extends string>({
  fields,
  field,
  direction,
  onChange,
}: MobileSortPickerProps<Field>) {
  const { t, i18n } = useTranslation("data-tables");
  const textDirection = i18n.dir() === "rtl" ? "rtl" : "ltr";
  const currentLabel =
    fields.find((option) => option.field === field)?.label ?? field;
  const { labelKey, Icon } = sortDirectionPresentation(direction);

  return (
    <div className="flex w-full min-w-0 items-center gap-2" dir={textDirection}>
      <DropdownMenu dir={textDirection}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 justify-between gap-2 px-3 font-normal"
            aria-label={`${t("sort.sortBy")}: ${currentLabel}`}
          >
            <span className="min-w-0 truncate text-start">{currentLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 opacity-50"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[min(20rem,50vh)] overflow-y-auto"
        >
          {fields.map((option) => (
            <DropdownMenuItem
              key={option.field}
              className="min-h-11"
              onSelect={() => {
                if (option.field === field) return;
                onChange(option.field);
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        aria-label={t(labelKey)}
        onClick={() => onChange(field)}
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  );
}
