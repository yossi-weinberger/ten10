import { useReducer, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, X, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import type {
  ColumnMapping,
  ImportPreviewRow,
  ImportResult,
  ImportTargetField,
  ParsedFile,
  MappingValidationError,
} from "@/lib/import/import-session.types";
import type { Transaction } from "@/types/transaction";
import {
  suggestMappings,
  validateMappings,
  detectTen10Template,
  buildPreviewRows,
  computeImportSummary,
  persistApprovedImport,
} from "@/lib/import/index";
import { fetchExistingForDedup } from "@/lib/import/persist-approved-import";
import { FileUploadStep } from "./steps/FileUploadStep";
import { ColumnMappingStep } from "./steps/ColumnMappingStep";
import { ImportReviewStep } from "./steps/ImportReviewStep";
import { ImportResultStep } from "./steps/ImportResultStep";
import { PrepareStep } from "./steps/PrepareStep";

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
          idSet.has(r.id) && r.status !== "invalid"
            ? { ...r, approved: action.approved }
            : r
        ),
      };
    }

    case "TOGGLE_ALL_READY":
      return {
        ...state,
        previewRows: state.previewRows.map((r) =>
          r.status === "ready" ? { ...r, approved: true } : r
        ),
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        previewRows: state.previewRows.map((r) => ({ ...r, approved: false })),
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

  const handleMappingNext = useCallback(async () => {
    const validation = validateMappings(state.columnMappings);
    if (!validation.valid) {
      dispatch({ type: "SET_MAPPING_ERRORS", errors: validation.errors });
      return;
    }

    dispatch({ type: "SET_MAPPING_ERRORS", errors: [] });
    dispatch({ type: "SET_PREVIEW_ROWS", rows: [], processing: true });

    trackProductEvent("transaction_import_mapping_completed", {
      platform,
      isTen10Template: state.isTen10Template,
    });

    // Fetch existing transactions for duplicate detection
    const existingTransactions = await fetchExistingForDedup(platform);
    dispatch({ type: "SET_EXISTING_TRANSACTIONS", transactions: existingTransactions });

    const rows = await buildPreviewRows(
      state.parsedFile!,
      state.columnMappings,
      defaultCurrency,
      existingTransactions,
      []
    );

    dispatch({ type: "SET_PREVIEW_ROWS", rows, processing: false });
  }, [state.columnMappings, state.parsedFile, state.isTen10Template, defaultCurrency, platform]);

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
  const riskyApproved = state.previewRows.filter(
    (r) =>
      r.approved &&
      r.issues.some(
        (i) =>
          i.code === "possible_duplicate" || i.code === "possible_recurring"
      )
  ).length;

  // ---------------------------------------------------------------------------
  // Step navigation helpers
  // ---------------------------------------------------------------------------

  const STEPS: WizardStep[] = ["prepare", "upload", "mapping", "review", "result"];
  const currentStepIndex = STEPS.indexOf(state.step);
  const progressPercent = ((currentStepIndex) / (STEPS.length - 1)) * 100;

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
          {state.step === "prepare" && (
            <PrepareStep onNext={() => dispatch({ type: "SET_STEP", step: "upload" })} />
          )}

          {state.step === "upload" && (
            <FileUploadStep onFileParsed={handleFileParsed} />
          )}

          {state.step === "mapping" && state.parsedFile && (
            <ColumnMappingStep
              parsedFile={state.parsedFile}
              mappings={state.columnMappings}
              isTen10Template={state.isTen10Template}
              validationErrors={state.mappingErrors}
              onMappingChange={handleMappingChange}
            />
          )}

          {state.step === "review" && (
            <ImportReviewStep
              rows={state.previewRows}
              summary={summary}
              onToggleApproval={handleToggleApproval}
              onBulkToggle={handleBulkToggle}
              onToggleAllReady={handleToggleAllReady}
              onClearSelection={handleClearSelection}
              onUpdateRow={handleUpdateRow}
              existingTransactions={state.existingTransactions}
              recurringTransactions={[]}
            />
          )}

          {state.step === "result" && state.importResult && (
            <ImportResultStep
              result={state.importResult}
              onImportAnother={handleReset}
            />
          )}
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
