// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColumnMapping, ImportPreviewRow, ParsedFile } from "@/lib/import/import-session.types";
import type { TransactionDraftV1 } from "@/lib/intake/contracts";
import { parseCSVText } from "@/lib/import/parsers";

const io = vi.hoisted(() => ({
  fetchExistingForDedup: vi.fn(),
  fetchRecurringForImport: vi.fn(),
  persistApprovedImport: vi.fn(),
  trackProductEvent: vi.fn(),
  suggestMappings: vi.fn(),
  mediaQueryMatches: false,
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/contexts/PlatformContext", () => ({ usePlatform: () => ({ platform: "web" }) }));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => io.mediaQueryMatches,
}));
vi.mock("@/lib/store", () => ({
  useDonationStore: Object.assign(
    (select: (state: { settings: { defaultCurrency: string } }) => unknown) =>
      select({ settings: { defaultCurrency: "ILS" } }),
    { getState: () => ({ setLastDbFetchTimestamp: vi.fn() }) },
  ),
}));
vi.mock("@/lib/data-layer/categories.service", () => ({ clearCategoryCache: vi.fn() }));
vi.mock("@/lib/data-layer/paymentMethods.service", () => ({ clearPaymentMethodCache: vi.fn() }));
vi.mock("@/lib/analytics/productAnalytics", () => ({ trackProductEvent: io.trackProductEvent }));
vi.mock("@/lib/import/persist-approved-import", () => ({
  fetchExistingForDedup: io.fetchExistingForDedup,
  fetchRecurringForImport: io.fetchRecurringForImport,
  persistApprovedImport: io.persistApprovedImport,
}));
vi.mock("@/components/onboarding/PageTourButton", () => ({
  PageTourButton: ({
    tour,
    className,
  }: {
    tour: string;
    className?: string;
  }) => (
    <button type="button" aria-label={`page-tour-${tour}`} className={className}>
      tour
    </button>
  ),
}));

vi.mock("@/lib/import/index", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/import/index")>();
  return {
    ...actual,
    suggestMappings: (...args: unknown[]) => io.suggestMappings(...args),
  };
});

vi.mock("./steps/FileUploadStep", () => ({
  FileUploadStep: ({
    onFileParsed,
  }: {
    onFileParsed: (file: ParsedFile, meta: { fileExtension: "csv" }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onFileParsed(parsedCsv(), { fileExtension: "csv" })}
    >
      upload-file
    </button>
  ),
}));
vi.mock("./steps/ColumnMappingStep", () => ({
  ColumnMappingStep: ({
    onMappingChange,
  }: {
    onMappingChange: (sourceColumn: string, targetField: ColumnMapping["targetField"]) => void;
  }) => (
    <div>
      <p>mapping-step</p>
      <button type="button" onClick={() => onMappingChange("תאריך ערך", null)}>
        fix-duplicate
      </button>
    </div>
  ),
}));
vi.mock("./steps/ImportReviewStep", () => ({
  ImportReviewStep: ({ rows }: { rows: ImportPreviewRow[] }) => (
    <ul aria-label="review-step">
      {rows.map((row) => (
        <li key={row.id}>
          {[row.rowNumber, row.status, row.normalized?.type ?? "-", row.issues.map((i) => i.code).join("+")].join("|")}
        </li>
      ))}
    </ul>
  ),
}));

import { ImportWizard } from "./ImportWizard";

/** Hand-built Leumi-like mapping (spec §8) — not matcher output. */
const LEUMI_HAND_BUILT: ColumnMapping[] = [
  { sourceColumn: "תאריך", targetField: "date" },
  { sourceColumn: "תאריך ערך", targetField: "date" },
  { sourceColumn: "סכום", targetField: "amount" },
  { sourceColumn: "תיאור", targetField: "description" },
  { sourceColumn: "יתרה", targetField: null },
];

const CSV = [
  "date,amount,description,type,category",
  "2026-10-01,350,Groceries,expense,food",
  "2026-10-02,5000,Salary,income,salary",
  "2026-10-03,100,Dinner,expense,leisure",
  "2026-10-03,100,Dinner,expense,leisure",
].join("\n");

function parsedCsv(): ParsedFile {
  const { headers, rows } = parseCSVText(CSV);
  return { headers, rows, sampleRows: rows.slice(0, 5), rowCount: rows.length };
}

function reviewLines(): string[] {
  return screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
}

beforeEach(() => {
  for (const fn of Object.values(io)) {
    if (typeof fn === "function" && "mockReset" in fn) fn.mockReset();
  }
  io.mediaQueryMatches = false;
  io.fetchExistingForDedup.mockResolvedValue([]);
  io.fetchRecurringForImport.mockResolvedValue([]);
  io.suggestMappings.mockImplementation((headers: string[]) =>
    headers.map((sourceColumn) => {
      const lower = sourceColumn.toLowerCase();
      if (lower.includes("date") || sourceColumn === "תאריך") {
        return { sourceColumn, targetField: "date" as const };
      }
      if (lower.includes("amount") || sourceColumn === "סכום") {
        return { sourceColumn, targetField: "amount" as const };
      }
      if (lower.includes("description") || sourceColumn === "תיאור") {
        return { sourceColumn, targetField: "description" as const };
      }
      if (lower.includes("type")) return { sourceColumn, targetField: "type" as const };
      if (lower.includes("category")) return { sourceColumn, targetField: "category" as const };
      return { sourceColumn, targetField: null };
    })
  );
});

afterEach(() => {
  cleanup();
});

describe("ImportWizard without props", () => {
  it("renders the import tour entry in the mobile header on upload", () => {
    const { container } = render(<ImportWizard />);
    const mobileHeader = container.querySelector(
      '.md\\:hidden [data-onboarding="import-intro"]',
    );
    expect(mobileHeader).toBeTruthy();
    const tour = within(mobileHeader as HTMLElement).getByRole("button", {
      name: "page-tour-import",
    });
    expect(tour).toBeInTheDocument();
    expect(tour.className).toContain("h-11");
    expect(tour.className).toContain("w-11");

    const desktopHeader = container.querySelector(
      '.hidden.md\\:flex [data-onboarding="import-intro"]',
    )?.parentElement;
    expect(desktopHeader).toBeTruthy();
    expect(
      within(desktopHeader as HTMLElement).getByRole("button", {
        name: "page-tour-import",
      }),
    ).toBeInTheDocument();
  });

  it("starts on upload with 3 labeled steps and no back on upload", async () => {
    const user = userEvent.setup();
    render(<ImportWizard />);

    expect(screen.getByRole("button", { name: "upload-file" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "navigation.back" })).not.toBeInTheDocument();
    expect(screen.getByText("steps.upload")).toBeInTheDocument();
    expect(screen.getByText("steps.mapping")).toBeInTheDocument();
    expect(screen.getByText("steps.review")).toBeInTheDocument();
    expect(screen.queryByText("steps.prepare")).not.toBeInTheDocument();
    expect(io.fetchExistingForDedup).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "upload-file" }));
    expect(screen.getByText("mapping-step")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "navigation.next" }));
    await screen.findByRole("list", { name: "review-step" });

    expect(io.fetchExistingForDedup).toHaveBeenCalledWith("web", null);
    expect(io.fetchRecurringForImport).toHaveBeenCalledWith("web");
    expect(io.trackProductEvent).toHaveBeenCalledWith(
      "transaction_import_mapping_completed",
      expect.objectContaining({ platform: "web" }),
    );
    expect(reviewLines()).toEqual([
      "1|ready|expense|",
      "2|ready|income|",
      "3|ready|expense|",
      "4|needs_review|expense|possible_duplicate",
    ]);

    const back = screen.getByRole("button", { name: "navigation.back" });
    expect(back).toBeEnabled();
    await user.click(back);
    expect(screen.getByText("mapping-step")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "navigation.back" }));
    expect(screen.getByRole("button", { name: "upload-file" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "navigation.back" })).not.toBeInTheDocument();
  });

  it("saves approved rows through persistApprovedImport", async () => {
    io.persistApprovedImport.mockResolvedValue({ inserted: 3, failed: 0, skipped: 1, errors: [] });
    const user = userEvent.setup();
    render(<ImportWizard />);

    await user.click(screen.getByRole("button", { name: "upload-file" }));
    await user.click(screen.getByRole("button", { name: "navigation.next" }));
    await screen.findByRole("list", { name: "review-step" });

    await user.click(screen.getByRole("button", { name: /review\.saveCta:3/ }));
    await user.click(await screen.findByRole("button", { name: "confirm.proceed" }));

    await waitFor(() => expect(io.persistApprovedImport).toHaveBeenCalledTimes(1));
    const [rows, platform, currency] = io.persistApprovedImport.mock.calls[0];
    expect(platform).toBe("web");
    expect(currency).toBe("ILS");
    expect((rows as ImportPreviewRow[]).filter((r) => r.approved)).toHaveLength(3);
  });

  it("disables Next while hand-built Leumi mappings have duplicates, then enables after a fix", async () => {
    io.suggestMappings.mockReturnValue(LEUMI_HAND_BUILT);
    io.mediaQueryMatches = true;
    const user = userEvent.setup();
    render(<ImportWizard />);

    await user.click(screen.getByRole("button", { name: "upload-file" }));

    const next = screen.getByRole("button", { name: "navigation.next" });
    expect(next).toBeDisabled();
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAttribute("aria-describedby", "mapping-issues-summary");
    expect(next.className).toContain("max-md:h-11");
    expect(next.className).toContain("max-md:flex-1");

    expect(
      screen.getByRole("button", { name: "mapping.summary.show" })
    ).toBeInTheDocument();
    expect(io.trackProductEvent).toHaveBeenCalledWith(
      "transaction_import_mapping_blocked",
      expect.objectContaining({
        platform: "web",
        step: "mapping",
        errorCodes: ["duplicateTarget"],
      })
    );

    await user.click(screen.getByRole("button", { name: "fix-duplicate" }));
    expect(screen.getByRole("button", { name: "navigation.next" })).toBeEnabled();
  });

  it("scrolls to the first flagged mapping row from the summary bar", async () => {
    io.suggestMappings.mockReturnValue(LEUMI_HAND_BUILT);
    io.mediaQueryMatches = true;
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const flagged = document.createElement("div");
    flagged.setAttribute("data-mapping-column", "תאריך");
    flagged.setAttribute("data-mapping-issue", "true");
    flagged.scrollIntoView = scrollIntoView;
    const picker = document.createElement("button");
    picker.setAttribute("data-mapping-picker", "תאריך");
    picker.focus = focus;
    flagged.appendChild(picker);
    document.body.appendChild(flagged);

    const user = userEvent.setup();
    render(<ImportWizard />);
    await user.click(screen.getByRole("button", { name: "upload-file" }));
    await user.click(screen.getByRole("button", { name: "mapping.summary.show" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(focus).toHaveBeenCalled();
    flagged.remove();
  });
});

const DRAFTS: TransactionDraftV1[] = [
  {
    schema_version: 1,
    date: "2026-10-01",
    amount: 350,
    currency: "ILS",
    type: "expense",
    description: "Groceries",
    category: "food",
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    requested_rate: null,
  },
  {
    schema_version: 1,
    date: "2026-10-02",
    amount: 700,
    currency: "ILS",
    type: "exempt-income",
    description: "Gift",
    category: null,
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    requested_rate: null,
  },
  {
    schema_version: 1,
    date: "2026-10-03",
    amount: 20,
    currency: "USD",
    type: "expense",
    description: "Books",
    category: null,
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    requested_rate: 3.7,
  },
];

describe("ImportWizard with initialRows", () => {
  it("lands on review without upload or mapping", async () => {
    render(<ImportWizard initialRows={DRAFTS} />);

    expect(screen.queryByRole("button", { name: "upload-file" })).not.toBeInTheDocument();
    await screen.findByRole("list", { name: "review-step" });

    expect(io.fetchExistingForDedup).toHaveBeenCalledWith("web", null);
    expect(io.fetchRecurringForImport).toHaveBeenCalledWith("web");
    expect(io.trackProductEvent).not.toHaveBeenCalledWith(
      "transaction_import_mapping_completed",
      expect.anything(),
    );
    expect(reviewLines()).toEqual([
      "1|ready|expense|",
      "2|ready|exempt-income|",
      "3|invalid|-|foreign_currency_not_supported",
    ]);
    expect(screen.getByRole("button", { name: "navigation.back" })).toBeDisabled();
    expect(screen.queryByText("mapping-step")).not.toBeInTheDocument();
  });

  it("pins the review footer to the viewport bottom on mobile short pages", async () => {
    const { container } = render(<ImportWizard initialRows={DRAFTS} />);
    await screen.findByRole("list", { name: "review-step" });

    const root = container.querySelector("[data-import-wizard-root]");
    expect(root?.className).toContain("max-md:flex");
    expect(root?.className).toContain("max-md:flex-col");
    expect(root?.className).toContain(
      "max-md:min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px)-6rem)]",
    );

    const footer = container.querySelector("[data-onboarding-import-nav]");
    expect(footer?.className).toContain("sticky");
    expect(footer?.className).toContain("bottom-0");
    expect(footer?.className).toContain("max-md:mt-auto");
    // Desktop layout stays pixel-identical: pin classes are max-md only.
    expect(footer?.className.split(/\s+/)).not.toContain("md:mt-auto");
    expect(root?.className.split(/\s+/).some((c) => c.startsWith("md:min-h-"))).toBe(
      false,
    );
  });

  it("saves through the regular import save without origin", async () => {
    io.persistApprovedImport.mockResolvedValue({ inserted: 2, failed: 0, skipped: 1, errors: [] });
    const user = userEvent.setup();
    render(<ImportWizard initialRows={DRAFTS} />);
    await screen.findByRole("list", { name: "review-step" });

    await user.click(screen.getByRole("button", { name: /review\.saveCta:2/ }));
    await user.click(await screen.findByRole("button", { name: "confirm.proceed" }));

    await waitFor(() => expect(io.persistApprovedImport).toHaveBeenCalledTimes(1));
    const [rows, platform, currency] = io.persistApprovedImport.mock.calls[0];
    expect(platform).toBe("web");
    expect(currency).toBe("ILS");
    const approved = (rows as ImportPreviewRow[]).filter((r) => r.approved);
    expect(approved.map((r) => r.normalized?.type)).toEqual(["expense", "exempt-income"]);
    for (const row of approved) expect(row.normalized).not.toHaveProperty("origin");
  });

  it("retries loading the drafts after a failed context fetch", async () => {
    io.fetchExistingForDedup.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<ImportWizard initialRows={DRAFTS} />);

    await user.click(await screen.findByRole("button", { name: "review.processingError.retry" }));
    await screen.findByRole("list", { name: "review-step" });
    expect(reviewLines()).toHaveLength(3);
  });
});
