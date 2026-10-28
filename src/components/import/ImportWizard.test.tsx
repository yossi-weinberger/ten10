// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportPreviewRow, ParsedFile } from "@/lib/import/import-session.types";
import { parseCSVText } from "@/lib/import/parsers";

const io = vi.hoisted(() => ({
  fetchExistingForDedup: vi.fn(),
  fetchRecurringForImport: vi.fn(),
  persistApprovedImport: vi.fn(),
  trackProductEvent: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/contexts/PlatformContext", () => ({ usePlatform: () => ({ platform: "web" }) }));
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
vi.mock("@/components/onboarding/PageTourButton", () => ({ PageTourButton: () => null }));
vi.mock("./steps/PrepareStep", () => ({
  PrepareStep: ({ onNext }: { onNext: () => void }) => (
    <button type="button" onClick={onNext}>prepare-next</button>
  ),
}));
vi.mock("./steps/FileUploadStep", () => ({
  FileUploadStep: ({ onFileParsed }: { onFileParsed: (file: ParsedFile) => void }) => (
    <button type="button" onClick={() => onFileParsed(parsedCsv())}>upload-file</button>
  ),
}));
vi.mock("./steps/ColumnMappingStep", () => ({
  ColumnMappingStep: () => <p>mapping-step</p>,
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
  for (const fn of Object.values(io)) fn.mockReset();
  io.fetchExistingForDedup.mockResolvedValue([]);
  io.fetchRecurringForImport.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("ImportWizard without props", () => {
  it("walks prepare, upload, mapping and review, and back to mapping", async () => {
    const user = userEvent.setup();
    render(<ImportWizard />);

    expect(screen.getByRole("button", { name: "prepare-next" })).toBeInTheDocument();
    expect(io.fetchExistingForDedup).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "prepare-next" }));
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
  });

  it("saves approved rows through persistApprovedImport", async () => {
    io.persistApprovedImport.mockResolvedValue({ inserted: 3, failed: 0, skipped: 1, errors: [] });
    const user = userEvent.setup();
    render(<ImportWizard />);

    await user.click(screen.getByRole("button", { name: "prepare-next" }));
    await user.click(screen.getByRole("button", { name: "upload-file" }));
    await user.click(screen.getByRole("button", { name: "navigation.next" }));
    await screen.findByRole("list", { name: "review-step" });

    await user.click(screen.getByRole("button", { name: /confirm\.proceed \(3\)/ }));
    await user.click(await screen.findByRole("button", { name: "confirm.proceed" }));

    await waitFor(() => expect(io.persistApprovedImport).toHaveBeenCalledTimes(1));
    const [rows, platform, currency] = io.persistApprovedImport.mock.calls[0];
    expect(platform).toBe("web");
    expect(currency).toBe("ILS");
    expect((rows as ImportPreviewRow[]).filter((r) => r.approved)).toHaveLength(3);
  });
});
