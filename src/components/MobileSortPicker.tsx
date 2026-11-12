import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  decideSortMenuPlacement,
  SORT_MENU_HEADER_CLEARANCE,
  type SortMenuPlacement,
} from "@/components/sortMenuPlacement";

export type MobileSortDirectionKind = "date" | "amount" | "text";

export interface MobileSortOption<Field extends string = string> {
  field: Field;
  label: string;
  directionKind?: MobileSortDirectionKind;
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
const SORT_RADIO_ITEM_CLASS =
  "min-h-11 rtl:pl-2 rtl:pr-8 [&>span]:rtl:left-auto [&>span]:rtl:right-2";

type DirectionLabelKey =
  | "sort.directions.dateDesc"
  | "sort.directions.dateAsc"
  | "sort.directions.amountDesc"
  | "sort.directions.amountAsc"
  | "sort.directions.textAsc"
  | "sort.directions.textDesc";

function directionChoices(
  kind: MobileSortDirectionKind,
): readonly { value: "asc" | "desc"; key: DirectionLabelKey }[] {
  switch (kind) {
    case "date":
      return [
        { value: "desc", key: "sort.directions.dateDesc" },
        { value: "asc", key: "sort.directions.dateAsc" },
      ];
    case "amount":
      return [
        { value: "desc", key: "sort.directions.amountDesc" },
        { value: "asc", key: "sort.directions.amountAsc" },
      ];
    case "text":
      return [
        { value: "asc", key: "sort.directions.textAsc" },
        { value: "desc", key: "sort.directions.textDesc" },
      ];
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

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

export function MobileSortPicker<Field extends string>({
  fields,
  field,
  direction,
  onChange,
}: MobileSortPickerProps<Field>) {
  const { t, i18n } = useTranslation("data-tables");
  const textDirection = i18n.dir() === "rtl" ? "rtl" : "ltr";
  const current = fields.find((option) => option.field === field);
  const currentLabel = current?.label ?? field;
  const directionKind = current?.directionKind ?? "text";
  const choices = directionChoices(directionKind);
  const directionLabel = t(
    choices.find((choice) => choice.value === direction)?.key ??
      choices[0].key,
  );
  const DirectionArrow = direction === "asc" ? ArrowUp : ArrowDown;
  const ariaLabel = t("sort.chip", {
    field: currentLabel,
    direction: directionLabel,
  });
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
    <div className="relative inline-flex min-w-0 max-w-full" dir={textDirection}>
      <DropdownMenu dir={textDirection} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            className="relative h-9 w-fit min-w-0 max-w-full rounded-full px-2.5 text-[13px] font-normal before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']"
            aria-label={ariaLabel}
          >
            <ArrowUpDown className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate max-[359px]:sr-only">
              {currentLabel}
            </span>
            <DirectionArrow className="size-3.5 shrink-0" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={placement.side}
          avoidCollisions={SORT_MENU_AVOID_COLLISIONS}
          data-avoid-collisions={String(SORT_MENU_AVOID_COLLISIONS)}
          ref={raiseMenuAboveFab}
          align="end"
          style={{ maxHeight: `${placement.maxHeight}px`, zIndex: SORT_MENU_Z_INDEX }}
          className="relative z-[60] w-[min(16rem,calc(100vw-32px))] overflow-y-auto"
        >
          <DropdownMenuRadioGroup
            value={direction}
            onValueChange={(value) => {
              if (value !== "asc" && value !== "desc") return;
              if (value === direction) return;
              onChange(field);
            }}
          >
            {choices.map((choice) => (
              <DropdownMenuRadioItem
                key={choice.value}
                value={choice.value}
                className={SORT_RADIO_ITEM_CLASS}
              >
                {t(choice.key)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
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
                className={SORT_RADIO_ITEM_CLASS}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
