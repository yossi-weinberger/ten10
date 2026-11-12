import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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

/** Bottom is preferred. Flip only when the capped menu does not fit below the trigger. */
const SORT_MENU_AVOID_COLLISIONS = true;
/** Small inset. A large bottom pad shrinks a low trigger down to a single row. */
const SORT_MENU_COLLISION_PADDING = { top: 8, bottom: 8 } as const;
/**
 * Three min-h-11 rows plus the menu padding, and at most 20rem.
 * The 9rem fallback fits the gap under the control at 320x568, so that case
 * stays downward. A shorter gap flips upward instead of collapsing the menu.
 */
const SORT_MENU_MAX_HEIGHT =
  "max(min(var(--radix-dropdown-menu-content-available-height, 9rem), 20rem), 8.75rem)";

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
          style={{ maxHeight: SORT_MENU_MAX_HEIGHT }}
          className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
        >
          <DropdownMenuRadioGroup
            value={field}
            onValueChange={(value) => {
              const next = fields.find((option) => option.field === value);
              if (!next || next.field === field) return;
              onChange(next.field);
            }}
          >
            {fields.map((option) => (
              <DropdownMenuRadioItem
                key={option.field}
                value={option.field}
                className="min-h-11"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
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
