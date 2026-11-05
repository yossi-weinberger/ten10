import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { refreshAfterIntakeSave } from "@/lib/ai/refresh-after-intake";
import { nextDraftIdempotency, saveTextDraft } from "@/lib/ai/save-text-draft";
import { undoTextIntake } from "@/lib/ai/undo-text-intake";
import { approveUserRule } from "@/lib/ai/user-rules";
import { listDuplicateCandidates } from "@/lib/ai/duplicate-candidates";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import { donationRecipient } from "@/lib/ai/build-commit-payload";
import { getCurrentLocalDate } from "@/lib/utils/local-date";
import { updateRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import { recurringCancelOpen, recurringTotalOccurrences, saveStartDate } from "@/lib/ai/recurring-card";
import { rememberClosed, rememberSaved, rememberUndone } from "@/lib/ai/assistant-turn";
import { cardsToSave, saveSplitDrafts, splitSaveKey } from "@/lib/ai/save-split-drafts";
import type { SplitDraft } from "@/lib/ai/split-cards";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { createRecurringTransaction, getRecurringTransactionById } from "@/lib/data-layer/recurringTransactions.service";
import { buildRecurringDefinition } from "../../../supabase/functions/_shared/transaction-domain/recurring-definition.ts";
import { buildReplyBlocks } from "./assistant-reply-view";
import type { ReplyHandlers } from "./ReplyBlockView";
import {
  draftSaveBlocker,
  saveFailureStatus,
  splitDraftsAfterSave,
  splitDraftsAfterUndo,
  undoFailureStatus,
} from "./assistant-drawer-thread";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";
import type { AssistantDrawerComposer } from "./use-assistant-drawer-composer";

export function useAssistantDrawerThread(
  state: AssistantDrawerState,
  intent: AssistantDrawerIntent,
  composer: Pick<AssistantDrawerComposer, "openReceiptFile">,
) {
  const {
    autoCalcChomesh,
    questionCalendar,
    draft,
    setDraft,
    recurring,
    setRecurring,
    idempotency,
    splitKey,
    splitAttempt,
    splitDuplicateWarned,
    originalDraft,
    savedRecurring,
    receiptArtifactId,
    amountInput,
    setAmountInput,
    duplicates,
    setParsedRule,
    setRuleChoice,
    saving,
    setSaving,
    undoing,
    setUndoing,
    savedItemId,
    setSavedItemId,
    setStatus,
    splitDrafts,
    setSplitDrafts,
    intentConfidence,
    setConfirmDeleteId,
    requestRef,
    memoryRef,
    refreshDuplicates,
    replyState,
    history,
    activeUser,
  } = state;
  const { recurringSaveId, savedTransaction, replacing } = state;

  /** True when a checked row has a saved transaction of the same type, within three days and 2%. */
  async function splitHasDuplicates(cards: readonly SplitDraft[]): Promise<boolean> {
    const found = await Promise.all(cards.map((card) => (
      card.type === null || card.date === null
        ? Promise.resolve([])
        : listDuplicateCandidates({ type: card.type, date: card.date, amount: card.amount, currency: card.currency })
    )));
    return found.some((rows) => rows.length > 0);
  }

  async function handleSaveSplit() {
    if (!splitDrafts || saving) return;
    const chosen = cardsToSave(splitDrafts);
    if (chosen.length === 0) return;
    const listKey = splitKey.current ?? crypto.randomUUID();
    splitKey.current = listKey;
    const key = splitSaveKey(listKey, chosen, splitAttempt.current);
    setSaving(true);
    const request = requestRef.current;
    if (splitDuplicateWarned.current !== key && await splitHasDuplicates(chosen)) {
      setSaving(false);
      if (requestRef.current !== request) return;
      splitDuplicateWarned.current = key;
      setStatus("splitDuplicates");
      return;
    }
    const result = await saveSplitDrafts(splitDrafts, key);
    setSaving(false);
    if (requestRef.current !== request) {
      if (result.ok) void refreshAfterIntakeSave();
      return;
    }
    if (!result.ok) {
      setStatus(saveFailureStatus(result.reason));
      return;
    }
    splitAttempt.current += 1;
    splitDuplicateWarned.current = null;
    setSplitDrafts(splitDraftsAfterSave(splitDrafts, result.saved));
    setStatus("saved");
    memoryRef.current = rememberSaved(memoryRef.current, null);
    void refreshAfterIntakeSave();
  }

  async function handleUndoSplit(key: string) {
    const card = splitDrafts?.find((item) => item.key === key);
    if (!card?.itemId) return;
    setUndoing(true);
    const request = requestRef.current;
    const result = await undoTextIntake(card.itemId);
    setUndoing(false);
    if (requestRef.current !== request) {
      if (result.ok) void refreshAfterIntakeSave();
      return;
    }
    if (!result.ok) {
      setStatus(undoFailureStatus(result.reason));
      return;
    }
    splitAttempt.current += 1;
    setSplitDrafts((current) => splitDraftsAfterUndo(current, key));
    setStatus("undone");
    memoryRef.current = rememberUndone(memoryRef.current);
    void refreshAfterIntakeSave();
  }

  /**
   * The row id is chosen here and kept while the definition stays the same, so a second tap after
   * a lost reply hits the primary key and reads the saved row back instead of adding another one.
   */
  async function createRecurringOnce(definition: Parameters<typeof createRecurringTransaction>[0]) {
    const signature = JSON.stringify(definition);
    if (recurringSaveId.current?.signature !== signature) {
      recurringSaveId.current = { signature, id: crypto.randomUUID() };
    }
    const { id } = recurringSaveId.current;
    try {
      const saved = await createRecurringTransaction(definition, id);
      recurringSaveId.current = null;
      return saved;
    } catch (error) {
      if ((error as { code?: string } | null)?.code !== "23505") throw error;
      const saved = await getRecurringTransactionById(id);
      recurringSaveId.current = null;
      return saved;
    }
  }

  async function handleSaveRecurring() {
    if (!recurring || saving) return;
    const today = getCurrentLocalDate();
    const start = saveStartDate(recurring, today);
    if (
      start === null
      || recurring.amount === null
      || recurring.currency === null
      || recurring.type === null
      || recurring.frequency !== "monthly"
    ) return;
    setSaving(true);
    const request = requestRef.current;
    try {
      if (recurring.includeThisMonth === "yes") {
        const candidates = await listDuplicateCandidates({
          type: recurring.type,
          date: start,
          amount: recurring.amount,
          currency: recurring.currency,
        });
        if (candidates.length > 0) {
          setRecurring({ ...recurring, monthDuplicate: true });
          return;
        }
      }
      const definition = buildRecurringDefinition({
        start_date: start,
        frequency: recurring.frequency,
        calendar_type: recurring.calendarType,
        day_of_month: recurring.dayOfMonth,
        total_occurrences: recurringTotalOccurrences(recurring, today) ?? undefined,
        amount: recurring.amount,
        currency: recurring.currency,
        description: recurring.description || null,
        type: recurring.type,
        category: recurring.category,
        is_chomesh: recurring.type === "income" ? autoCalcChomesh : undefined,
        recipient: recurring.recipient || donationRecipient({
          type: recurring.type,
          recipient: null,
          description: recurring.description,
        }),
        payment_method: recurring.paymentMethod,
      });
      const saved = await createRecurringOnce({ ...definition, origin: "ai" });
      if (requestRef.current !== request) {
        void useRecurringTableStore.getState().fetchRecurring();
        return;
      }
      savedRecurring.current = saved;
      trackProductEvent("recurring_obligation_created", {
        type: recurring.type,
        frequency: definition.frequency,
        currency: definition.currency,
        has_category: recurring.category !== null,
        source: "ai",
      });
      setRecurring({
        ...recurring,
        saved: true,
        monthDuplicate: false,
        savedId: saved.id,
        savedCreatedAt: saved.created_at ?? null,
        executionCount: saved.execution_count,
      });
      setStatus("recurringSaved");
      memoryRef.current = rememberSaved(memoryRef.current, null);
      void useRecurringTableStore.getState().fetchRecurring();
    } catch {
      if (requestRef.current === request) setStatus("recurringSaveFailed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRecurring() {
    const row = savedRecurring.current;
    if (!row || !recurring || saving || recurring.cancelled || row.created_at === undefined) return;
    if (!recurringCancelOpen(row.created_at, row.execution_count, new Date())) return;
    setSaving(true);
    const request = requestRef.current;
    try {
      // Read the row again. A charge or a table edit since the save must not be undone by an old copy.
      const fresh = await getRecurringTransactionById(row.id);
      if (fresh.created_at === undefined || !recurringCancelOpen(fresh.created_at, fresh.execution_count, new Date())) {
        savedRecurring.current = fresh;
        setRecurring({ ...recurring, executionCount: fresh.execution_count });
        setStatus("recurringCancelFailed");
        return;
      }
      // The RPC writes every column, so the fresh row goes with it. Only the status changes.
      await updateRecurringTransaction(fresh.id, { ...fresh, status: "cancelled" }, fresh);
      savedRecurring.current = { ...fresh, status: "cancelled" };
      setRecurring({ ...recurring, cancelled: true });
      setStatus("recurringCancelled");
      if (requestRef.current === request) memoryRef.current = rememberUndone(memoryRef.current);
      void useRecurringTableStore.getState().fetchRecurring();
    } catch {
      setStatus("recurringCancelFailed");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveRule() {
    if (!state.parsedRule || saving) return;
    const type = state.parsedRule.action === "ambiguous" ? state.ruleChoice : state.parsedRule.action;
    if (!type) return;
    setSaving(true);
    const saved = await approveUserRule(state.parsedRule.name, type, getCurrentLocalDate());
    setSaving(false);
    if (!saved) {
      setStatus("ruleFailed");
      return;
    }
    setParsedRule(null);
    setRuleChoice(null);
    setStatus("ruleSaved");
  }

  async function handleSave(choice?: "saved_anyway" | "same_event") {
    if (!draft || saving || savedItemId) return;
    const blocked = draftSaveBlocker(draft, amountInput);
    if (blocked) {
      setStatus(blocked);
      return;
    }
    const amount = parseDraftAmount(amountInput);
    if (amount === null) {
      setStatus("editAmountInvalid");
      return;
    }
    setSaving(true);
    const request = requestRef.current;
    setStatus(null);
    // A correction of the last save: undo that one first. If it cannot be undone, nothing is saved.
    const replaced = replacing.current;
    if (replaced) {
      const undone = await undoTextIntake(replaced.itemId);
      if (!undone.ok) {
        setSaving(false);
        if (requestRef.current === request) setStatus(undoFailureStatus(undone.reason));
        return;
      }
      replacing.current = null;
      savedTransaction.current = null;
      refreshAfterIntakeSave();
    }
    const savingDraft = { ...draft, amount };
    idempotency.current = nextDraftIdempotency(idempotency.current, {
      description: savingDraft.description,
      amount: amountInput,
      type: savingDraft.type,
      date: savingDraft.date,
    });
    const result = await saveTextDraft(
      savingDraft,
      idempotency.current.key,
      originalDraft.current ?? { description: draft.description, amount },
      duplicates.length > 0 && choice
        ? { choice, candidateIds: duplicates.map((row) => row.id) }
        : undefined,
      intentConfidence,
      receiptArtifactId,
    );
    setSaving(false);
    // A newer turn owns the card now. The save stands; only the list needs it.
    if (requestRef.current !== request) {
      if (result.ok && !result.sameEvent) refreshAfterIntakeSave();
      return;
    }
    if (result.ok && result.sameEvent) {
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description: savingDraft.description,
        amount: amountInput,
        type: savingDraft.type,
        date: savingDraft.date,
      }, { saveFailed: true });
      setStatus("duplicateKept");
      return;
    }
    if (result.ok) {
      savedTransaction.current = { itemId: result.itemId, transactionId: result.transactionId };
      memoryRef.current = rememberSaved(memoryRef.current, result.itemId, {
        amount: savingDraft.amount,
        currency: savingDraft.currency,
        type: savingDraft.type,
        description: savingDraft.description,
        date: savingDraft.date,
      });
      setSavedItemId(result.itemId);
      refreshAfterIntakeSave();
      setStatus("saved");
      navigator.vibrate?.(12);
      return;
    }
    if (result.reason === "SAVE_FAILED" && result.rejected) {
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description: savingDraft.description,
        amount: amountInput,
        type: savingDraft.type,
        date: savingDraft.date,
      }, { saveFailed: true });
    }
    setStatus(replaced ? "replacedNotSaved" : saveFailureStatus(result.reason));
  }

  async function handleUndo() {
    if (!savedItemId || undoing) return;
    setUndoing(true);
    const request = requestRef.current;
    const result = await undoTextIntake(savedItemId);
    setUndoing(false);
    if (requestRef.current !== request) {
      if (result.ok) refreshAfterIntakeSave();
      return;
    }
    if (result.ok) {
      memoryRef.current = rememberUndone(memoryRef.current);
      // The undone item cannot be committed again; a second save needs its own key.
      idempotency.current = null;
      setSavedItemId(null);
      refreshAfterIntakeSave();
      setStatus("undone");
      return;
    }
    setStatus(undoFailureStatus(result.reason));
  }

  const handlers: ReplyHandlers = {
    onChooseIntent: intent.handleChooseIntent,
    onChooseType: intent.handleChooseType,
    onChooseSpecial: intent.handleChooseSpecial,
    onChooseFamily: (family, source) => {
      void intent.loadDataAnswer(source, false, family);
    },
    onSearchDescriptions: (source) => {
      void intent.loadDataAnswer(source, true);
    },
    onChooseSavedName: (name) => {
      void intent.answerWithName(name);
    },
    onAllInPeriod: () => {
      void intent.answerWithoutName();
    },
    onChooseRule: setRuleChoice,
    onApproveRule: () => {
      void handleApproveRule();
    },
    onOpenReceipt: (artifactId) => {
      void composer.openReceiptFile(artifactId);
    },
    onDateChange: (date) => {
      if (!draft) return;
      const next = { ...draft, date };
      setDraft(next);
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description: next.description,
        amount: amountInput,
        type: next.type,
        date,
      });
      refreshDuplicates(next, amountInput);
    },
    onDescriptionChange: (description) => {
      if (!draft) return;
      setDraft({ ...draft, description });
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description,
        amount: amountInput,
        type: draft.type,
        date: draft.date,
      });
    },
    onAmountChange: (amount) => {
      setAmountInput(amount);
      if (!draft) return;
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description: draft.description,
        amount,
        type: draft.type,
        date: draft.date,
      });
      refreshDuplicates(draft, amount);
    },
    onSave: (choice) => {
      void handleSave(choice);
    },
    onChomeshChange: (isChomesh) => {
      if (!draft || draft.type !== "income") return;
      setDraft({ ...draft, isChomesh });
    },
    onRecurringChange: setRecurring,
    onSaveRecurring: () => {
      void handleSaveRecurring();
    },
    onDismissRecurring: () => {
      savedRecurring.current = null;
      setRecurring(null);
      memoryRef.current = rememberClosed(memoryRef.current);
    },
    onCancelRecurring: () => {
      void handleCancelRecurring();
    },
    onSplitChange: setSplitDrafts,
    onSaveSplit: () => {
      void handleSaveSplit();
    },
    onUndoSplit: (key) => {
      void handleUndoSplit(key);
    },
    onUndo: () => {
      void handleUndo();
    },
    onAskDelete: intent.askDelete,
    onConfirmDelete: (id) => {
      void intent.confirmDelete(id);
    },
    onCancelDelete: () => setConfirmDeleteId(null),
    onDismissPair: (pair) => {
      void intent.dismissPair(pair);
    },
    onRabbiSent: state.setRabbiTicket,
    onRabbiDismiss: () => state.setRabbiText(null),
    onAnotherInspiration: intent.presentInspiration,
    saving,
    undoing,
    checkingDuplicates: state.duplicatesPending,
    questionCalendar,
  };

  const blocks = buildReplyBlocks(replyState());

  return {
    handlers,
    blocks,
    history,
    active: activeUser,
    handleSave,
    handleUndo,
    handleSaveSplit,
    handleUndoSplit,
    handleSaveRecurring,
    handleCancelRecurring,
    handleApproveRule,
  };
}

export type AssistantDrawerThread = ReturnType<typeof useAssistantDrawerThread>;
