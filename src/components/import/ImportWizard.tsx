import { useReducer, useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, ArrowRight, X, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandSpinner } from "@/components/brand/BrandSpinner";
import { cn } from "@/lib/utils/index";
import { withTimeout } from "@/lib/utils/with-timeout";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "@tanstack/react-router";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import { clearCategoryCache } from "@/lib/data-layer/categories.service";
import { clearPaymentMethodCache } from "@/lib/data-layer/paymentMethods.service";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { logger } from "@/lib/logger";
import {
  notifyOnboardingImportReached,
  subscribeOnboardingImportMappingNext,
  subscribeOnboardingImportWizardScreen,
} from "@/lib/onboarding/importWizardBridge";
import type {
  ColumnMapping,
  ImportFlowError,
  ImportPreviewRow,
  ImportResult,
  ImportTargetField,
  ParsedFile,
} from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import type { TransactionDraftV1 } from "@/lib/intake/contracts";
import { draftToNormalizedRow } from "@/lib/intake/draft-to-import";
import {
  suggestMappings,
  detectTen10Template,
  analyzeParsedFile,
  buildPreviewRows,
  previewRowsFromNormalized,
  computeImportSummary,
  persistApprovedImport,
} from "@/lib/import/index";
import {
  fetchExistingForDedup,
  fetchRecurringForImport,
} from "@/lib/import/persist-approved-import";
import {
  rowCountBucket as toRowCountBucket,
  type ImportFileExtension,
} from "@/lib/import/import-analytics";
import {
  getMappingIssues,
  issueColumns,
  mappingIssueErrorCodes,
} from "@/lib/import/mapping-issues";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FileUploadStep, type FileParsedMeta } from "./steps/FileUploadStep";
import { ColumnMappingStep } from "./steps/ColumnMappingStep";
import { ImportReviewStep } from "./steps/ImportReviewStep";
import { ImportResultStep } from "./steps/ImportResultStep";
import { PageTourButton } from "@/components/onboarding/PageTourButton";

const IMPORT_PREVIEW_FETCH_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type WizardStep = "upload" | "mapping" | "review" | "result";

interface WizardState {
  step: WizardStep;
  parsedFile: ParsedFile | null;
  columnMappings: ColumnMapping[];
  isTen10Template: boolean;
  autoMappedColumns: Record<string, ImportTargetField>;
  fileExtension: ImportFileExtension | null;
  rowCountBucket: string | null;
  previewRows: ImportPreviewRow[];
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  isProcessingRows: boolean;
  isImporting: boolean;
  importResult: ImportResult | null;
  confirmOpen: boolean;
  processingError: ImportFlowError | null;
}

type WizardAction =
  | { type: "SET_STEP"; step: WizardStep }
  | {
      type: "FILE_PARSED";
      file: ParsedFile;
      mappings: ColumnMapping[];
      isTen10: boolean;
      autoMappedColumns: Record<string, ImportTargetField>;
      fileExtension: ImportFileExtension;
    }
  | { type: "UPDATE_MAPPING"; sourceColumn: string; targetField: ImportTargetField | null }
  | { type: "SET_EXISTING_TRANSACTIONS"; transactions: Transaction[] }
  | { type: "SET_RECURRING_TRANSACTIONS"; transactions: RecurringTransaction[] }
  | { type: "SET_PREVIEW_ROWS"; rows: ImportPreviewRow[]; processing: boolean }
  | { type: "SET_PROCESSING_ERROR"; error: ImportFlowError | null }
  | { type: "UPDATE_ROW"; id: string; updates: Partial<ImportPreviewRow> }
  | { type: "TOGGLE_APPROVAL"; id: string; approved: boolean }
  | { type: "BULK_TOGGLE"; ids: string[]; approved: boolean }
  | { type: "BULK_UPDATE_ROWS"; rows: ImportPreviewRow[] }
  | { type: "TOGGLE_ALL_READY" }
  | { type: "CLEAR_SELECTION" }
  | { type: "OPEN_CONFIRM" }
  | { type: "CLOSE_CONFIRM" }
  | { type: "IMPORT_START" }
  | { type: "IMPORT_DONE"; result: ImportResult }
  | { type: "RESET" };

const initialState: WizardState = {
  step: "upload",
  parsedFile: null,
  columnMappings: [],
  isTen10Template: false,
  autoMappedColumns: {},
  fileExtension: null,
  rowCountBucket: null,
  previewRows: [],
  existingTransactions: [],
  recurringTransactions: [],
  isProcessingRows: false,
  isImporting: false,
  importResult: null,
  confirmOpen: false,
  processingError: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };

    case "FILE_PARSED":
      return {
        ...state,
        parsedFile: action.file,
        columnMappings: action.mappings,
        isTen10Template: action.isTen10,
        autoMappedColumns: action.autoMappedColumns,
        fileExtension: action.fileExtension,
        rowCountBucket: toRowCountBucket(action.file.rowCount),
        processingError: null,
        step: "mapping",
      };

    case "UPDATE_MAPPING": {
      const mappings = state.columnMappings.map((m) =>
        m.sourceColumn === action.sourceColumn
          ? { ...m, targetField: action.targetField }
          : m
      );
      return { ...state, columnMappings: mappings };
    }

    case "SET_EXISTING_TRANSACTIONS":
      return { ...state, existingTransactions: action.transactions };

    case "SET_RECURRING_TRANSACTIONS":
      return { ...state, recurringTransactions: action.transactions };

    case "SET_PREVIEW_ROWS":
      return {
        ...state,
        previewRows: action.rows,
        isProcessingRows: action.processing,
        processingError: null,
        step: action.processing ? state.step : "review",
      };

    case "SET_PROCESSING_ERROR":
      return {
        ...state,
        isProcessingRows: false,
        processingError: action.error,
      };

    case "UPDATE_ROW":
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          r.id === action.id ? { ...r, ...action.updates } : r
        ),
      };

    case "TOGGLE_APPROVAL":
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          r.id === action.id ? { ...r, approved: action.approved } : r
        ),
      };

    case "BULK_TOGGLE": {
      const idSet = new Set(action.ids);
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          idSet.has(r.id) && r.status !== "invalid" && r.approved !== action.approved
            ? { ...r, approved: action.approved }
            : r
        ),
      };
    }

    case "BULK_UPDATE_ROWS":
      return {
        ...state,
        previewRows: action.rows,
      };

    case "TOGGLE_ALL_READY":
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          r.status === "ready" && !r.approved ? { ...r, approved: true } : r
        ),
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          r.approved ? { ...r, approved: false } : r
        ),
      };

    case "OPEN_CONFIRM":
      return { ...state, confirmOpen: true };

    case "CLOSE_CONFIRM":
      return { ...state, confirmOpen: false };

    case "IMPORT_START":
      return { ...state, isImporting: true, confirmOpen: false };

    case "IMPORT_DONE":
      return {
        ...state,
        isImporting: false,
        importResult: action.result,
        step: "result",
      };

    case "RESET":
      return { ...initialState };

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

interface ImportLoadingStateProps {
  title: string;
  description: string;
  showSkeleton?: boolean;
}

function ImportLoadingState({ title, description, showSkeleton = true }: ImportLoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-10"
      aria-live="polite"
      aria-busy="true"
    >
      <BrandSpinner className="h-12 w-12" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {showSkeleton && (
        <div className="w-full rounded-md border overflow-hidden">
          <div className="grid grid-cols-[40px_48px_110px_1fr_110px_90px] gap-3 border-b bg-muted/40 px-3 py-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[40px_48px_110px_1fr_110px_90px] items-center gap-3 px-3 py-2.5"
              >
                <Skeleton className="h-4 w-4 justify-self-center" />
                <Skeleton className="h-3.5 w-6 justify-self-center" />
                <Skeleton className="h-6 w-20 justify-self-center rounded-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-16 justify-self-center" />
                <Skeleton className="h-8 w-14 justify-self-center" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ImportProcessingErrorStateProps {
  error: ImportFlowError;
  onRetry: () => void;
  onBackToMapping: () => void;
  onStartOver: () => void;
}

function ImportProcessingErrorState({
  error,
  onRetry,
  onBackToMapping,
  onStartOver,
}: ImportProcessingErrorStateProps) {
  const { t } = useTranslation("import");

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center" aria-live="assertive">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-base font-semibold">{t("review.processingError.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(`review.processingError.codes.${error.code}`, {
            defaultValue: t("review.processingError.description"),
          })}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onRetry}>{t("review.processingError.retry")}</Button>
        <Button variant="outline" onClick={onBackToMapping}>
          {t("review.processingError.backToMapping")}
        </Button>
        <Button variant="ghost" onClick={onStartOver}>
          {t("navigation.startOver")}
        </Button>
      </div>
    </div>
  );
}

type ProcessingParams =
  | {
      source: "file";
      parsedFile: ParsedFile;
      columnMappings: ColumnMapping[];
      isTen10Template: boolean;
      defaultCurrency: string;
      platform: "web" | "desktop" | "loading";
    }
  | {
      source: "drafts";
      drafts: TransactionDraftV1[];
      defaultCurrency: string;
      platform: "web" | "desktop" | "loading";
    };

async function buildRowsFor(
  p: ProcessingParams,
  existingTransactions: Transaction[],
  recurringTransactions: RecurringTransaction[]
): Promise<ImportPreviewRow[]> {
  switch (p.source) {
    case "file": {
      logger.info("Import preview: building rows", {
        rowCount: p.parsedFile.rowCount,
        mappedColumns: p.columnMappings.filter((mapping) => mapping.targetField).length,
      });
      const { rows } = await buildPreviewRows(
        p.parsedFile,
        p.columnMappings,
        p.defaultCurrency as Parameters<typeof buildPreviewRows>[2],
        existingTransactions,
        recurringTransactions
      );
      return rows;
    }
    case "drafts":
      return previewRowsFromNormalized(
        p.drafts.map((draft) => draftToNormalizedRow(draft, { defaultCurrency: p.defaultCurrency })),
        existingTransactions,
        recurringTransactions
      );
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ImportWizardProps {
  /** AI drafts that open on the review step, without a file or column mapping. */
  initialRows?: TransactionDraftV1[];
}

export function ImportWizard({ initialRows }: ImportWizardProps) {
  const { t, i18n } = useTranslation("import");
  const navigate = useNavigate();
  const { platform } = usePlatform();
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);

  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [reviewSelectMode, setReviewSelectMode] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const mappingIssues = useMemo(
    () => getMappingIssues(state.columnMappings),
    [state.columnMappings]
  );
  const mappingBlocked = state.step === "mapping" && mappingIssues.length > 0;
  const blockedEventSentRef = useRef(false);

  const isRtl = i18n.dir() === "rtl";

  // Emit analytics on start
  useEffect(() => {
    trackProductEvent("transaction_import_started", { platform });
  }, [platform]);

  useEffect(() => {
    if (!mappingBlocked) {
      blockedEventSentRef.current = false;
      return;
    }
    if (blockedEventSentRef.current) return;
    blockedEventSentRef.current = true;
    trackProductEvent("transaction_import_mapping_blocked", {
      platform,
      step: "mapping",
      errorCodes: mappingIssueErrorCodes(mappingIssues),
      fileExtension: state.fileExtension,
      rowCountBucket: state.rowCountBucket,
    });
  }, [
    mappingBlocked,
    mappingIssues,
    platform,
    state.fileExtension,
    state.rowCountBucket,
  ]);

  useEffect(() => {
    return subscribeOnboardingImportWizardScreen((screen) => {
      if (screen === "upload" && state.step === "mapping") {
        dispatch({ type: "SET_STEP", step: "upload" });
        return;
      }
      if (screen === "mapping" && state.step === "review") {
        dispatch({ type: "SET_STEP", step: "mapping" });
      }
    });
  }, [state.step]);

  useEffect(() => {
    if (state.step === "mapping" || state.step === "review") {
      notifyOnboardingImportReached(state.step);
    }
  }, [state.step]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFileParsed = useCallback((file: ParsedFile, meta: FileParsedMeta) => {
    const isTen10 = detectTen10Template(file.headers);
    const mappings = suggestMappings(file.headers);
    const autoMappedColumns: Record<string, ImportTargetField> = {};
    for (const mapping of mappings) {
      if (mapping.targetField) {
        autoMappedColumns[mapping.sourceColumn] = mapping.targetField;
      }
    }
    const fileWithDiagnostics = {
      ...file,
      diagnostics: [
        ...(file.diagnostics ?? []),
        ...analyzeParsedFile(file, mappings),
      ],
    };
    dispatch({
      type: "FILE_PARSED",
      file: fileWithDiagnostics,
      mappings,
      isTen10,
      autoMappedColumns,
      fileExtension: meta.fileExtension,
    });
  }, []);

  const handleMappingChange = useCallback(
    (sourceColumn: string, targetField: ImportTargetField | null) => {
      dispatch({ type: "UPDATE_MAPPING", sourceColumn, targetField });
    },
    []
  );

  // Snapshot of params captured just before switching to the "processing" step.
  // Using a ref avoids adding these to the useEffect dependency array since
  // they don't change while the wizard is in the "processing" step.
  const processingParamsRef = useRef<ProcessingParams | null>(null);

  const scrollToFirstMappingIssue = useCallback(() => {
    const flagged = [...issueColumns(mappingIssues, state.columnMappings)];
    let target: HTMLElement | null = null;
    const rows = document.querySelectorAll<HTMLElement>("[data-mapping-column]");
    if (flagged.length > 0) {
      const first = flagged[0]!;
      for (const row of rows) {
        if (row.dataset.mappingColumn === first) {
          target = row;
          break;
        }
      }
    } else {
      // dateMissing / amountMissing: no flagged row — scroll to first unmapped column
      for (const row of rows) {
        if (row.dataset.mappingUnmapped === "true") {
          target = row;
          break;
        }
      }
      if (!target) target = rows[0] ?? null;
    }
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const picker =
      target?.matches?.("[data-mapping-picker]")
        ? target
        : target?.querySelector<HTMLElement>("[data-mapping-picker]");
    picker?.focus?.();
  }, [mappingIssues, state.columnMappings]);

  const handleMappingNext = useCallback(() => {
    if (getMappingIssues(state.columnMappings).length > 0) {
      return;
    }

    // Snapshot before the state change so the useEffect can read them safely.
    processingParamsRef.current = {
      source: "file",
      parsedFile: state.parsedFile!,
      columnMappings: state.columnMappings,
      isTen10Template: state.isTen10Template,
      defaultCurrency,
      platform,
    };

    dispatch({ type: "SET_PROCESSING_ERROR", error: null });
    // isProcessingRows: true keeps step="mapping" and swaps the visible
    // content to the loading skeleton. useEffect below does the heavy work
    // AFTER the browser has painted the loading state.
    dispatch({ type: "SET_PREVIEW_ROWS", rows: [], processing: true });
  }, [state.columnMappings, state.parsedFile, state.isTen10Template, defaultCurrency, platform]);

  const draftsStartedRef = useRef(false);

  // Layout effect: drafts path must not paint upload before review loads.
  useLayoutEffect(() => {
    if (!initialRows || platform === "loading" || draftsStartedRef.current) return;
    draftsStartedRef.current = true;
    processingParamsRef.current = {
      source: "drafts",
      drafts: initialRows,
      defaultCurrency,
      platform,
    };
    dispatch({ type: "SET_PREVIEW_ROWS", rows: [], processing: true });
  }, [initialRows, platform, defaultCurrency]);

  const handleRetryDrafts = useCallback(() => {
    dispatch({ type: "SET_PREVIEW_ROWS", rows: [], processing: true });
  }, []);

  useEffect(() => {
    return subscribeOnboardingImportMappingNext(() => {
      if (state.step !== "mapping" || state.isProcessingRows) return;
      handleMappingNext();
    });
  }, [handleMappingNext, state.step, state.isProcessingRows]);

  // Runs after isProcessingRows flips to true and the loading skeleton is
  // painted. Heavy async work runs here so the browser has already rendered
  // the loading state before anything blocks the JS thread.
  useEffect(() => {
    if (!state.isProcessingRows) return;
    const params = processingParamsRef.current;
    if (!params) {
      logger.error("Import preview processing started without parameters");
      dispatch({
        type: "SET_PROCESSING_ERROR",
        error: { code: "preview_failed", detail: "missing_processing_params" },
      });
      return;
    }

    let cancelled = false;

    async function runProcessing() {
      const p = params!;

      // Yield to the browser so the "processing" skeleton is painted before
      // any synchronous blocking work begins.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (cancelled) return;

      try {
        if (p.source === "file") {
          trackProductEvent("transaction_import_mapping_completed", {
            platform: p.platform,
            isTen10Template: p.isTen10Template,
          });
        }

        logger.info("Import preview: fetching context", { platform: p.platform });
        const [existingTransactions, recurringTransactions] = await withTimeout(
          Promise.all([
            fetchExistingForDedup(p.platform, null),
            fetchRecurringForImport(p.platform),
          ]),
          IMPORT_PREVIEW_FETCH_TIMEOUT_MS,
          "import_preview_context_timeout"
        );

        if (cancelled) return;
        dispatch({ type: "SET_EXISTING_TRANSACTIONS", transactions: existingTransactions });
        dispatch({ type: "SET_RECURRING_TRANSACTIONS", transactions: recurringTransactions });

        const rows = await buildRowsFor(p, existingTransactions, recurringTransactions);

        if (cancelled) return;
        processingParamsRef.current = null;
        logger.info("Import preview: rows ready", { rowCount: rows.length });
        dispatch({ type: "SET_PREVIEW_ROWS", rows, processing: false });
      } catch (err) {
        logger.error("Failed to build import preview:", err);
        if (cancelled) return;
        dispatch({
          type: "SET_PROCESSING_ERROR",
          error: {
            code: "preview_failed",
            detail: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    runProcessing();
    return () => { cancelled = true; };
  }, [state.isProcessingRows]); // params are captured via ref — no other deps needed

  const handleToggleApproval = useCallback((id: string, approved: boolean) => {
    dispatch({ type: "TOGGLE_APPROVAL", id, approved });
  }, []);

  const handleBulkToggle = useCallback((ids: string[], approved: boolean) => {
    dispatch({ type: "BULK_TOGGLE", ids, approved });
  }, []);

  const handleToggleAllReady = useCallback(() => {
    dispatch({ type: "TOGGLE_ALL_READY" });
  }, []);

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const handleUpdateRow = useCallback(
    (id: string, updates: Partial<ImportPreviewRow>) => {
      dispatch({ type: "UPDATE_ROW", id, updates });
    },
    []
  );

  const handleBulkUpdateRows = useCallback((rows: ImportPreviewRow[]) => {
    dispatch({ type: "BULK_UPDATE_ROWS", rows });
  }, []);

  const handleReviewNext = useCallback(() => {
    dispatch({ type: "OPEN_CONFIRM" });
  }, []);

  const handleConfirmImport = useCallback(async () => {
    dispatch({ type: "IMPORT_START" });

    try {
      const result = await persistApprovedImport(
        state.previewRows,
        platform,
        defaultCurrency
      );

      dispatch({ type: "IMPORT_DONE", result });

      // Refresh data stores after successful import.
      // Only setLastDbFetchTimestamp here — TransactionsTableDisplay calls
      // fetchTransactions(true, platform) in its own useEffect on mount, which
      // correctly uses the resolved platform from usePlatform(). Calling
      // fetchTransactions here created a fire-and-forget race where a stale
      // "web" platform value (PlatformContext OS-plugin fallback) could reach
      // supabase.auth.getUser() on desktop, leaving an auth error in the store.
      if (result.inserted > 0) {
        useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

        const hasNewCategories = state.previewRows.some(
          (r) => r.approved && r.normalized?.category
        );
        if (hasNewCategories) clearCategoryCache();

        const hasNewPaymentMethods = state.previewRows.some(
          (r) => r.approved && r.normalized?.payment_method
        );
        if (hasNewPaymentMethods) clearPaymentMethodCache();
      }

      const analyticsBase = {
        platform,
        step: "review" as const,
        fileExtension:
          state.fileExtension ??
          (state.parsedFile?.sheetName ? "xlsx" : ("csv" as ImportFileExtension)),
        rowCountBucket: state.rowCountBucket,
        isTen10Template: state.isTen10Template,
      };

      // persistApprovedImport returns errors instead of throwing.
      if (result.failed > 0 || result.errors.length > 0) {
        trackProductEvent("transaction_import_failed", {
          ...analyticsBase,
          errorCode: result.errors[0]?.code ?? "unknown",
          failedCount: result.failed,
          insertedCount: result.inserted,
        });
      } else {
        trackProductEvent("transaction_import_completed", {
          ...analyticsBase,
          approvedCount: result.inserted,
          failedCount: result.failed,
          skippedCount: result.skipped,
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown import error";

      trackProductEvent("transaction_import_failed", {
        platform,
        step: "review",
        errorCode: "unknown",
        failedCount: state.previewRows.filter((r) => r.approved).length,
        insertedCount: 0,
        fileExtension: state.fileExtension,
        rowCountBucket: state.rowCountBucket,
      });

      dispatch({
        type: "IMPORT_DONE",
        result: {
          inserted: 0,
          failed: state.previewRows.filter((r) => r.approved).length,
          skipped: 0,
          errors: [{ code: "unknown", detail: errorMsg }],
        },
      });
    }
  }, [
    state.previewRows,
    state.parsedFile,
    state.isTen10Template,
    state.fileExtension,
    state.rowCountBucket,
    platform,
    defaultCurrency,
  ]);

  const handleReset = useCallback(() => {
    setReviewSelectMode(false);
    dispatch({ type: "RESET" });
  }, []);

  const handleBackToMapping = useCallback(() => {
    dispatch({ type: "SET_PROCESSING_ERROR", error: null });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const summary = useMemo(
    () => computeImportSummary(state.previewRows),
    [state.previewRows]
  );

  const approvedCount = summary.approved;
  const riskyApproved = useMemo(
    () =>
      state.previewRows.filter(
        (r) =>
          r.approved &&
          r.issues.some(
            (i) =>
              i.code === "possible_duplicate" || i.code === "possible_recurring"
          )
      ).length,
    [state.previewRows]
  );

  // ---------------------------------------------------------------------------
  // Step navigation helpers
  // ---------------------------------------------------------------------------

  const STEPS: WizardStep[] = ["upload", "mapping", "review", "result"];
  const labeledSteps = STEPS.filter((s) => s !== "result");
  const currentStepIndex = STEPS.indexOf(state.step);
  const labeledStepIndex = Math.max(0, labeledSteps.indexOf(state.step as (typeof labeledSteps)[number]));
  const progressPercent = (currentStepIndex / (STEPS.length - 1)) * 100;

  // Separate animation keys so loaders get their own enter/exit, independent
  // of the underlying step key — prevents re-rendering with stale state.
  const animationKey = state.processingError
    ? "__processing_error__"
    : state.isProcessingRows
      ? "__loading__"
      : state.isImporting
        ? "__importing__"
        : state.step;

  function canGoBack() {
    // Drafts reach review without a file, so there is no mapping to return to.
    if (state.step === "review") return state.parsedFile !== null;
    return state.step !== "upload" && state.step !== "result";
  }

  function handleBack() {
    switch (state.step) {
      case "upload":
        break;
      case "mapping":
        dispatch({ type: "SET_STEP", step: "upload" });
        break;
      case "review":
        dispatch({ type: "SET_STEP", step: "mapping" });
        break;
      case "result":
        break;
      default: {
        const _exhaustive: never = state.step;
        void _exhaustive;
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  const exitButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 shrink-0"
      onClick={() => navigate({ to: "/transactions-table" })}
      aria-label={t("navigation.cancel")}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  );

  return (
    <div
      className={cn(
        "space-y-6",
        state.step === "review" &&
          "[@media(max-width:767px)_and_(max-height:700px)]:space-y-3",
      )}
    >
      {/* Mobile header (<768px): title + compact step + tour + close, then progress bar */}
      <div
        className={cn(
          "md:hidden space-y-3",
          state.step === "review" &&
            "[@media(max-width:767px)_and_(max-height:700px)]:space-y-2",
        )}
      >
        <div className="flex items-center gap-2" data-onboarding="import-intro">
          <h1 className="text-[17px] font-semibold flex-1 min-w-0 truncate">{t("title")}</h1>
          {state.step !== "result" && (
            <span className="text-[13px] text-muted-foreground whitespace-nowrap shrink-0">
              {t("steps.compact", {
                current: labeledStepIndex + 1,
                label: t(`steps.${state.step}`),
              })}
            </span>
          )}
          {state.step === "upload" && (
            <PageTourButton tour="import" className="h-11 w-11" />
          )}
          {exitButton}
        </div>
        {state.step !== "result" && (
          <div
            className="h-1 overflow-hidden rounded-full bg-muted"
            data-onboarding="import-steps"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-start justify-between gap-4">
        <div className="space-y-1" data-onboarding="import-intro">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {state.step === "upload" && <PageTourButton tour="import" />}
          {exitButton}
        </div>
      </div>

      {/* Desktop step indicator — 3 dots */}
      {state.step !== "result" && (
        <div className="relative hidden md:block py-1" data-onboarding="import-steps">
          <div className="absolute top-[14px] inset-x-0 h-0.5 bg-border" />
          <div
            className={cn(
              "absolute top-[14px] h-0.5 bg-primary transition-[width] duration-300",
              isRtl ? "right-0" : "left-0"
            )}
            style={{ width: `${progressPercent}%` }}
          />
          <div className="relative flex justify-between">
            {labeledSteps.map((s, i) => {
              const isCompleted = currentStepIndex > i;
              const isActive = currentStepIndex === i;
              return (
                <div
                  key={s}
                  className="flex flex-col items-center gap-1.5 z-10"
                  aria-current={isActive ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-background transition-colors",
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] whitespace-nowrap",
                      isActive
                        ? "text-foreground font-semibold"
                        : isCompleted
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  >
                    {t(`steps.${s}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step content */}
      <Card>
        <CardContent
          className={cn(
            "p-4 md:p-6",
            state.step === "review" &&
              "[@media(max-width:767px)_and_(max-height:700px)]:p-3",
          )}
        >
          <div key={animationKey}>
              {animationKey === "upload" && (
                <FileUploadStep onFileParsed={handleFileParsed} />
              )}

              {animationKey === "mapping" && state.parsedFile && (
                <ColumnMappingStep
                  parsedFile={state.parsedFile}
                  mappings={state.columnMappings}
                  isTen10Template={state.isTen10Template}
                  issues={mappingIssues}
                  autoMappedColumns={state.autoMappedColumns}
                  onMappingChange={handleMappingChange}
                />
              )}

              {animationKey === "__loading__" && (
                <ImportLoadingState
                  title={t("review.previewLoadingTitle")}
                  description={t("review.previewLoadingDescription")}
                />
              )}

              {animationKey === "__processing_error__" && state.processingError && (
                <ImportProcessingErrorState
                  error={state.processingError}
                  onRetry={state.parsedFile ? handleMappingNext : handleRetryDrafts}
                  onBackToMapping={handleBackToMapping}
                  onStartOver={handleReset}
                />
              )}

              {animationKey === "__importing__" && (
                <ImportLoadingState
                  title={t("importing.loadingTitle")}
                  description={t("importing.loadingDescription")}
                  showSkeleton={false}
                />
              )}

              {animationKey === "review" && (
                <ImportReviewStep
                  rows={state.previewRows}
                  summary={summary}
                  onToggleApproval={handleToggleApproval}
                  onBulkToggle={handleBulkToggle}
                  onToggleAllReady={handleToggleAllReady}
                  onClearSelection={handleClearSelection}
                  onUpdateRow={handleUpdateRow}
                  onBulkUpdateRows={handleBulkUpdateRows}
                  onSelectModeChange={setReviewSelectMode}
                  existingTransactions={state.existingTransactions}
                  recurringTransactions={state.recurringTransactions}
                />
              )}

              {animationKey === "result" && state.importResult && (
                <ImportResultStep
                  result={state.importResult}
                  onImportAnother={handleReset}
                />
              )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation footer — sticky so the import button stays visible while scrolling */}
      {state.step !== "result" &&
        state.step !== "upload" &&
        !state.processingError &&
        !(state.step === "review" && reviewSelectMode) && (
        <div
          className={cn(
            "sticky bottom-0 z-10 space-y-0 bg-background/95 backdrop-blur-sm border-t border-border pt-3 -mx-1 px-1",
            "pb-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          )}
          data-onboarding-import-nav=""
        >
          {state.step === "mapping" && mappingBlocked && isMobile && (
            <button
              type="button"
              id="mapping-issues-summary"
              onClick={scrollToFirstMappingIssue}
              className="flex h-11 w-full items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-3 text-red-700"
              aria-label={t("mapping.summary.show")}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("mapping.summary.remaining", { count: mappingIssues.length })}
              </span>
              <span className="text-sm font-semibold underline-offset-2">
                {t("mapping.summary.show")} ↑
              </span>
            </button>
          )}

          <div className="flex justify-between gap-3 pt-0 max-md:items-stretch">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack() || state.isProcessingRows || state.isImporting}
              className="gap-1.5 max-md:h-11"
            >
              <BackIcon className="h-4 w-4" aria-hidden="true" />
              {t("navigation.back")}
            </Button>

            <div className="flex gap-2 max-md:flex-1 max-md:justify-end items-center">
              {state.step === "mapping" && mappingBlocked && !isMobile && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-sm text-destructive me-1">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {t("mapping.summary.remaining", { count: mappingIssues.length })}
                </span>
              )}

              {state.step === "mapping" && (
                <Button
                  onClick={handleMappingNext}
                  disabled={state.isProcessingRows || mappingBlocked}
                  aria-disabled={mappingBlocked || state.isProcessingRows}
                  aria-describedby={
                    mappingBlocked ? "mapping-issues-summary" : undefined
                  }
                  className="gap-1.5 max-md:h-11 max-md:flex-1"
                >
                  {state.isProcessingRows
                    ? t("review.processing")
                    : t("navigation.next")}
                  {!state.isProcessingRows && <NextIcon className="h-4 w-4" aria-hidden="true" />}
                </Button>
              )}

              {state.step === "review" && (
                <Button
                  onClick={handleReviewNext}
                  disabled={approvedCount === 0 || state.isImporting}
                  className="gap-1.5 max-md:h-11 max-md:flex-1"
                  data-onboarding="import-approve"
                >
                  {t("review.saveCta", { count: approvedCount })}
                  <NextIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={state.confirmOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_CONFIRM" })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirm.title", { count: approvedCount })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("confirm.description", { count: approvedCount })}
            </p>
            {riskyApproved > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                {t("confirm.riskyRows", { count: riskyApproved })}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => dispatch({ type: "CLOSE_CONFIRM" })}
            >
              {t("confirm.cancel")}
            </Button>
            <Button onClick={handleConfirmImport} disabled={state.isImporting}>
              {state.isImporting ? t("review.processing") : t("confirm.proceed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
