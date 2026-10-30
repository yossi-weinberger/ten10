import type { DuplicateCandidate } from "@/lib/ai/duplicate-candidates";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import type {
  ClarificationField,
  IntakeIntent,
  ParsedUserRule,
  RuleActionType,
  TextTransactionDraft,
} from "@/lib/ai/classify-intake";
import type { SplitDraft } from "@/lib/ai/split-cards";

export type StatusTone = "success" | "error" | "info";

export const STATUS_MESSAGES = {
  saved: { key: "aiIntake.saved", tone: "success" },
  undone: { key: "aiIntake.undone", tone: "success" },
  ruleSaved: { key: "aiIntake.ruleSaved", tone: "success" },
  duplicateKept: { key: "aiIntake.duplicateKept", tone: "success" },
  recurringSaved: { key: "aiIntake.recurring.saved", tone: "success" },
  recurringSaveFailed: { key: "aiIntake.recurring.saveFailed", tone: "error" },
  recurringCancelled: { key: "aiIntake.recurring.cancelled", tone: "success" },
  recurringCancelFailed: { key: "aiIntake.recurring.cancelFailed", tone: "error" },
  ruleFailed: { key: "aiIntake.ruleFailed", tone: "error" },
  saveFailed: { key: "aiIntake.saveFailed", tone: "error" },
  noRateAvailable: { key: "aiIntake.noRateAvailable", tone: "error" },
  undoFailed: { key: "aiIntake.undoFailed", tone: "error" },
  undoNotAllowed: { key: "aiIntake.undoNotAllowed", tone: "info" },
  editDateInvalid: { key: "aiIntake.editDateInvalid", tone: "error" },
  editAmountInvalid: { key: "aiIntake.editAmountInvalid", tone: "error" },
  dateMin: { key: "transactionForm.validation.date.min", ns: "transactions", tone: "error" },
  receiptTooLarge: { key: "aiIntake.receiptTooLarge", tone: "error" },
  receiptUnreadable: { key: "aiIntake.receiptUnreadable", tone: "error" },
  receiptMissing: { key: "aiIntake.receiptMissing", tone: "info" },
  receiptUnavailable: { key: "aiIntake.receiptUnavailable", tone: "error" },
  providerFailed: { key: "aiIntake.providerFailed", tone: "error" },
  oneAtATime: { key: "aiIntake.oneAtATime", tone: "info" },
  splitList: { key: "aiIntake.splitList", tone: "info" },
  severalReceipts: { key: "aiIntake.severalReceipts", tone: "info" },
  bankStatement: { key: "aiIntake.bankStatement", tone: "info" },
  voiceDenied: { key: "aiIntake.voiceDenied", tone: "error" },
  voiceTooLong: { key: "aiIntake.voiceTooLong", tone: "error" },
  voiceUnheard: { key: "aiIntake.voiceUnheard", tone: "error" },
  dataUnsupported: { key: "aiIntake.dataUnsupported", tone: "info" },
  dataMixed: { key: "aiIntake.dataMixed", tone: "info" },
  dataFailed: { key: "aiIntake.dataFailed", tone: "error" },
  duplicateScanFailed: { key: "aiIntake.duplicateScanFailed", tone: "error" },
  duplicateScanEmpty: { key: "aiIntake.duplicateScanEmpty", tone: "success" },
  duplicateActionFailed: { key: "aiIntake.duplicateActionFailed", tone: "error" },
} as const satisfies Record<string, { key: string; ns?: string; tone: StatusTone }>;

export type StatusKey = keyof typeof STATUS_MESSAGES;

export type ReadyDataReply = {
  status: "ready";
  year: number;
  month: number | null;
  measure: "sum" | "count" | "average" | "max";
  type: "donation" | "expense" | "income";
  paymentMethod: string | null;
  recipient: string | null;
  category: string | null;
  from: string;
  to: string;
  total: number;
  count: number;
  currency: string | null;
};

export type DataReply =
  | ReadyDataReply
  | { status: "category_missing"; topic: string; source: string; kind: "category" | "recipient" }
  | { status: "family_missing"; source: string }
  | { status: "mixed" | "unsupported" | "failed" };

export type DuplicateScanState =
  | { status: "pending" }
  | { status: "ready"; count: number; pairs: DuplicatePair[] }
  | { status: "failed" };

export type UserTurn =
  | { kind: "text"; text: string }
  | { kind: "voice"; text: string }
  | { kind: "receipt"; fileName: string; mimeType: string; previewUrl?: string | null };

export interface DraftView {
  draft: TextTransactionDraft;
  amountInput: string;
  appliedRuleName: string | null;
  duplicates: DuplicateCandidate[];
  duplicatesRanked: boolean;
  inferred?: { amount: boolean; date: boolean; description: boolean };
  locked: boolean;
}

export type ReplyBlock =
  | { kind: "thinking"; phase: "reading" | "receipt" | "voice" | "data" | "duplicates" }
  | { kind: "askIntent" }
  | { kind: "intent"; intent: IntakeIntent; showNotSaved: boolean; formLink: boolean }
  | { kind: "recurring"; card: RecurringCard }
  | { kind: "dataAnswer"; reply: ReadyDataReply }
  | { kind: "askFamily"; source: string }
  | { kind: "nameMissing"; nameKind: "category" | "recipient"; topic: string; source: string }
  | { kind: "dataNotice"; status: "unsupported" | "mixed" | "failed" }
  | { kind: "duplicateScan"; scan: DuplicateScanState; confirmDeleteId: string | null; actionFailed: boolean }
  | { kind: "halacha"; namespace: string }
  | { kind: "rule"; rule: ParsedUserRule; choice: RuleActionType | null }
  | { kind: "askType"; receipt: ReceiptFields | null }
  | { kind: "askAmount" }
  | { kind: "receipt"; artifactId: string; link: string | null }
  | { kind: "draft"; view: DraftView }
  | { kind: "drafts"; cards: SplitDraft[]; dropped: number }
  | { kind: "status"; status: StatusKey }
  | { kind: "undo" };

export interface AssistantTurn {
  id: string;
  user: UserTurn;
  blocks: ReplyBlock[];
}

export interface ReplyState {
  checking: boolean;
  pendingPhase: "reading" | "receipt" | "voice" | null;
  askIntent: boolean;
  intent: IntakeIntent | null;
  dataReply: DataReply | null;
  duplicateScan: DuplicateScanState | null;
  confirmDeleteId: string | null;
  duplicateActionFailed: boolean;
  halachaNamespace: string | null;
  parsedRule: ParsedUserRule | null;
  ruleChoice: RuleActionType | null;
  clarification: ClarificationField | null;
  receiptFields: ReceiptFields | null;
  receiptArtifactId: string | null;
  receiptLink: string | null;
  draft: Omit<DraftView, "locked"> | null;
  recurring: RecurringCard | null;
  splitDrafts: SplitDraft[] | null;
  splitDropped: number;
  status: StatusKey | null;
  savedItemId: string | null;
}

export function emptyReplyState(): ReplyState {
  return {
    checking: false,
    pendingPhase: null,
    askIntent: false,
    intent: null,
    dataReply: null,
    duplicateScan: null,
    confirmDeleteId: null,
    duplicateActionFailed: false,
    halachaNamespace: null,
    parsedRule: null,
    ruleChoice: null,
    clarification: null,
    receiptFields: null,
    receiptArtifactId: null,
    receiptLink: null,
    draft: null,
    recurring: null,
    splitDrafts: null,
    splitDropped: 0,
    status: null,
    savedItemId: null,
  };
}

export function buildReplyBlocks(state: ReplyState): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  if (state.checking) blocks.push({ kind: "thinking", phase: state.pendingPhase ?? "reading" });
  if (state.askIntent) blocks.push({ kind: "askIntent" });
  if (state.intent) {
    if (state.status !== "oneAtATime" && state.status !== "splitList") {
      blocks.push({
        kind: "intent",
        intent: state.intent,
        showNotSaved: state.status === null && state.intent !== "ask_data",
        formLink: state.intent === "create_recurring" && state.recurring === null,
      });
    }
    if (state.intent === "ask_data" && !state.dataReply && !state.checking) {
      blocks.push({ kind: "thinking", phase: "data" });
    }
    if (state.intent === "ask_data" && state.dataReply) {
      const reply = state.dataReply;
      if (reply.status === "ready") blocks.push({ kind: "dataAnswer", reply });
      else if (reply.status === "family_missing") blocks.push({ kind: "askFamily", source: reply.source });
      else if (reply.status === "category_missing") {
        blocks.push({ kind: "nameMissing", nameKind: reply.kind, topic: reply.topic, source: reply.source });
      } else blocks.push({ kind: "dataNotice", status: reply.status });
    }
    if (state.intent === "find_duplicates" && state.duplicateScan?.status === "pending" && !state.checking) {
      blocks.push({ kind: "thinking", phase: "duplicates" });
    }
    if (state.intent === "find_duplicates" && state.duplicateScan && state.duplicateScan.status !== "pending") {
      blocks.push({
        kind: "duplicateScan",
        scan: state.duplicateScan,
        confirmDeleteId: state.confirmDeleteId,
        actionFailed: state.duplicateActionFailed,
      });
    }
    if (state.halachaNamespace) blocks.push({ kind: "halacha", namespace: state.halachaNamespace });
    if (state.parsedRule) blocks.push({ kind: "rule", rule: state.parsedRule, choice: state.ruleChoice });
    if (state.clarification === "type") blocks.push({ kind: "askType", receipt: state.receiptFields });
    if (state.clarification === "amount") blocks.push({ kind: "askAmount" });
    if (state.receiptArtifactId && (state.clarification === "type" || state.draft)) {
      blocks.push({ kind: "receipt", artifactId: state.receiptArtifactId, link: state.receiptLink });
    }
    if (state.intent === "create_recurring" && state.recurring) {
      blocks.push({ kind: "recurring", card: state.recurring });
    }
    if (state.draft) {
      blocks.push({
        kind: "draft",
        view: {
          ...state.draft,
          locked: state.savedItemId !== null,
        },
      });
    }
    if (state.splitDrafts && state.splitDrafts.length > 0) {
      blocks.push({ kind: "drafts", cards: state.splitDrafts, dropped: state.splitDropped });
    }
  }
  if (state.status) blocks.push({ kind: "status", status: state.status });
  if (state.savedItemId) blocks.push({ kind: "undo" });
  return blocks;
}

export function nextConversation(
  history: AssistantTurn[],
  active: UserTurn | null,
  activeBlocks: ReplyBlock[],
  next: UserTurn,
  id: string,
): { history: AssistantTurn[]; active: UserTurn } {
  if (!active) return { history, active: next };
  const blocks = activeBlocks.filter((block) => {
    if (block.kind === "thinking") return false;
    if (block.kind === "duplicateScan" && block.scan.status === "pending") return false;
    return true;
  });
  return {
    history: [...history, { id, user: active, blocks }],
    active: next,
  };
}
