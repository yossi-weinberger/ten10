import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Check, ChevronDown } from "lucide-react";
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

/** False keeps the menu on side="bottom"; collision detection must not flip it upward. */
const SORT_MENU_AVOID_COLLISIONS = false;
/** Keeps a bottom-placed menu above the assistant button (24px offset + 56px button + 8px gap). */
const SORT_MENU_COLLISION_PADDING = { top: 8, bottom: 88 } as const;

function sortDirectionPresentation(direction: "asc" | "desc"): {
  actionLabelKey: "sort.ascending" | "sort.descending";
  Icon: typeof ArrowUp;
} {
  switch (direction) {
    case "asc":
      return { actionLabelKey: "sort.descending", Icon: ArrowUp };
    case "desc":
      return { actionLabelKey: "sort.ascending", Icon: ArrowDown };
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
  const { actionLabelKey, Icon } = sortDirectionPresentation(direction);
  const directionAction = t(actionLabelKey);

  return (
    <div
      className="flex w-full min-w-0 items-center gap-2 overflow-x-hidden"
      dir={textDirection}
    >
      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
        {t("sort.sortBy")}
      </span>
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
          side="bottom"
          avoidCollisions={SORT_MENU_AVOID_COLLISIONS}
          data-avoid-collisions={String(SORT_MENU_AVOID_COLLISIONS)}
          collisionPadding={SORT_MENU_COLLISION_PADDING}
          align="start"
          className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto"
        >
          {fields.map((option) => {
            const selected = option.field === field;
            return (
              <DropdownMenuItem
                key={option.field}
                className="min-h-11 gap-2"
                aria-checked={selected}
                onSelect={() => {
                  if (selected) return;
                  onChange(option.field);
                }}
              >
                <span className="min-w-0 flex-1 truncate text-start">
                  {option.label}
                </span>
                {selected ? (
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0 hover:bg-background hover:text-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground"
        aria-label={directionAction}
        title={directionAction}
        onClick={() => onChange(field)}
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  );
}
