// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { useDonationStore } from "@/lib/store";
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

const initialSettings = useDonationStore.getState().settings;

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
  useDonationStore.setState({ settings: initialSettings });
});

function useGregorian() {
  useDonationStore.setState({
    settings: {
      ...initialSettings,
      calendarType: "gregorian",
    },
  });
}

describe("DatePicker mobile drawer behavior", () => {
  it("renders Drawer on mobile (max-width: 767px)", async () => {
    useGregorian();
    mockMatches = true;
    const user = userEvent.setup();
    const setDate = vi.fn();
    
    render(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);

    const drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();
  });

  it("renders Popover on desktop (min-width: 768px)", async () => {
    useGregorian();
    mockMatches = false;
    const user = userEvent.setup();
    const setDate = vi.fn();
    
    render(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);

    const popover = document.querySelector('[role="dialog"]');
    expect(popover).toBeInTheDocument();
  });

  it("uses larger day cells (h-11 w-11) on mobile", async () => {
    useGregorian();
    mockMatches = true;
    const user = userEvent.setup();
    const setDate = vi.fn();
    
    render(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);

    const dayButtons = screen.getAllByRole("button").filter(button => 
      /^\d+$/.test(button.textContent || "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    expect(dayButtons[0]).toHaveClass("h-11");
    expect(dayButtons[0]).toHaveClass("w-11");
  });

  it("uses standard day cells (h-9 w-9) on desktop", async () => {
    useGregorian();
    mockMatches = false;
    const user = userEvent.setup();
    const setDate = vi.fn();
    
    render(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);

    const dayButtons = screen.getAllByRole("button").filter(button => 
      /^\d+$/.test(button.textContent || "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    expect(dayButtons[0]).toHaveClass("h-9");
    expect(dayButtons[0]).toHaveClass("w-9");
  });

  it("locks Drawer variant when picker is open", async () => {
    useGregorian();
    mockMatches = true;
    const user = userEvent.setup();
    const setDate = vi.fn();
    
    const { rerender } = render(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    const calendarButton = screen.getByRole("button", { name: /open calendar/i });
    await user.click(calendarButton);

    let drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();

    mockMatches = false;
    rerender(<DatePicker date={parseLocalDate("2026-10-08")} setDate={setDate} />);

    drawer = document.querySelector('[data-vaul-drawer]');
    expect(drawer).toBeInTheDocument();
  });
});
