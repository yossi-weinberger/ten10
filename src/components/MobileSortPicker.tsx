import { useRef, useState } from "react";
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
import {
  decideSortMenuPlacement,
  SORT_MENU_HEADER_CLEARANCE,
  type SortMenuPlacement,
} from "@/components/sortMenuPlacement";

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

/** The side is chosen in decideSortMenuPlacement. Radix must not flip it. */
const SORT_MENU_AVOID_COLLISIONS = false;
/** Above the assistant button (z-50). Applied to the portalled popper wrapper. */
const SORT_MENU_Z_INDEX = "60";

function readCssPx(length: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingBottom = length;
  document.body.appendChild(probe);
  const parsed = Number.parseFloat(getComputedStyle(probe).paddingBottom);
  probe.remove();
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Radix copies the content z-index onto `[data-radix-popper-content-wrapper]`
 * from computed style. A static menu reports that as auto in some engines, and
 * the wrapper's transform is the real stacking context, so the z-50 FAB paints
 * on top. Set the wrapper after Radix's layout effect.
 */
function raiseMenuAboveFab(node: HTMLElement | null) {
  if (!node) return;
  queueMicrotask(() => {
    const wrapper = node.closest("[data-radix-popper-content-wrapper]");
    if (wrapper instanceof HTMLElement) wrapper.style.zIndex = SORT_MENU_Z_INDEX;
  });
}

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<SortMenuPlacement>({
    side: "bottom",
    maxHeight: 0,
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const headerClearance = readCssPx(
          "var(--mobile-topbar-h, 52px)",
          SORT_MENU_HEADER_CLEARANCE,
        );
        setPlacement(
          decideSortMenuPlacement({
            triggerTop: rect.top,
            triggerBottom: rect.bottom,
            viewportHeight: window.innerHeight,
            safeAreaBottom: readCssPx("env(safe-area-inset-bottom)", 0),
            headerClearance:
              headerClearance > 0 ? headerClearance : SORT_MENU_HEADER_CLEARANCE,
          }),
        );
      }
    }
    setOpen(next);
  }

  return (
    <div
      className="flex w-full min-w-0 max-w-full items-center gap-2"
      dir={textDirection}
    >
      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
        {t("sort.sortBy")}
      </span>
      <DropdownMenu dir={textDirection} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
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
          side={placement.side}
          avoidCollisions={SORT_MENU_AVOID_COLLISIONS}
          data-avoid-collisions={String(SORT_MENU_AVOID_COLLISIONS)}
          ref={raiseMenuAboveFab}
          align="start"
          style={{ maxHeight: `${placement.maxHeight}px`, zIndex: SORT_MENU_Z_INDEX }}
          className="relative z-[60] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
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
                className="min-h-11 rtl:pl-2 rtl:pr-8 [&>span]:rtl:left-auto [&>span]:rtl:right-2"
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
