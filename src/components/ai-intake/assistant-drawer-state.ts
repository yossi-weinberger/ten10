import type { DuplicateCandidate } from "@/lib/ai/duplicate-candidates";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import {
  emptyReplyState,
  type DataReply,
  type DuplicateScanState,
  type ReplyState,
} from "./assistant-reply-view";
import type { IntakeIntent } from "@/lib/ai/classify-intake";

export type OriginalDraft = {
  description: string;
  amount: number;
  date: string;
};

export type ComposerBusyKey =
  | "aiIntake.thinking.reading"
  | "aiIntake.thinking.receipt"
  | "aiIntake.thinking.voice"
  | "aiIntake.thinking.duplicates"
  | "aiIntake.thinking.data"
  | "aiIntake.thinking.saving";

export interface DrawerThinkingInput {
  checking: boolean;
  pendingPhase: "reading" | "receipt" | "voice" | null;
  askIntent: boolean;
  intent: IntakeIntent | null;
  dataReply: DataReply | null;
  duplicateScan: DuplicateScanState | null;
  /** A save or undo in flight. A new message then would land its result on the next turn. */
  saving?: boolean;
}

export interface DraftReplyInput {
  draft: TextTransactionDraft;
  amountInput: string;
  appliedRuleName: string | null;
  duplicates: DuplicateCandidate[];
  duplicatesRanked: boolean;
  original: OriginalDraft | null;
}

/** The draft card as the thread sees it, including which fields still match the first fill. */
export function draftReplyView(input: DraftReplyInput): NonNullable<ReplyState["draft"]> {
  return {
    draft: input.draft,
    amountInput: input.amountInput,
    appliedRuleName: input.appliedRuleName,
    duplicates: input.duplicates,
    duplicatesRanked: input.duplicatesRanked,
    inferred: input.original
      ? {
        amount: input.amountInput === String(input.original.amount),
        date: input.draft.date === input.original.date,
        description: input.draft.description === input.original.description,
      }
      : undefined,
  };
}

export function buildDrawerReplyState(
  fields: Omit<ReplyState, "draft"> & { draft: ReplyState["draft"] },
): ReplyState {
  return {
    ...emptyReplyState(),
    ...fields,
  };
}

/** Shell spinner: reading, a data answer still loading, or a duplicate scan still loading. */
export function assistantIsThinking(input: DrawerThinkingInput): boolean {
  return input.checking
    || (input.intent === "ask_data" && input.dataReply === null && !input.askIntent)
    || input.duplicateScan?.status === "pending";
}

export function composerBusyKey(input: DrawerThinkingInput): ComposerBusyKey | undefined {
  if (input.checking) return `aiIntake.thinking.${input.pendingPhase ?? "reading"}`;
  if (input.saving) return "aiIntake.thinking.saving";
  if (input.duplicateScan?.status === "pending") return "aiIntake.thinking.duplicates";
  if (input.intent === "ask_data" && input.dataReply === null && !input.askIntent) {
    return "aiIntake.thinking.data";
  }
  return undefined;
}

export function composerMode(clarification: ReplyState["clarification"]): "amount" | "message" {
  return clarification === "amount" ? "amount" : "message";
}

export function conversationStarted(
  historyLength: number,
  active: unknown,
): boolean {
  return historyLength > 0 || active !== null;
}
