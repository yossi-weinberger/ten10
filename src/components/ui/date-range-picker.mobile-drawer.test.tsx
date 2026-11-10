// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { parseLocalDate } from "@/lib/utils/local-date";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

let mockMatches = false;

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockMatches,
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => () => ({ day: "1", month: "Jan", year: "2026" }),
}));

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn();
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  mockMatches = false;
});

describe("DatePickerWithRange mobile drawer behavior", () => {
  it("renders Drawer on mobile (max-width: 767px)", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();
  });

  it("renders Popover on desktop (min-width: 768px)", async () => {
    mockMatches = false;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const popover = document.querySelector('[role="dialog"]');
    expect(popover).toBeInTheDocument();
  });

  it("shows single month (numberOfMonths=1) on mobile", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    await screen.findByRole("button", { name: /go to the next month/i });

    const captions = document.querySelectorAll('.rdp-caption');
    expect(captions.length).toBe(1);
  });

  it("shows two months (numberOfMonths=2) on desktop", async () => {
    mockMatches = false;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    await screen.findByRole("button", { name: /go to the next month/i });

    const captions = document.querySelectorAll('.rdp-caption');
    expect(captions.length).toBe(2);
  });

  it("renders calendar with day buttons on mobile", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    await screen.findByRole("button", { name: /go to the next month/i });

    const dayButtons = screen.getAllByRole("button").filter(button => 
      /^\d+$/.test(button.textContent || "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
  });

  it("renders calendar with day buttons on desktop", async () => {
    mockMatches = false;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    await screen.findByRole("button", { name: /go to the next month/i });

    const dayButtons = screen.getAllByRole("button").filter(button => 
      /^\d+$/.test(button.textContent || "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
  });

  it("shows Clear and Apply buttons in Drawer footer on mobile", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const buttons = screen.getAllByRole("button");
    const clearButton = buttons.find(btn => btn.textContent === "clear");
    const applyButton = buttons.find(btn => btn.textContent === "apply");
    
    expect(clearButton).toBeInTheDocument();
    expect(applyButton).toBeInTheDocument();
  });

  it("does not show Clear and Apply buttons in Popover on desktop", async () => {
    mockMatches = false;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const buttons = screen.getAllByRole("button");
    const clearButton = buttons.find(btn => btn.textContent === "clear");
    const applyButton = buttons.find(btn => btn.textContent === "apply");
    
    expect(clearButton).toBeUndefined();
    expect(applyButton).toBeUndefined();
  });

  it("Clear button clears the range and closes Drawer", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const buttons = screen.getAllByRole("button");
    const clearButton = buttons.find(btn => btn.textContent === "clear");
    await user.click(clearButton!);

    expect(onDateChange).toHaveBeenCalledWith(undefined);
    
    const drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).not.toBeInTheDocument();
  });

  it("Apply button applies the range and closes Drawer", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    const buttons = screen.getAllByRole("button");
    const applyButton = buttons.find(btn => btn.textContent === "apply");
    await user.click(applyButton!);

    expect(onDateChange).toHaveBeenCalledWith({ 
      from: parseLocalDate("2026-10-01"), 
      to: parseLocalDate("2026-10-08") 
    });
    
    const drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).not.toBeInTheDocument();
  });

  it("locks Drawer variant when picker is open", async () => {
    mockMatches = true;
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    
    const { rerender } = render(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    const triggerButton = screen.getByRole("button");
    await user.click(triggerButton);

    let drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();

    mockMatches = false;
    rerender(
      <DatePickerWithRange 
        date={{ from: parseLocalDate("2026-10-01"), to: parseLocalDate("2026-10-08") }}
        onDateChange={onDateChange}
      />
    );

    drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();
  });
});
