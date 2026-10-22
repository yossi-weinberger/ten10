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

export type StatusTone = "success" | "error" | "info";

export const STATUS_MESSAGES = {
  saved: { key: "aiIntake.saved", tone: "success" },
  undone: { key: "aiIntake.undone", tone: "success" },
  ruleSaved: { key: "aiIntake.ruleSaved", tone: "success" },
  duplicateKept: { key: "aiIntake.duplicateKept", tone: "success" },
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
  voiceDenied: { key: "aiIntake.voiceDenied", tone: "error" },
  voiceTooLong: { key: "aiIntake.voiceTooLong", tone: "error" },
  voiceUnheard: { key: "aiIntake.voiceUnheard", tone: "error" },
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
  | { kind: "receipt"; fileName: string; mimeType: string };

export interface DraftView {
  draft: TextTransactionDraft;
  amountInput: string;
  appliedRuleName: string | null;
  duplicates: DuplicateCandidate[];
  duplicatesRanked: boolean;
  locked: boolean;
}

export type ReplyBlock =
  | { kind: "thinking"; phase: "intent" | "data" }
  | { kind: "askIntent" }
  | { kind: "intent"; intent: IntakeIntent; showNotSaved: boolean }
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
  | { kind: "status"; status: StatusKey }
  | { kind: "undo" };

export interface AssistantTurn {
  id: string;
  user: UserTurn;
  blocks: ReplyBlock[];
}

export interface ReplyState {
  checking: boolean;
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
  status: StatusKey | null;
  savedItemId: string | null;
}

export function emptyReplyState(): ReplyState {
  return {
    checking: false,
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
    status: null,
    savedItemId: null,
  };
}

export function buildReplyBlocks(state: ReplyState): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  if (state.checking) blocks.push({ kind: "thinking", phase: "intent" });
  if (state.askIntent) blocks.push({ kind: "askIntent" });
  if (state.intent) {
    blocks.push({
      kind: "intent",
      intent: state.intent,
      showNotSaved: state.status === null && state.intent !== "ask_data",
    });
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
    if (state.intent === "find_duplicates" && state.duplicateScan) {
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
    if (state.draft) {
      blocks.push({
        kind: "draft",
        view: {
          ...state.draft,
          locked: state.savedItemId !== null || state.status === "duplicateKept",
        },
      });
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
