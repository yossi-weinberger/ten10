import React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectTrigger } from "@/components/ui/select";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { cn } from "@/lib/utils";

function compactTriggerClassName(active: boolean): string {
  return cn(
    "h-11 min-h-11 w-full min-w-0 justify-between gap-1 rounded-lg px-2.5 !ps-2.5 !pe-2 text-start text-[13.5px] font-normal shadow-sm",
    active && "border-primary/40 bg-primary/10 hover:bg-primary/10",
  );
}

function CompactFilterBody({
  label,
  value,
  active,
  valueDir,
  maskValue = false,
}: {
  label: string;
  value: string;
  active: boolean;
  valueDir?: "ltr" | "rtl";
  maskValue?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-baseline gap-0.5 overflow-hidden">
      <span className="shrink-0 font-medium text-muted-foreground">{label}:</span>
      <span
        dir={valueDir}
        {...(maskValue ? PH_SENSITIVE_PROPS : {})}
        className={cn(
          "min-w-0 truncate font-semibold",
          active && "text-primary",
          maskValue && PH_SENSITIVE_PROPS.className,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CompactFilterChevron({ active }: { active: boolean }) {
  return (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted-foreground",
        active && "text-primary",
      )}
    />
  );
}

export const CompactFilterTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & {
    label: string;
    value: string;
    active: boolean;
    valueDir?: "ltr" | "rtl";
    maskValue?: boolean;
  }
>(function CompactFilterTrigger(
  { label, value, active, valueDir, maskValue = false, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="outline"
      {...props}
      type="button"
      className={cn(compactTriggerClassName(active), className)}
    >
      <CompactFilterBody
        label={label}
        value={value}
        active={active}
        valueDir={valueDir}
        maskValue={maskValue}
      />
      <CompactFilterChevron active={active} />
    </Button>
  );
});

export function CompactSelectTrigger({
  label,
  value,
  active,
  valueDir,
}: {
  label: string;
  value: string;
  active: boolean;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <SelectTrigger
      className={cn(compactTriggerClassName(active), "[&>svg]:hidden")}
    >
      <CompactFilterBody
        label={label}
        value={value}
        active={active}
        valueDir={valueDir}
      />
      <div className="inline-flex shrink-0" aria-hidden="true">
        <CompactFilterChevron active={active} />
      </div>
    </SelectTrigger>
  );
}

export function CompactFilterPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4" data-testid="mobile-filters-panel">
      <CardContent className="flex flex-col gap-2 p-3">{children}</CardContent>
    </Card>
  );
}

export function CompactFilterHeader({
  title,
  count,
  countLabel,
  resetLabel,
  closeLabel,
  onReset,
  onClose,
}: {
  title: string;
  count: number;
  countLabel: string;
  resetLabel: string;
  closeLabel: string;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-11 min-h-11 items-center justify-between gap-2 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="m-0 truncate text-base font-bold leading-none">{title}</h2>
        {count > 0 ? (
          <>
            <Badge
              variant="default"
              className="h-5 min-w-5 justify-center border-0 px-1 py-0 text-xs font-bold leading-none"
              aria-hidden="true"
            >
              {count}
            </Badge>
            <span className="sr-only">{countLabel}</span>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        {count > 0 ? (
          <Button
            type="button"
            variant="link"
            onClick={onReset}
            className="h-11 px-2.5 text-sm font-semibold text-primary no-underline hover:no-underline"
          >
            {resetLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-expanded="true"
          aria-label={closeLabel}
          className="h-11 w-11 rounded-lg p-0 [&_svg]:size-5"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function CompactFilterSearch({
  id,
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
  clearLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  ariaLabel: string;
  clearLabel: string;
}) {
  const hasText = value.trim().length > 0;
  return (
    <div
      className={cn(
        "flex h-11 min-h-11 items-center gap-2 overflow-hidden rounded-lg border border-input bg-background ps-2.5 shadow-sm",
        hasText ? "border-primary/40 bg-primary/10 pe-0" : "pe-2.5",
      )}
    >
      <Search
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-muted-foreground",
          hasText && "text-primary",
        )}
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
          hasText && "font-semibold text-primary",
          PH_SENSITIVE_PROPS.className,
        )}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      />
      {hasText ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          aria-label={clearLabel}
          className="-my-px h-11 w-11 shrink-0 rounded-lg p-0 text-primary hover:bg-transparent hover:text-primary"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function CompactFilterGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function CompactFilterCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-w-0">{children}</div>;
}
