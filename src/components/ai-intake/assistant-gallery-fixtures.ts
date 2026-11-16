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

const RECURRING_DRAFT = {
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
} as const;

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
    id: "donation",
    title: "טיוטת תרומה",
    history: [],
    active: { kind: "text", text: "תרמתי 180 לעזר מציון" },
    activeBlocks: blocks({
      intent: "add_transaction",
      draft: {
        ...draftView,
        duplicates: [],
        amountInput: "180",
        draft: { ...draft, type: "donation", amount: 180, description: "עזר מציון", category: null, recipient: "עזר מציון" },
      },
    }),
  },
  {
    id: "income",
    title: "טיוטת הכנסה עם חומש",
    history: [],
    active: { kind: "text", text: "קיבלתי משכורת 9000" },
    activeBlocks: blocks({
      intent: "add_transaction",
      draft: {
        ...draftView,
        duplicates: [],
        amountInput: "9000",
        draft: { ...draft, type: "income", amount: 9000, description: "משכורת", category: "salary", isChomesh: true },
      },
    }),
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
      receiptFields: { description: "סופר", date: "2026-10-20", checkDate: false, amount: 42.5, currency: "ILS", ruleName: null, ruledType: null },
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
    active: { kind: "text", text: "מה הסכום הכולל שנתתי לבית חב״ד השנה?" },
    activeBlocks: blocks({
      intent: "ask_data",
      dataReply: {
        status: "category_missing",
        kind: "recipient",
        topic: "בית חב״ד",
        source: "מה הסכום הכולל שנתתי לבית חב״ד השנה?",
        suggestions: ["בית חב״ד רעננה"],
        family: "donation",
      },
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
    id: "saved-receipt",
    title: "נשמר מקבלה",
    history: [],
    active: { kind: "receipt", fileName: "receipt.jpg", mimeType: "image/jpeg" },
    activeBlocks: blocks({
      intent: "add_transaction",
      draft: { ...draftView, draft: { ...draft, description: "שופרסל דיל", amount: 286.4 }, amountInput: "286.4", duplicates: [] },
      receiptArtifactId: "receipt-1",
      status: "saved",
      savedItemId: "item-2",
    }),
  },
  {
    id: "recurring-saved",
    title: "הוראת קבע נשמרה",
    history: [],
    active: { kind: "text", text: "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש" },
    activeBlocks: blocks({
      intent: "create_recurring",
      recurring: {
        ...cardFromRecurringDraft({ ...RECURRING_DRAFT }),
        saved: true,
        savedId: "r1",
        savedCreatedAt: new Date().toISOString(),
      },
      status: "recurringSaved",
    }),
  },
  {
    id: "split",
    title: "פיצול",
    history: [],
    active: { kind: "receipt", fileName: "bank.png", mimeType: "image/png" },
    activeBlocks: blocks({
      intent: "add_transaction",
      splitDropped: 1,
      splitDrafts: [
        { key: "a", description: "סופר יוחננוף", amount: 312.9, currency: "ILS", date: "2026-11-03", type: "expense", category: null, paymentMethod: null, isChomesh: false, checked: true, transactionId: null, itemId: null },
        { key: "b", description: "קופת העיר", amount: 100, currency: "ILS", date: "2026-11-01", type: "donation", category: null, paymentMethod: null, isChomesh: false, checked: true, transactionId: "t1", itemId: null },
        { key: "c", description: "העברה - מ. כהן", amount: 450, currency: "ILS", date: "2026-11-02", type: null, category: null, paymentMethod: null, isChomesh: false, checked: false, transactionId: null, itemId: null },
      ],
    }),
  },
  {
    id: "balance",
    title: "יתרת מעשר",
    history: [],
    active: { kind: "text", text: "כמה מעשר נשאר לי?" },
    activeBlocks: blocks({ intent: "ask_data", dataReply: { status: "balance", total: 1240, maaser: 1050, chomesh: 190 } }),
  },
  {
    id: "standing-orders",
    title: "הוראות קבע פעילות",
    history: [],
    active: { kind: "text", text: "אילו הוראות קבע יש לי?" },
    activeBlocks: blocks({
      intent: "ask_data",
      dataReply: {
        status: "standing_orders",
        rows: [
          { id: "1", amount: 100, currency: "ILS", type: "donation", frequency: "monthly", description: "קופת העיר", dayOfMonth: 10 },
          { id: "2", amount: 180, currency: "ILS", type: "expense", frequency: "monthly", description: "ועד הבית", dayOfMonth: 1 },
        ],
      },
    }),
  },
  {
    id: "inspiration",
    title: "חיזוק",
    history: [],
    active: { kind: "text", text: "תן לי חיזוק" },
    activeBlocks: blocks({
      intent: "inspiration",
      inspiration: {
        id: "g1",
        title: "נתון תיתן לו",
        body: "נָתוֹן תִּתֵּן לוֹ וְלֹא יֵרַע לְבָבְךָ בְּתִתְּךָ לוֹ, כִּי בִּגְלַל הַדָּבָר הַזֶּה יְבָרֶכְךָ ה׳ אֱלֹהֶיךָ בְּכָל מַעֲשֶׂךָ וּבְכֹל מִשְׁלַח יָדֶךָ. כִּי לֹא יֶחְדַּל אֶבְיוֹן מִקֶּרֶב הָאָרֶץ, עַל כֵּן אָנֹכִי מְצַוְּךָ לֵאמֹר: פָּתֹחַ תִּפְתַּח אֶת יָדְךָ לְאָחִיךָ לַעֲנִיֶּךָ וּלְאֶבְיֹנְךָ בְּאַרְצֶךָ.",
        source: "דברים טו, י–יא",
      },
    }),
  },
  {
    id: "rabbi",
    title: "שאלה לרב",
    history: [],
    active: { kind: "text", text: "מותר לשלם שכר לימוד מכספי מעשר?" },
    // As in the app: the rabbi card comes with no intent line.
    activeBlocks: blocks({ rabbiText: "מותר לשלם שכר לימוד של הילדים מכספי מעשר?" }),
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
