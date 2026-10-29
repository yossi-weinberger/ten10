import { buildReplyBlocks, emptyReplyState, type AssistantTurn, type ReplyBlock, type ReplyState, type UserTurn } from "./assistant-reply-view";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { cardFromRecurringDraft } from "@/lib/ai/recurring-card";

const draft: TextTransactionDraft = {
  date: "2026-10-21",
  amount: 15,
  currency: "ILS",
  type: "expense",
  requestedRate: null,
  description: "מאפים באליס",
  category: "food",
  paymentMethod: "credit_card",
};

function blocks(overrides: Partial<ReplyState>): ReplyBlock[] {
  return buildReplyBlocks({ ...emptyReplyState(), ...overrides });
}

const draftView = {
  draft,
  amountInput: "15",
  appliedRuleName: null,
  duplicates: [] as const,
  duplicatesRanked: false,
};

export interface GalleryScenario {
  id: string;
  title: string;
  history: AssistantTurn[];
  active: UserTurn | null;
  activeBlocks: ReplyBlock[];
}

export const ASSISTANT_GALLERY: GalleryScenario[] = [
  { id: "empty", title: "ריק", history: [], active: null, activeBlocks: [] },
  {
    id: "thinking",
    title: "בודק",
    history: [],
    active: { kind: "text", text: "קניתי קפה ב־12 ש״ח" },
    activeBlocks: blocks({ checking: true }),
  },
  {
    id: "draft",
    title: "טיוטה",
    history: [],
    active: { kind: "text", text: "קניתי מאפים באליס ב־15 ש״ח" },
    activeBlocks: blocks({ intent: "add_transaction", draft: { ...draftView, duplicates: [] } }),
  },
  {
    id: "duplicate",
    title: "טיוטה עם כפילות",
    history: [],
    active: { kind: "text", text: "קניתי מאפים באליס ב־15 ש״ח" },
    activeBlocks: blocks({
      intent: "add_transaction",
      draft: {
        ...draftView,
        duplicates: [{ id: "d1", date: "2026-10-20", amount: 15, description: "מאפים", kind: "transaction" }],
        duplicatesRanked: true,
      },
    }),
  },
  {
    id: "receipt-type",
    title: "קבלה ושאלת סוג",
    history: [],
    active: { kind: "receipt", fileName: "receipt.jpg", mimeType: "image/jpeg" },
    activeBlocks: blocks({
      intent: "add_transaction",
      clarification: "type",
      receiptFields: { description: "סופר", date: "2026-10-20", amount: 42.5, currency: "ILS" },
      receiptArtifactId: "art-1",
    }),
  },
  {
    id: "amount",
    title: "שאלת סכום",
    history: [],
    active: { kind: "text", text: "קניתי מאפים באליס" },
    activeBlocks: blocks({ intent: "add_transaction", clarification: "amount" }),
  },
  {
    id: "unsure",
    title: "ודאות נמוכה",
    history: [],
    active: { kind: "text", text: "תרומות 2025" },
    activeBlocks: blocks({ askIntent: true }),
  },
  {
    id: "data",
    title: "תשובת נתונים",
    history: [],
    active: { kind: "text", text: "כמה תרמתי ב־2025?" },
    activeBlocks: blocks({
      intent: "ask_data",
      dataReply: {
        status: "ready",
        year: 2025,
        month: null,
        measure: "sum",
        type: "donation",
        paymentMethod: null,
        recipient: null,
        category: null,
        from: "2025-01-01",
        to: "2025-12-31",
        total: 3600,
        count: 12,
        currency: "ILS",
      },
    }),
  },
  {
    id: "family",
    title: "חסרה משפחה",
    history: [],
    active: { kind: "text", text: "כמה ב־2025?" },
    activeBlocks: blocks({ intent: "ask_data", dataReply: { status: "family_missing", source: "כמה ב־2025?" } }),
  },
  {
    id: "recipient",
    title: "נמען לא נמצא",
    history: [],
    active: { kind: "text", text: "כמה תרמתי לפינת חי?" },
    activeBlocks: blocks({
      intent: "ask_data",
      dataReply: { status: "category_missing", kind: "recipient", topic: "פינת חי", source: "כמה תרמתי לפינת חי?" },
    }),
  },
  {
    id: "scan",
    title: "סריקת כפילויות",
    history: [],
    active: { kind: "text", text: "יש כפילויות?" },
    activeBlocks: blocks({
      intent: "find_duplicates",
      duplicateScan: {
        status: "ready",
        count: 1,
        pairs: [{
          left: { id: "a", date: "2026-10-01", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
          right: { id: "b", date: "2026-10-02", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
        }],
      },
    }),
  },
  {
    id: "scan-confirm",
    title: "אישור מחיקה",
    history: [],
    active: { kind: "text", text: "יש כפילויות?" },
    activeBlocks: blocks({
      intent: "find_duplicates",
      confirmDeleteId: "a",
      duplicateScan: {
        status: "ready",
        count: 1,
        pairs: [{
          left: { id: "a", date: "2026-10-01", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
          right: { id: "b", date: "2026-10-02", amount: 50, currency: "ILS", type: "expense", description: "סופר" },
        }],
      },
    }),
  },
  {
    id: "rule",
    title: "כלל",
    history: [],
    active: { kind: "text", text: "מהיום כל הוצאה על גן היא הוצאה מוכרת" },
    activeBlocks: blocks({
      intent: "create_rule",
      parsedRule: { name: "גן", action: "recognized-expense" },
    }),
  },
  {
    id: "rule-ambiguous",
    title: "כלל עמום",
    history: [],
    active: { kind: "text", text: "מהיום הוצאות על גן פטורות ממעשר" },
    activeBlocks: blocks({
      intent: "create_rule",
      parsedRule: { name: "גן", action: "ambiguous" },
    }),
  },
  {
    id: "halacha",
    title: "הלכה",
    history: [],
    active: { kind: "text", text: "מה זה הוצאה מוכרת?" },
    activeBlocks: blocks({ intent: "domain_adjacent", halachaNamespace: "halacha-expenses" }),
  },
  {
    id: "recurring",
    title: "הוראת קבע",
    history: [],
    active: { kind: "text", text: "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש" },
    activeBlocks: blocks({
      intent: "create_recurring",
      recurring: cardFromRecurringDraft({
        amount: 200,
        currency: "ILS",
        type: "donation",
        description: "כולל",
        category: null,
        paymentMethod: null,
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-11-01",
        dayOfMonth: 1,
        anchorMonthCode: null,
        totalOccurrences: null,
        alreadyCharged: false,
      }),
    }),
  },
  {
    id: "saved",
    title: "נשמר עם ביטול",
    history: [],
    active: { kind: "text", text: "קניתי מאפים באליס ב־15 ש״ח" },
    activeBlocks: blocks({
      intent: "add_transaction",
      draft: { ...draftView, duplicates: [] },
      status: "saved",
      savedItemId: "item-1",
    }),
  },
  {
    id: "thread",
    title: "ארבעה סבבים",
    history: [
      { id: "1", user: { kind: "text", text: "כמה תרמתי השנה?" }, blocks: blocks({ intent: "ask_data", dataReply: { status: "ready", year: 2026, month: null, measure: "sum", type: "donation", paymentMethod: null, recipient: null, category: null, from: "2026-01-01", to: "2026-12-31", total: 540, count: 3, currency: "ILS" } }) },
      { id: "2", user: { kind: "voice", text: "קניתי קפה ב־12 ש״ח" }, blocks: blocks({ intent: "add_transaction", status: "saved", savedItemId: "old", draft: { ...draftView, duplicates: [] } }) },
      { id: "3", user: { kind: "receipt", fileName: "receipt.pdf", mimeType: "application/pdf" }, blocks: blocks({ intent: "add_transaction", status: "receiptUnreadable" }) },
    ],
    active: { kind: "text", text: "יש כפילויות?" },
    activeBlocks: blocks({ intent: "find_duplicates", duplicateScan: { status: "ready", count: 0, pairs: [] } }),
  },
];
