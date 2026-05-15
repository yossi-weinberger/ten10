import { useReducer, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, X, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/index";
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
import type {
  ColumnMapping,
  ImportPreviewRow,
  ImportResult,
  ImportTargetField,
  ParsedFile,
  MappingValidationError,
} from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import {
  suggestMappings,
  validateMappings,
  detectTen10Template,
  buildPreviewRows,
  computeImportSummary,
  persistApprovedImport,
} from "@/lib/import/index";
import {
  fetchExistingForDedup,
  fetchRecurringForImport,
} from "@/lib/import/persist-approved-import";
import { FileUploadStep } from "./steps/FileUploadStep";
import { ColumnMappingStep } from "./steps/ColumnMappingStep";
import { ImportReviewStep } from "./steps/ImportReviewStep";
import { ImportResultStep } from "./steps/ImportResultStep";
import { PrepareStep } from "./steps/PrepareStep";
import { AnimatePresence, motion } from "framer-motion";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type WizardStep = "prepare" | "upload" | "mapping" | "review" | "result";

interface WizardState {
  step: WizardStep;
  parsedFile: ParsedFile | null;
  columnMappings: ColumnMapping[];
  isTen10Template: boolean;
  mappingErrors: MappingValidationError[];
  previewRows: ImportPreviewRow[];
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  isProcessingRows: boolean;
  isImporting: boolean;
  importResult: ImportResult | null;
  confirmOpen: boolean;
}

type WizardAction =
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "FILE_PARSED"; file: ParsedFile; mappings: ColumnMapping[]; isTen10: boolean }
  | { type: "UPDATE_MAPPING"; sourceColumn: string; targetField: ImportTargetField | null }
  | { type: "SET_MAPPING_ERRORS"; errors: MappingValidationError[] }
  | { type: "SET_EXISTING_TRANSACTIONS"; transactions: Transaction[] }
  | { type: "SET_RECURRING_TRANSACTIONS"; transactions: RecurringTransaction[] }
  | { type: "SET_PREVIEW_ROWS"; rows: ImportPreviewRow[]; processing: boolean }
  | { type: "UPDATE_ROW"; id: string; updates: Partial<ImportPreviewRow> }
  | { type: "TOGGLE_APPROVAL"; id: string; approved: boolean }
  | { type: "BULK_TOGGLE"; ids: string[]; approved: boolean }
  | { type: "TOGGLE_ALL_READY" }
  | { type: "CLEAR_SELECTION" }
  | { type: "OPEN_CONFIRM" }
  | { type: "CLOSE_CONFIRM" }
  | { type: "IMPORT_START" }
  | { type: "IMPORT_DONE"; result: ImportResult }
  | { type: "RESET" };

const initialState: WizardState = {
  step: "prepare",
  parsedFile: null,
  columnMappings: [],
  isTen10Template: false,
  mappingErrors: [],
  previewRows: [],
  existingTransactions: [],
  recurringTransactions: [],
  isProcessingRows: false,
  isImporting: false,
  importResult: null,
  confirmOpen: false,
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
        mappingErrors: [],
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

    case "SET_MAPPING_ERRORS":
      return { ...state, mappingErrors: action.errors };

    case "SET_EXISTING_TRANSACTIONS":
      return { ...state, existingTransactions: action.transactions };

    case "SET_RECURRING_TRANSACTIONS":
      return { ...state, recurringTransactions: action.transactions };

    case "SET_PREVIEW_ROWS":
      return {
        ...state,
        previewRows: action.rows,
        isProcessingRows: action.processing,
        step: action.processing ? state.step : "review",
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
      <img
        src="/logo/symbol.svg"
        alt=""
        aria-hidden="true"
        className="h-12 w-12 animate-spin"
      />
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportWizard() {
  const { t, i18n } = useTranslation("import");
  const navigate = useNavigate();
  const { platform } = usePlatform();
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);

  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const isRtl = i18n.dir() === "rtl";

  // Preload the spinner logo so it is already cached when the loading state appears.
  useEffect(() => {
    const img = new Image();
    img.src = "/logo/symbol.svg";
  }, []);

  // Emit analytics on start
  useEffect(() => {
    trackProductEvent("transaction_import_started", { platform });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFileParsed = useCallback(
    (file: ParsedFile) => {
      const isTen10 = detectTen10Template(file.headers);
      const mappings = suggestMappings(file.headers);
      dispatch({
        type: "FILE_PARSED",
        file,
        mappings,
        isTen10,
      });
    },
    []
  );

  const handleMappingChange = useCallback(
    (sourceColumn: string, targetField: ImportTargetField | null) => {
      dispatch({ type: "UPDATE_MAPPING", sourceColumn, targetField });
    },
    []
  );

  // Snapshot of params captured just before switching to the "processing" step.
  // Using a ref avoids adding these to the useEffect dependency array since
  // they don't change while the wizard is in the "processing" step.
  const processingParamsRef = useRef<{
    parsedFile: ParsedFile;
    columnMappings: ColumnMapping[];
    isTen10Template: boolean;
    defaultCurrency: string;
    platform: "web" | "desktop" | "loading";
  } | null>(null);

  const handleMappingNext = useCallback(() => {
    const validation = validateMappings(state.columnMappings);
    if (!validation.valid) {
      dispatch({ type: "SET_MAPPING_ERRORS", errors: validation.errors });
      return;
    }

    // Snapshot before the state change so the useEffect can read them safely.
    processingParamsRef.current = {
      parsedFile: state.parsedFile!,
      columnMappings: state.columnMappings,
      isTen10Template: state.isTen10Template,
      defaultCurrency,
      platform,
    };

    dispatch({ type: "SET_MAPPING_ERRORS", errors: [] });
    // isProcessingRows: true keeps step="mapping" and swaps the visible
    // content to the loading skeleton. useEffect below does the heavy work
    // AFTER the browser has painted the loading state.
    dispatch({ type: "SET_PREVIEW_ROWS", rows: [], processing: true });
  }, [state.columnMappings, state.parsedFile, state.isTen10Template, defaultCurrency, platform]);

  // Runs after isProcessingRows flips to true and the loading skeleton is
  // painted. Heavy async work runs here so the browser has already rendered
  // the loading state before anything blocks the JS thread.
  useEffect(() => {
    if (!state.isProcessingRows) return;
    const params = processingParamsRef.current;
    if (!params) return;

    let cancelled = false;

    async function runProcessing() {
      const p = params!;

      // Yield to the browser so the "processing" skeleton is painted before
      // any synchronous blocking work begins.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (cancelled) return;

      trackProductEvent("transaction_import_mapping_completed", {
        platform: p.platform,
        isTen10Template: p.isTen10Template,
      });

      const [existingTransactions, recurringTransactions] = await Promise.all([
        fetchExistingForDedup(p.platform, null),
        fetchRecurringForImport(p.platform),
      ]);

      if (cancelled) return;
      dispatch({ type: "SET_EXISTING_TRANSACTIONS", transactions: existingTransactions });
      dispatch({ type: "SET_RECURRING_TRANSACTIONS", transactions: recurringTransactions });

      const { rows } = await buildPreviewRows(
        p.parsedFile,
        p.columnMappings,
        p.defaultCurrency as Parameters<typeof buildPreviewRows>[2],
        existingTransactions,
        recurringTransactions
      );

      if (cancelled) return;
      processingParamsRef.current = null;
      dispatch({ type: "SET_PREVIEW_ROWS", rows, processing: false });
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

      trackProductEvent("transaction_import_completed", {
        platform,
        approvedCount: result.inserted,
        failedCount: result.failed,
        skippedCount: result.skipped,
        fileType: state.parsedFile?.sheetName ? "xlsx" : "csv",
        isTen10Template: state.isTen10Template,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown import error";

      trackProductEvent("transaction_import_failed", {
        platform,
        error: errorMsg.slice(0, 100),
      });

      dispatch({
        type: "IMPORT_DONE",
        result: {
          inserted: 0,
          failed: state.previewRows.filter((r) => r.approved).length,
          skipped: 0,
          errors: [errorMsg],
        },
      });
    }
  }, [state.previewRows, state.parsedFile, state.isTen10Template, platform, defaultCurrency]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
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

  const STEPS: WizardStep[] = ["prepare", "upload", "mapping", "review", "result"];
  const currentStepIndex = STEPS.indexOf(state.step);
  const progressPercent = (currentStepIndex / (STEPS.length - 1)) * 100;

  // Separate animation keys so loaders get their own enter/exit, independent
  // of the underlying step key — prevents re-rendering with stale state.
  const animationKey = state.isProcessingRows
    ? "__loading__"
    : state.isImporting
      ? "__importing__"
      : state.step;

  function canGoBack() {
    return state.step !== "prepare" && state.step !== "result";
  }

  function handleBack() {
    switch (state.step) {
      case "upload":
        dispatch({ type: "SET_STEP", step: "prepare" });
        break;
      case "mapping":
        dispatch({ type: "SET_STEP", step: "upload" });
        break;
      case "review":
        dispatch({ type: "SET_STEP", step: "mapping" });
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/transactions-table" })}
          aria-label={t("navigation.cancel")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Step indicator */}
      {state.step !== "result" && (
        <div className="relative py-1">
          {/* Background line */}
          <div className="absolute top-[14px] inset-x-0 h-0.5 bg-border" />
          {/* Filled line — mirrors horizontally in RTL */}
          <div
            className={cn("absolute top-[14px] h-0.5 bg-primary transition-[width] duration-300", isRtl ? "right-0" : "left-0")}
            style={{ width: `${progressPercent}%` }}
          />
          {/* Dots + labels */}
          <div className="relative flex justify-between">
            {STEPS.filter((s) => s !== "result").map((s, i) => {
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
                      isActive ? "text-foreground font-semibold" : isCompleted ? "text-primary" : "text-muted-foreground"
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
        <CardContent className="p-4 md:p-6">
          {/*
           * animationKey drives the fade-in of new content.
           * No `exit` prop — exiting elements disappear immediately so they
           * can never re-render with stale state and cause a white flash.
           */}
          <AnimatePresence>
            <motion.div
              key={animationKey}
              initial={animationKey === "__loading__" || animationKey === "__importing__"
                ? { opacity: 1 }
                : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {animationKey === "prepare" && (
                <PrepareStep onNext={() => dispatch({ type: "SET_STEP", step: "upload" })} />
              )}

              {animationKey === "upload" && (
                <FileUploadStep onFileParsed={handleFileParsed} />
              )}

              {animationKey === "mapping" && state.parsedFile && (
                <ColumnMappingStep
                  parsedFile={state.parsedFile}
                  mappings={state.columnMappings}
                  isTen10Template={state.isTen10Template}
                  validationErrors={state.mappingErrors}
                  onMappingChange={handleMappingChange}
                />
              )}

              {animationKey === "__loading__" && (
                <ImportLoadingState
                  title={t("review.previewLoadingTitle")}
                  description={t("review.previewLoadingDescription")}
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
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation footer */}
      {state.step !== "result" && state.step !== "prepare" && (
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={!canGoBack() || state.isProcessingRows || state.isImporting}
            className="gap-1.5"
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {t("navigation.back")}
          </Button>

          <div className="flex gap-2">
            {state.step === "mapping" && (
              <Button
                onClick={handleMappingNext}
                disabled={state.isProcessingRows}
                className="gap-1.5"
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
                className="gap-1.5"
              >
                {t("confirm.proceed")} ({approvedCount})
                <NextIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={state.confirmOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_CONFIRM" })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("confirm.description_other", { count: approvedCount })}
            </p>
            {riskyApproved > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                {t("confirm.riskyRows_other", { count: riskyApproved })}
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
