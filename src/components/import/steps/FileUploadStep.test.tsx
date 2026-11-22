// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedFile } from "@/lib/import/import-session.types";
import { LEUMI_HTML_XLS } from "@/lib/import/__fixtures__/banks/build-fixtures";

const io = vi.hoisted(() => ({
  parseFile: vi.fn(),
  parseFileInWorker: vi.fn((file: File, sheetName?: string, timeoutMs?: number) => {
    void timeoutMs;
    return io.parseFile(file, sheetName);
  }),
  actualParseFile: null as null | ((
    file: File,
    sheetName?: string
  ) => Promise<unknown>),
  downloadTemplateCsv: vi.fn(),
  generateTemplateCsv: vi.fn().mockReturnValue("date,amount\n"),
  trackProductEvent: vi.fn(),
  mediaQueryMatches: false,
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));
vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => io.mediaQueryMatches,
}));
vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: io.trackProductEvent,
}));
vi.mock("@/lib/import/parsers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/import/parsers")>();
  io.actualParseFile = actual.parseFile;
  return {
    ...actual,
    parseFile: (file: File, sheetName?: string) => io.parseFile(file, sheetName),
  };
});
vi.mock("@/lib/import/parse-file-in-worker", () => ({
  parseFileInWorker: (
    file: File,
    sheetName: string | undefined,
    timeoutMs: number
  ) => io.parseFileInWorker(file, sheetName, timeoutMs),
}));
vi.mock("@/lib/import/ten10-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/import/ten10-template")>();
  return {
    ...actual,
    downloadTemplateCsv: ((language: string) =>
      io.downloadTemplateCsv(language)) as typeof actual.downloadTemplateCsv,
    generateTemplateCsv: ((language: string) =>
      io.generateTemplateCsv(language)) as typeof actual.generateTemplateCsv,
  };
});
vi.mock("@/lib/onboarding/importWizardBridge", () => ({
  requestOnboardingTourRefresh: vi.fn(),
  subscribeOnboardingImportUploadNext: () => () => {},
}));

import { FileUploadStep } from "./FileUploadStep";

function parsedStub(overrides: Partial<ParsedFile> = {}): ParsedFile {
  return {
    headers: ["date", "amount"],
    rows: [{ date: "2026-01-01", amount: "10" }],
    sampleRows: [{ date: "2026-01-01", amount: "10" }],
    rowCount: 1,
    ...overrides,
  };
}

beforeEach(() => {
  io.parseFile.mockReset();
  io.parseFileInWorker.mockClear();
  io.parseFileInWorker.mockImplementation(
    (file: File, sheetName?: string, timeoutMs?: number) => {
      void timeoutMs;
      return io.parseFile(file, sheetName);
    }
  );
  io.downloadTemplateCsv.mockReset();
  io.trackProductEvent.mockReset();
  io.mediaQueryMatches = false;
});

afterEach(() => {
  cleanup();
});

describe("FileUploadStep", () => {
  it("calls the template download handler", async () => {
    const user = userEvent.setup();
    render(<FileUploadStep onFileParsed={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "upload.templateLink" }));
    expect(io.downloadTemplateCsv).toHaveBeenCalledWith("en");
  });

  it("swaps the file-chip icon to AlertTriangle when parse fails", async () => {
    io.parseFile.mockResolvedValue({ ok: false, error: "xls_not_supported" });
    const user = userEvent.setup();
    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["not-real"], "legacy.xls", { type: "application/vnd.ms-excel" });
    await user.upload(input, file);

    await screen.findByRole("alert");
    expect(screen.getByText("upload.errors.xlsNotSupported")).toBeInTheDocument();
    expect(screen.getByText("legacy.xls")).toBeInTheDocument();
    const chip = screen.getByText("legacy.xls").closest("div");
    expect(chip?.querySelector(".text-destructive")).toBeTruthy();
    expect(chip?.querySelector(".text-green-600")).toBeNull();
  });

  it("shows a radio list for 5 sheets", async () => {
    const user = userEvent.setup();
    io.parseFile.mockResolvedValue({
      ok: true,
      file: parsedStub({ availableSheets: ["A", "B", "C", "D", "E"] }),
    });

    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["x"], "five.xlsx"));

    await screen.findByText("upload.sheetSelect.title");
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows a select for 6 sheets", async () => {
    const user = userEvent.setup();
    io.parseFile.mockResolvedValue({
      ok: true,
      file: parsedStub({
        availableSheets: ["A", "B", "C", "D", "E", "F"],
      }),
    });

    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["x"], "six.xlsx"));

    await screen.findByText("upload.sheetSelect.title");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the legacy .xls message only for xls_not_supported", async () => {
    io.parseFile.mockResolvedValue({ ok: false, error: "xls_not_supported" });
    const user = userEvent.setup();
    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])], "binary.xls", {
        type: "application/vnd.ms-excel",
      })
    );
    expect(await screen.findByText("upload.errors.xlsNotSupported")).toBeInTheDocument();
  });

  it("shows pdfNotSupported for a .pdf extension without parsing", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File(["%PDF-1.4 fake"], "hapoalim.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByText("upload.errors.pdfNotSupported")).toBeInTheDocument();
    expect(io.parseFile).not.toHaveBeenCalled();
    expect(io.trackProductEvent).toHaveBeenCalledWith(
      "transaction_import_parse_error",
      expect.objectContaining({
        step: "upload",
        errorCode: "pdf",
        fileExtension: "other",
      }),
    );
    const payload = io.trackProductEvent.mock.calls.find(
      (c) => c[0] === "transaction_import_parse_error",
    )?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("fileName");
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("size");
    expect(JSON.stringify(payload)).not.toMatch(/hapoalim|PDF-1\.4/i);
  });

  it("shows pdfNotSupported for a %PDF- file renamed to .csv", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUploadStep onFileParsed={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const bytes = new TextEncoder().encode("%PDF-1.7 disguised");
    await user.upload(
      input,
      new File([bytes], "statement.csv", { type: "text/csv" }),
    );

    expect(await screen.findByText("upload.errors.pdfNotSupported")).toBeInTheDocument();
    expect(io.parseFile).not.toHaveBeenCalled();
    expect(io.trackProductEvent).toHaveBeenCalledWith(
      "transaction_import_parse_error",
      expect.objectContaining({ errorCode: "pdf", fileExtension: "csv" }),
    );
  });

  it("still parses .xlsx and .csv when they are not PDFs", async () => {
    io.parseFile.mockResolvedValue({ ok: true, file: parsedStub() });
    const onFileParsed = vi.fn();
    const user = userEvent.setup();
    const { container, rerender } = render(
      <FileUploadStep onFileParsed={onFileParsed} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["date,amount\n"], "ok.csv", { type: "text/csv" }));
    await waitFor(() => expect(onFileParsed).toHaveBeenCalledTimes(1));

    onFileParsed.mockClear();
    io.parseFile.mockClear();
    io.trackProductEvent.mockClear();
    rerender(<FileUploadStep onFileParsed={onFileParsed} />);
    const input2 = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input2,
      new File(["PK\u0003\u0004"], "ok.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    await waitFor(() => expect(io.parseFile).toHaveBeenCalled());
    expect(screen.queryByText("upload.errors.pdfNotSupported")).not.toBeInTheDocument();
  });

  it("reaches mapping when an HTML-as-.xls bank fixture parses", async () => {
    expect(io.actualParseFile).toBeTruthy();
    io.parseFile.mockImplementation((file: File, sheetName?: string) =>
      io.actualParseFile!(file, sheetName)
    );
    const onFileParsed = vi.fn();

    const user = userEvent.setup();
    const { container } = render(<FileUploadStep onFileParsed={onFileParsed} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File([LEUMI_HTML_XLS], "leumi-html.xls", {
        type: "application/vnd.ms-excel",
      })
    );

    await waitFor(() => expect(onFileParsed).toHaveBeenCalledTimes(1));
    expect(io.parseFileInWorker).toHaveBeenCalled();
    expect(io.parseFileInWorker.mock.calls[0]?.[2]).toBe(15000);
    const [parsed, meta] = onFileParsed.mock.calls[0];
    expect(parsed.headers[0]).toBe("תאריך");
    expect(meta.fileExtension).toBe("xls");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
