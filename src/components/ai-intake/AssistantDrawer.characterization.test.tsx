// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, createRef, useState, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { installDomPolyfills } from "./assistant-test-setup";

const ai = vi.hoisted(() => ({
  platform: { value: "web" as string },
  classifyIntentFallback: vi.fn(),
  saveTextDraft: vi.fn(),
  undoTextIntake: vi.fn(),
  listActiveUserRules: vi.fn(),
  approveUserRule: vi.fn(),
  listDuplicateCandidates: vi.fn(),
  rankDuplicateCandidates: vi.fn(),
  recordShadowType: vi.fn(),
  readReceiptImage: vi.fn(),
  openAiReceipt: vi.fn(),
  loadDuplicateScan: vi.fn(),
  dismissDuplicatePair: vi.fn(),
  readQuestionSlots: vi.fn(),
  markQuestionOutcome: vi.fn(),
  resolveQuestionFilter: vi.fn(),
  sumYearType: vi.fn(),
  transcribeSpeech: vi.fn(),
  refreshAfterIntakeSave: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/contexts/PlatformContext", () => ({ usePlatform: () => ({ platform: ai.platform.value }) }));
vi.mock("@/lib/platformManager", () => ({ getPlatform: () => ai.platform.value }));
vi.mock("@/lib/ai/flags", () => ({ isAiIntakeEnabled: () => true, aiCallsAllowed: () => true }));
vi.mock("@/lib/ai/intent-fallback", () => ({ classifyIntentFallback: ai.classifyIntentFallback }));
vi.mock("@/lib/ai/save-text-draft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/save-text-draft")>();
  return { ...actual, saveTextDraft: ai.saveTextDraft };
});
vi.mock("@/lib/ai/undo-text-intake", () => ({ undoTextIntake: ai.undoTextIntake }));
vi.mock("@/lib/ai/user-rules", () => ({
  listActiveUserRules: ai.listActiveUserRules,
  approveUserRule: ai.approveUserRule,
}));
vi.mock("@/lib/ai/duplicate-candidates", () => ({ listDuplicateCandidates: ai.listDuplicateCandidates }));
vi.mock("@/lib/ai/rank-duplicates", () => ({ rankDuplicateCandidates: ai.rankDuplicateCandidates }));
vi.mock("@/lib/ai/shadow-type", () => ({ recordShadowType: ai.recordShadowType }));
vi.mock("@/lib/ai/read-receipt", () => ({ readReceiptImage: ai.readReceiptImage }));
vi.mock("@/lib/ai/open-receipt", () => ({ openAiReceipt: ai.openAiReceipt }));
vi.mock("@/lib/ai/load-duplicate-scan", () => ({
  loadDuplicateScan: ai.loadDuplicateScan,
  dismissDuplicatePair: ai.dismissDuplicatePair,
}));
vi.mock("@/lib/ai/read-question", () => ({ readQuestionSlots: ai.readQuestionSlots }));
vi.mock("@/lib/ai/sum-year-type", () => ({
  resolveQuestionFilter: ai.resolveQuestionFilter,
  sumYearType: ai.sumYearType,
}));
vi.mock("@/lib/ai/transcribe-speech", () => ({ transcribeSpeech: ai.transcribeSpeech }));
vi.mock("@/lib/ai/refresh-after-intake", () => ({ refreshAfterIntakeSave: ai.refreshAfterIntakeSave }));
vi.mock("@/lib/ai/question-outcome", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/question-outcome")>();
  return { ...actual, markQuestionOutcome: ai.markQuestionOutcome };
});
vi.mock("@/lib/ai/format-data-answer", () => ({
  formatDataAnswer: (input: { measure: string; count: number }) => `answer:${input.measure}:${input.count}`,
}));
vi.mock("@/lib/tableTransactions/tableTransactions.store", () => ({
  useTableTransactionsStore: { getState: () => ({ deleteTransaction: ai.deleteTransaction }) },
}));

import { AssistantDrawer, type AssistantDrawerHandle } from "./AssistantDrawer";

const receiveRef = createRef<AssistantDrawerHandle>();

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <TooltipProvider>
      <button type="button" onClick={() => setOpen(true)}>reopen</button>
      <AssistantDrawer open={open} onOpenChange={setOpen} receiveRef={receiveRef} />
    </TooltipProvider>
  );
}

function setup() {
  const user = userEvent.setup();
  render(<Harness />);
  return user;
}

async function send(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: "aiIntake.placeholder" }), text);
  await user.click(screen.getByRole("button", { name: "aiIntake.send" }));
}

function confident(intent: string) {
  ai.classifyIntentFallback.mockResolvedValue({ ok: true, intent, confidence: 0.95 });
}

beforeEach(() => {
  installDomPolyfills();
  ai.platform.value = "web";
  for (const value of Object.values(ai)) {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  }
  ai.listActiveUserRules.mockResolvedValue([]);
  ai.listDuplicateCandidates.mockResolvedValue([]);
  ai.rankDuplicateCandidates.mockResolvedValue(null);
  ai.recordShadowType.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe("AssistantDrawer characterization", () => {
  it("keeps new chat beside a single close button", () => {
    setup();
    expect(screen.getByRole("button", { name: "aiIntake.newChat" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "actions.close" })).toHaveLength(1);
  });

  it("shows a published halacha page when the classifier says out of scope", async () => {
    ai.classifyIntentFallback.mockResolvedValue({ ok: true, intent: "out_of_scope", confidence: 0.95 });
    const user = setup();
    await send(user, "האם מעשרות משכורת הן מהברוטו או מהנטו?");
    expect(await screen.findByText("introduction.body")).toBeInTheDocument();
    expect(screen.queryByText("aiIntake.intents.out_of_scope")).not.toBeInTheDocument();
  });

  it("reads a receipt pasted into the composer", async () => {
    ai.readReceiptImage.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    setup();
    const file = new File(["png"], "snap.png", { type: "image/png" });
    fireEvent.paste(screen.getByRole("textbox", { name: "aiIntake.placeholder" }), {
      clipboardData: { files: [file] },
    });
    await waitFor(() => expect(ai.readReceiptImage).toHaveBeenCalledWith(file));
  });

  it("renders nothing outside web", () => {
    ai.platform.value = "desktop";
    render(<AssistantDrawer open onOpenChange={vi.fn()} receiveRef={receiveRef} />);
    expect(screen.queryByText("aiIntake.title")).not.toBeInTheDocument();
  });

  it("turns a sentence with a verb and an amount into an editable draft and saves it", async () => {
    confident("add_transaction");
    ai.saveTextDraft.mockResolvedValue({ ok: true, transactionId: "t1", itemId: "i1" });
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("15");
    expect(screen.getByRole("textbox", { name: "aiIntake.editDescription" })).toHaveValue("מאפים באליס");
    await user.click(screen.getByRole("button", { name: "aiIntake.save" }));
    await waitFor(() => expect(ai.saveTextDraft).toHaveBeenCalledTimes(1));
    expect(ai.saveTextDraft.mock.calls[0][0]).toMatchObject({ type: "expense", amount: 15 });
    expect(await screen.findByText("aiIntake.saved")).toBeInTheDocument();
    expect(ai.refreshAfterIntakeSave).toHaveBeenCalledTimes(1);
  });

  it("undoes a saved draft", async () => {
    confident("add_transaction");
    ai.saveTextDraft.mockResolvedValue({ ok: true, transactionId: "t1", itemId: "i1" });
    ai.undoTextIntake.mockResolvedValue({ ok: true, alreadyReverted: false });
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    await user.click(await screen.findByRole("button", { name: "aiIntake.save" }));
    await user.click(await screen.findByRole("button", { name: "aiIntake.undo" }));
    expect(ai.undoTextIntake).toHaveBeenCalledWith("i1");
    expect(await screen.findByText("aiIntake.undone")).toBeInTheDocument();
  });

  it("asks for the type when the sentence has no verb", async () => {
    confident("add_transaction");
    const user = setup();
    await send(user, "מאפים באליס ב-15 שח");
    expect(await screen.findByText("aiIntake.askType")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "aiIntake.types.expense" }));
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("15");
  });

  it("asks for the amount when the sentence has none", async () => {
    confident("add_transaction");
    const user = setup();
    await send(user, "קניתי מאפים באליס");
    expect(await screen.findByText("aiIntake.askAmount")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "aiIntake.askAmount" }), "15");
    await user.click(screen.getByRole("button", { name: "aiIntake.send" }));
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("15");
  });

  it("warns about a duplicate and keeps the old one on 'same event'", async () => {
    confident("add_transaction");
    ai.listDuplicateCandidates.mockResolvedValue([
      { id: "d1", date: "2026-10-20", amount: 15, description: "מאפים", kind: "transaction" },
    ]);
    ai.saveTextDraft.mockResolvedValue({ ok: true, transactionId: null, itemId: "i1", sameEvent: true });
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    expect(await screen.findByText(/aiIntake\.duplicateWarning/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "aiIntake.sameEvent" }));
    await waitFor(() => expect(ai.saveTextDraft).toHaveBeenCalledTimes(1));
    expect(ai.saveTextDraft.mock.calls[0][3]).toEqual({ choice: "same_event", candidateIds: ["d1"] });
    expect(await screen.findByText("aiIntake.duplicateKept")).toBeInTheDocument();
  });

  it("saves anyway in one click after keeping the same event", async () => {
    confident("add_transaction");
    ai.listDuplicateCandidates.mockResolvedValue([
      { id: "d1", date: "2026-10-20", amount: 15, description: "מאפים", kind: "transaction" },
    ]);
    ai.saveTextDraft
      .mockResolvedValueOnce({ ok: true, transactionId: null, itemId: "i1", sameEvent: true })
      .mockResolvedValueOnce({ ok: true, transactionId: "t2", itemId: "i2" });
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    await user.click(await screen.findByRole("button", { name: "aiIntake.sameEvent" }));
    await screen.findByText("aiIntake.duplicateKept");
    await user.click(screen.getByRole("button", { name: "aiIntake.saveAnyway" }));
    await waitFor(() => expect(ai.saveTextDraft).toHaveBeenCalledTimes(2));
    expect(ai.saveTextDraft.mock.calls[1][1]).not.toBe(ai.saveTextDraft.mock.calls[0][1]);
    expect(ai.saveTextDraft.mock.calls[1][3]).toEqual({ choice: "saved_anyway", candidateIds: ["d1"] });
    expect(await screen.findByText("aiIntake.saved")).toBeInTheDocument();
  });

  it("asks what the message is when Jev is unsure", async () => {
    ai.classifyIntentFallback.mockResolvedValue({ ok: true, intent: "ask_data", confidence: 0.5 });
    const user = setup();
    await send(user, "תרומות 2025");
    expect(await screen.findByText("aiIntake.askIntent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.intentChoices.add_transaction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.intentChoices.ask_data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.intentChoices.create_rule" })).toBeInTheDocument();
  });

  it("answers a data question from SQL totals", async () => {
    confident("ask_data");
    ai.readQuestionSlots.mockResolvedValue(null);
    ai.resolveQuestionFilter.mockResolvedValue({ category: null, description: null, recipient: null });
    ai.sumYearType.mockResolvedValue({ ok: true, total: 100, count: 2, currency: "ILS" });
    const user = setup();
    await send(user, "כמה תרמתי ב-2025?");
    expect(await screen.findByText("answer:sum:2")).toBeInTheDocument();
  });

  it("does not record an outcome when a family prompt is closed", async () => {
    confident("ask_data");
    ai.readQuestionSlots.mockResolvedValue({
      family: null,
      measure: "sum",
      recipient: null,
      category: null,
      paymentMethod: null,
      measurementId: "m-1",
    });
    const user = setup();
    await send(user, "כמה ב-2025?");
    expect(await screen.findByText("aiIntake.askFamily")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "actions.close" }));
    expect(ai.markQuestionOutcome).not.toHaveBeenCalled();
  });

  it("records answered once when a numeric answer is closed before the window ends", async () => {
    confident("ask_data");
    ai.readQuestionSlots.mockResolvedValue({
      family: "donation",
      measure: "sum",
      recipient: null,
      category: null,
      paymentMethod: null,
      measurementId: "m-1",
    });
    ai.resolveQuestionFilter.mockResolvedValue({ category: null, description: null, recipient: null });
    ai.sumYearType.mockResolvedValue({ ok: true, total: 100, count: 2, currency: "ILS" });
    const user = setup();
    await send(user, "כמה תרמתי ב-2025?");
    expect(await screen.findByText("answer:sum:2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "actions.close" }));
    expect(ai.markQuestionOutcome).toHaveBeenCalledTimes(1);
    expect(ai.markQuestionOutcome).toHaveBeenCalledWith("m-1", "answered");
  });

  it("deletes a duplicate only after a second confirmation", async () => {
    confident("find_duplicates");
    ai.loadDuplicateScan.mockResolvedValue({
      ok: true,
      count: 1,
      pairs: [{
        left: { id: "a", date: "2026-10-01", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
        right: { id: "b", date: "2026-10-02", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
      }],
    });
    ai.deleteTransaction.mockResolvedValue(undefined);
    const user = setup();
    await send(user, "יש כפילויות?");
    const deletes = await screen.findAllByRole("button", { name: "aiIntake.duplicateDelete" });
    expect(deletes).toHaveLength(2);
    await user.click(deletes[0]);
    expect(ai.deleteTransaction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "aiIntake.duplicateConfirm" }));
    await waitFor(() => expect(ai.deleteTransaction).toHaveBeenCalledWith("a", "web"));
  });

  it("saves a forward rule only after approval", async () => {
    confident("create_rule");
    ai.approveUserRule.mockResolvedValue(true);
    const user = setup();
    await send(user, "מהיום כל הוצאה על גן היא הוצאה מוכרת");
    await user.click(await screen.findByRole("button", { name: "aiIntake.ruleApprove" }));
    expect(ai.approveUserRule).toHaveBeenCalledWith("גן", "recognized-expense", expect.any(String));
    expect(await screen.findByText("aiIntake.ruleSaved")).toBeInTheDocument();
  });

  it("reads a shared receipt and asks for the type before the draft", async () => {
    ai.readReceiptImage.mockResolvedValue({
      ok: true,
      fields: { description: "סופר", date: "2026-10-20", amount: 42.5, currency: "ILS" },
      artifactId: "art1",
    });
    const user = setup();
    await act(async () => {
      receiveRef.current?.receive(new File(["x"], "r.jpg", { type: "image/jpeg" }));
    });
    expect(await screen.findByText("aiIntake.askType")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "aiIntake.viewReceipt" }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "aiIntake.types.expense" }));
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("42.5");
  });

  it("shows a provider failure for a receipt", async () => {
    ai.readReceiptImage.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    setup();
    await act(async () => {
      receiveRef.current?.receive(new File(["x"], "r.jpg", { type: "image/jpeg" }));
    });
    expect(await screen.findByText("aiIntake.providerFailed")).toBeInTheDocument();
  });

  it("submits shared text like a typed message", async () => {
    confident("add_transaction");
    setup();
    await act(async () => {
      receiveRef.current?.receiveText("קניתי מאפים באליס ב-15 שח");
    });
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("15");
  });

  it("forgets the conversation when closed", async () => {
    confident("add_transaction");
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    await screen.findByRole("textbox", { name: "aiIntake.editAmount" });
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "reopen" }));
    expect(screen.queryByRole("textbox", { name: "aiIntake.editAmount" })).not.toBeInTheDocument();
  });

  it("keeps the previous message visible and locks a saved draft", async () => {
    confident("add_transaction");
    ai.saveTextDraft.mockResolvedValue({ ok: true, transactionId: "t1", itemId: "i1" });
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    await user.click(await screen.findByRole("button", { name: "aiIntake.save" }));
    expect(await screen.findByText("aiIntake.saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "aiIntake.save" })).not.toBeInTheDocument();
    await send(user, "עוד משפט");
    expect(screen.getByText("קניתי מאפים באליס ב-15 שח")).toBeInTheDocument();
  });

  it("disables send when the field is empty and clears the chat", async () => {
    confident("add_transaction");
    const user = setup();
    expect(screen.getByRole("button", { name: "aiIntake.send" })).toBeDisabled();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    await screen.findByRole("textbox", { name: "aiIntake.editAmount" });
    await user.click(screen.getByRole("button", { name: "aiIntake.newChat" }));
    expect(screen.queryByRole("textbox", { name: "aiIntake.editAmount" })).not.toBeInTheDocument();
    expect(screen.queryByText("קניתי מאפים באליס ב-15 שח")).not.toBeInTheDocument();
  });

  it("opens the same draft inside the mobile drawer", async () => {
    installDomPolyfills("mobile");
    confident("add_transaction");
    const user = setup();
    await send(user, "קניתי מאפים באליס ב-15 שח");
    expect(await screen.findByRole("textbox", { name: "aiIntake.editAmount" })).toHaveValue("15");
  });
});
