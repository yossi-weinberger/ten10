# עיצוב מחדש של עוזר ה־AI — תוכנית

> **לסוכן:** משימה אחת לסשן, PR אחד לכל שלב (UI-1 עד UI-6), מול `feat/ai-intake`. קודם בדיקות, אחר כך קוד. בסוף כל PR: 3–5 שורות ב־`ai-progress.md`. הכללים: `.cursor/rules/ai-multichannel/RULE.md`, `.cursor/rules/ui-design/RULE.md`. שלבים מסומנים ב־`- [ ]`.

**מטרה:** העוזר נראה ומתנהג כמו צ'אט AI מודרני, בשפה העיצובית של Ten10, בלי לשנות את הלוגיקה, ה־Edge, ה־DB או החוזים.

**ארכיטקטורה:** כל הלוגיקה נשארת ב־`AssistantDrawer.tsx` וב־`src/lib/ai/*`. ה־JSX יוצא לרכיבי תצוגה קטנים. פונקציה טהורה הופכת את ה־state לרשימת "בלוקים" של תשובה. כל שליחה חדשה מקפיאה את הבלוקים של הסבב הקודם להיסטוריה, לקריאה בלבד. הרכיבים בנויים מתבניות AI Elements של shadcn ([ui.shadcn.com/docs/ai-elements](https://ui.shadcn.com/docs/ai-elements)), אחרי התאמה ל־Tailwind 3.

**Tech stack:** React 19, Vite, Tailwind 3.4.17, shadcn `new-york` על Radix, lucide, vaul, react-i18next, Vitest + Testing Library (jsdom).

---

## 0. איך מתחילים (לכל סוכן, בכל סשן)

1. **קוראים קודם:** הקובץ הזה, `docs/superpowers/plans/ai-progress.md` (מצב ה־PRs), ו־`.cursor/rules/ai-multichannel/RULE.md` ו־`.cursor/rules/ui-design/RULE.md`. את המסמך הגדול (`docs/superpowers/specs/2026-10-18-ai-multichannel-design.md`) פותחים רק בסעיף שמופיע כאן כ־§.
2. **בוחרים את ה־PR הבא** לפי הסדר: UI-1 → UI-2 → UI-3 → UI-4 → UI-5 → UI-6. כל PR מתחיל רק אחרי שהקודם מוזג. ב־`ai-progress.md` רואים איפה עומדים.
3. **ענף:**

```bash
git fetch origin
git checkout -b feat/ai-ui1-characterization origin/feat/ai-intake   # השם לפי ה־PR
```

4. **ה־commit הראשון ב־UI-1** כולל את הקובץ הזה ואת השורות ב־`ai-progress.md`: `docs(ai): add the assistant UI redesign plan`.
5. **PR:** תמיד מול `feat/ai-intake`, אף פעם לא מול `main`.

```bash
gh pr create --base feat/ai-intake --title "test(ai): characterize the assistant drawer" --body "<what changed, how it was tested, link to this plan>"
```

6. **בסוף כל סשן:** מעדכנים את שורת ה־PR בטבלה ב־`ai-progress.md`, ומוסיפים 3–5 שורות ליומן (מה נעשה, החלטות, הצעד הבא). אחרי UI-3 ו־UI-5 מעדכנים גם את `llm-instructions/features/ai/ai-intake-how-it-works.md`, כי ההתנהגות משתנה.
7. **מה לא מחליטים לבד:** בחירת המיכל במחשב (UI-3, משימה 11) היא של יוסי. כל דבר שלא כתוב כאן, או שסותר את הכתוב: עוצרים ושואלים. לא ממציאים.
8. **שפה:** קוד, הערות ו־commits באנגלית (Conventional Commits, קצר). מסמכים ותשובות למשתמש בעברית.

### איך רואים את העבודה

- **גלריה מקומית, בלי backend (מ־UI-3, משימה 10):** `npm run dev`, ואז `http://localhost:5173/dev/assistant`. כל מצבי העוזר מוצגים מנתוני דמה, עם מתגים לשפה ולערכת נושא. כאן מתקטננים על עיצוב ואנימציות.
- **עם נתונים אמיתיים:** ה־Preview של Vercel שנוצר לכל PR מחובר ל־testing (פרויקט `bbcllewcotypedqsnwmi`). מתחברים עם אחד ממשתמשי הניסוי שב־`ai-progress.md`, שהדגל `ai_intake_web` דלוק אצלם. ה־Preview מוגן ב־Vercel, ולכן צריך להיות מחובר ל־Vercel.
- **לא בודקים זרימות AI מקומית מול ה־`.env` הנוכחי.** הוא מצביע על `ten10-app.supabase.co` (ייצור), ושם ה־AI כבוי והסכמה `ai` לא קיימת. לא משנים את `.env`.

## 1. איפה אנחנו עומדים

- 87 PRs של AI מוזגו ל־`feat/ai-intake` (האחרון [#563](https://github.com/yossi-weinberger/ten10/pull/563)). טקסט, קבלה, דיבור, שאלות על הנתונים, כפילויות, כללים, הלכה, Share Target וביטול עובדים על testing, מאחורי `ai_intake_web`.
- הלוגיקה ב־`src/lib/ai/` מופרדת ומכוסה ב־~25 קבצי בדיקה.
- ה־UI הוא קובץ אחד, `src/components/ai-intake/AssistantDrawer.tsx`, 1000 שורות, ואין לו אף בדיקה.

## 2. ממצאי המחקר

### מה לא עובד בתצוגה היום

1. **זה לא צ'אט.** כל שליחה מחליפה את התוצאה הקודמת. אין בועות, אין היסטוריה, וההודעה של המשתמש לא מוצגת.
2. **הכל טקסט גולמי:** `<p>` בלי טיפוגרפיה, בלי צבע לפי מצב (הצלחה, שגיאה, אזהרה), ובלי היררכיה.
3. **כל הכפתורים `default` וברוחב מלא:** שלח, קבלה, דבר, בחירות. אין כפתורי אייקון ואין הבדל בין פעולה ראשית למשנית.
4. **שדה התאריך הוא `<input type="date">` של הדפדפן.** הוא לא מכבד את הלוח העברי של המשתמש, בניגוד ל־`DatePicker` של הטופס.
5. **סכומים ותאריכים בכפילויות:** `50 ILS` ו־`2026-10-01` גולמיים, בלי `formatCurrency` ובלי `useDisplayDate`.
6. **מגירה מלמטה בכל גודל מסך**, בלי גובה קבוע ובלי גלילה פנימית. זה מנוגד ל־§4.6 (Drawer בנייד, Dialog במחשב).
7. **אין מצב ריק ואין הצעות.** משתמש חדש לא יודע מה אפשר לבקש.
8. **באג קיים:** אחרי «אשר ושמור» הטיוטה נשארת עם כפתור שמירה פעיל. לחיצה שנייה יוצרת תנועה כפולה, כי `idempotencyKey` חדש בכל קריאה (`save-text-draft.ts:45`).

### AI Elements מול הפרויקט

| רכיב | ב־registry של `new-york` (Tailwind 3) | הערה |
|---|---|---|
| `input-group`, `empty`, `spinner`, `item` | יש | מתקינים ב־CLI ומתקנים מחלקות פיזיות ל־RTL |
| `message`, `bubble`, `attachment`, `message-scroller` | **אין**, רק ב־`new-york-v4` | מעתיקים ומתאימים ל־Tailwind 3 (טבלת המרה בסעיף 6) |
| Suggestion, Confirmation | תבניות להעתקה, לא רכיבים | נבנים מ־`Button`, `Alert`, `Item` |
| Chat, Prompt Input | תבניות | מורכבות מהרכיבים למעלה |

- `message-scroller` תלוי ב־`@shadcn/react@0.3.1` (MIT, 56KB, בלי תלויות, `react >= 19`).
- הגרסאות ל־v4 משתמשות ב־`oklch(from var(--primary) …)`, `color-mix`, `wrap-break-word`, `*:data-slot:`, `ring-3`, `inset-s-*`, `scroll-fade-*`. אף אחד מאלה לא קיים ב־Tailwind 3, והטוקנים שלנו הם HSL.
- **למה לא לשדרג ל־Tailwind 4:** v4 דורש Safari 16.4+, Chrome 111+, Firefox 128+. המעבר מזיז את ה־config ל־CSS, מחליף את `tailwindcss-animate` ו־`@tailwindcss/forms`, דורש לשכתב את הווריאנט `short`, ונוגע בכל 125 קבצי `ui`. זה פרויקט נפרד עם סיכון רגרסיה בכל האפליקציה. ההעתקה נוגעת ב־4 קבצים חדשים בלבד.

## 3. החלטות

| נושא | החלטה |
|---|---|
| שיחה | צ'אט מלא: כל הסבבים גלויים. רק הסבב האחרון פעיל. סבבים קודמים קפואים ומראים את המצב הסופי שלהם (נשמר, בוטל, לא נשמר). |
| איפוס | סגירת העוזר מוחקת את השיחה, כמו היום (טיוטה שלא נשמרה נזרקת). כפתור «שיחה חדשה» בכותרת עושה אותו דבר בלי לסגור. |
| מיכל בנייד (`< 768px`) | Drawer מלמטה, `h-[92dvh]`, גלילה פנימית, שורת הכתיבה צמודה לתחתית. |
| מיכל במחשב | **נבחר בעין ב־UI-3.** נבנים שני מימושים: `Dialog` במרכז (§4.6), ו־`Sheet` בצד הסוף (שמאל בעברית, ימין באנגלית, מול הסיידבר). על ה־Preview בוחרים, ולפני המיזוג מוחקים את השני. |
| Tailwind | נשארים ב־3.4. רכיבי v4 מועתקים ומותאמים. |
| זהות AI | האייקון `Sparkles`, אותו אייקון שמסמן תנועת AI בטבלה. |
| צבעי סוג | אותם אייקונים וגוונים של `TransactionTypeSelector` (Wallet/CreditCard/HandCoins; ירוק/אדום/צהוב). |

## 4. אילוצים גלובליים

- **לא נוגעים ב:** `src/lib/ai/**`, `supabase/**`, migrations, חוזי ה־RPC, `share-target*`, `flags.ts`. השינוי ב־UI בלבד.
- **ה־API של הרכיב נשאר:** `AssistantDrawer`, `AssistantDrawerHandle { receive(file), receiveText(text) }`, ו־props `open`, `onOpenChange`, `receiveRef`. `Sidebar.tsx` לא משתנה.
- **שערים נשארים:** `platform !== "web" || !isAiIntakeEnabled()` מחזיר `null`.
- **כל שמות הנגישות של הפקדים נשארים** (`aria-label` ומפתחות התרגום). בדיקות האפיון נשענות עליהם.
- **i18n:** כל טקסט דרך `t()`, ב־namespace `navigation`, תחת `aiIntake.*`, בעברית ובאנגלית. אין מחרוזת קשיחה.
- **RTL:** רק מחלקות לוגיות (`ms/me/ps/pe/start/end/text-start`). אסור `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` בקבצים חדשים, אלא עם `rtl:`/`ltr:` מפורש. אייקונים כיווניים מקבלים `rtl:rotate-180` רק כשהם מצביעים על כיוון קריאה.
- **צבעים:** רק טוקנים סמנטיים (`bg-card`, `text-muted-foreground`, `bg-primary/10`, `text-success`, `border-warning/50`). חריג יחיד: גווני הסוג שמגיעים מ־`transaction-type-visuals.ts`.
- **shadcn:** `gap-*` ולא `space-*`; `size-*`; `cn()`; אייקון בתוך `Button` מקבל `data-icon` ו־`aria-hidden`; `DialogTitle`/`DrawerTitle`/`SheetTitle` תמיד קיימים.
- **Toasts:** לא מוסיפים. ההודעות נשארות בתוך השיחה.
- **Desktop/Tauri:** לא משתנה. העוזר לא נטען שם.
- **לפני כל PR:** `npm run typecheck`, `npm run lint:ratchet`, `npm test`, `npm run check-supabase-imports`, `npm run build`.

## 5. מבנה קבצים

```text
src/components/ui/
  input-group.tsx        # CLI (new-york) + RTL fixes          [UI-2]
  empty.tsx              # CLI                                 [UI-2]
  spinner.tsx            # CLI                                 [UI-2]
  item.tsx               # CLI                                 [UI-2]
  message.tsx            # port from new-york-v4               [UI-2]
  bubble.tsx             # port from new-york-v4               [UI-2]
  attachment.tsx         # port from new-york-v4               [UI-2]
  message-scroller.tsx   # port from new-york-v4 + @shadcn/react [UI-2]
  ai-primitives.test.tsx # SSR smoke                           [UI-2]
  button.tsx             # + sizes icon-sm, icon-xs (additive) [UI-2]
  alert.tsx              # + variant warning (additive)        [UI-2]

scripts/
  ai-primitives-rtl.test.ts  # no physical-direction / Tailwind 4 classes in ported files [UI-2]

src/components/forms/transaction-form-parts/
  transaction-type-visuals.ts   # icons + tints, shared with TransactionTypeSelector [UI-3]

src/components/ai-intake/
  AssistantDrawer.tsx                      # state + handlers (logic unchanged), renders the parts below
  AssistantDrawer.characterization.test.tsx  [UI-1]
  assistant-test-setup.ts                  # jsdom polyfills  [UI-1]
  assistant-reply-view.ts                  # pure: state -> ReplyBlock[]; STATUS_MESSAGES [UI-3]
  assistant-reply-view.test.ts             [UI-3]
  AssistantShell.tsx                       # Drawer (mobile) / Dialog|Sheet (desktop), variant lock [UI-3]
  AssistantComposer.tsx                    # Prompt Input: textarea + receipt + mic + send [UI-3]
  AssistantThread.tsx                      # Chat: MessageScroller + turns + empty state [UI-3]
  ReplyBlockView.tsx                       # exhaustive switch over ReplyBlock [UI-3]
  blocks/
    StatusNote.tsx        [UI-3]
    ChoiceRow.tsx         [UI-3]  # type / intent / family / rule options
    DraftCard.tsx         [UI-3]
    ReceiptAttachment.tsx [UI-3]
    DataAnswer.tsx        [UI-4]
    DuplicateScanCard.tsx [UI-4]
    RuleCard.tsx          [UI-4]
    HalachaCard.tsx       [UI-4]
    TypeChoice.tsx        [UI-5]
  AssistantMark.tsx                        # brand mark, breathes while thinking [UI-5]
  assistant-motion.ts                      # easing + variants                   [UI-5]
  assistant-audio-level.ts (+ .test.ts)    # pure RMS level for the mic meter     [UI-5]

src/components/ui/shimmer.tsx              # loading text shimmer                 [UI-5]
```

---

## PR UI-1 — רשת ביטחון: בדיקות אפיון

**ענף:** `feat/ai-ui1-characterization`. **סוג:** בדיקות בלבד, בלי שינוי בקוד מוצר.

**הקריטריון:** כל הבדיקות עוברות על הקוד הנוכחי. הן מחפשות לפי role ו־accessible name בלבד, לא לפי מבנה DOM, כדי שיעברו גם אחרי העיצוב מחדש. אם בדיקה נכשלת על התנהגות קיימת, מתקנים את הבדיקה כך שתתעד את מה שקורה בפועל, לא את קוד המוצר.

### משימה 1: polyfills ל־jsdom

**Files:** Create `src/components/ai-intake/assistant-test-setup.ts`

- [ ] ליצור את הקובץ:

```ts
import { vi } from "vitest";

export function installDomPolyfills(viewport: "desktop" | "mobile" = "desktop") {
  window.matchMedia = ((query: string) => ({
    matches: viewport === "mobile" ? query.includes("max-width") : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= class {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.scrollTo ??= vi.fn();
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
}
```

### משימה 2: בדיקות האפיון

**Files:** Create `src/components/ai-intake/AssistantDrawer.characterization.test.tsx`

- [ ] ליצור את הקובץ עם המוקים וה־harness:

```tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, createRef, useState, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  resolveQuestionFilter: vi.fn(),
  sumYearType: vi.fn(),
  transcribeSpeech: vi.fn(),
  refreshAfterIntakeSave: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({
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
vi.mock("@/lib/ai/save-text-draft", () => ({ saveTextDraft: ai.saveTextDraft }));
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
    <>
      <button type="button" onClick={() => setOpen(true)}>reopen</button>
      <AssistantDrawer open={open} onOpenChange={setOpen} receiveRef={receiveRef} />
    </>
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
```

- [ ] להוסיף את הבדיקות. כל אחת נשענת רק על מפתחות התרגום:

```tsx
describe("AssistantDrawer characterization", () => {
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
    // UI-3 changes this step on purpose: the answer is typed in the composer (section 8).
    await user.type(screen.getByRole("textbox", { name: "aiIntake.askAmount" }), "15");
    await user.click(screen.getByRole("button", { name: "aiIntake.continue" }));
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
    expect(await screen.findByText("aiIntake.duplicateWarning", {}, { timeout: 2000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "aiIntake.sameEvent" }));
    await waitFor(() => expect(ai.saveTextDraft).toHaveBeenCalledTimes(1));
    expect(ai.saveTextDraft.mock.calls[0][2]).toEqual({ choice: "same_event", candidateIds: ["d1"] });
    expect(await screen.findByText("aiIntake.duplicateKept")).toBeInTheDocument();
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
});
```

- [ ] להריץ: `npx vitest run src/components/ai-intake/AssistantDrawer.characterization.test.tsx`. צפוי: הכל עובר. אם vaul לא נפתח ב־jsdom, להוסיף ל־`assistant-test-setup.ts` את ה־polyfill שחסר לפי השגיאה (בדרך כלל `getComputedStyle().transform`). לא מוקים את ה־Drawer, כי ב־UI-3 המיכל מתחלף.
- [ ] `npm test` מלא, ואז commit: `test(ai): characterize the assistant drawer before the redesign`.

---

## PR UI-2 — רכיבי בסיס של AI Elements

**ענף:** `feat/ai-ui2-primitives`. **סוג:** רכיבי `ui` חדשים ושני ווריאנטים נוספים (רק תוספת). עדיין לא בשימוש, ובלי שינוי שהמשתמש רואה.

### משימה 1: רכיבים מה־CLI

- [ ] `npx shadcn@latest add input-group empty spinner item --dry-run`. לוודא שרק `input-group.tsx`, `empty.tsx`, `spinner.tsx`, `item.tsx` נוצרים, ושאין `--overwrite` לקבצים קיימים (`button`, `input`, `textarea`, `separator`).
- [ ] `npx shadcn@latest add input-group empty spinner item`. אם ה־CLI מציע לדרוס קובץ קיים, עונים לא.
- [ ] תיקוני RTL ב־`input-group.tsx` (ה־registry משתמש במחלקות פיזיות):

| לפני | אחרי |
|---|---|
| `[&>input]:pl-2` | `[&>input]:ps-2` |
| `[&>input]:pr-2` | `[&>input]:pe-2` |
| `pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]` | `ps-3 has-[>button]:ms-[-0.45rem] has-[>kbd]:ms-[-0.35rem]` |
| `pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]` | `pe-3 has-[>button]:me-[-0.4rem] has-[>kbd]:me-[-0.35rem]` |
| `shadow-xs` | `shadow-sm` (אין `shadow-xs` ב־Tailwind 3) |

- [ ] להריץ `rg -n "\b(ml|mr|pl|pr|left|right)-|text-(left|right)|shadow-xs" src/components/ui/{input-group,empty,spinner,item}.tsx` ולתקן כל תוצאה באותו אופן.

### משימה 2: ווריאנטים נוספים

**Files:** Modify `src/components/ui/button.tsx`, `src/components/ui/alert.tsx`

- [ ] ב־`button.tsx`, תחת `size`, להוסיף בלי לשנות את הקיימים:

```ts
"icon-sm": "size-8",
"icon-xs": "size-6 rounded-md [&_svg]:size-3.5",
```

- [ ] ב־`alert.tsx`, תחת `variant`:

```ts
warning: "border-warning/50 bg-warning/10 text-foreground [&>svg]:text-warning",
```

### משימה 3: העתקת רכיבי v4

**Files:** Create `src/components/ui/{message,bubble,attachment,message-scroller}.tsx`

- [ ] להוריד את המקור (קריאה בלבד, לתיקייה זמנית מחוץ לריפו):

```powershell
foreach ($c in "message","bubble","attachment","message-scroller") {
  (Invoke-WebRequest -UseBasicParsing "https://ui.shadcn.com/r/styles/new-york-v4/$c.json").Content |
    ConvertFrom-Json | ForEach-Object { $_.files[0].content } | Set-Content "$env:TEMP\$c.tsx" -Encoding utf8
}
```

  ב־bash: `for c in message bubble attachment message-scroller; do curl -s "https://ui.shadcn.com/r/styles/new-york-v4/$c.json" | jq -r '.files[0].content' > "/tmp/$c.tsx"; done`
- [ ] `npm i @shadcn/react@0.3.1 --save-exact`. לוודא ש־`node_modules/@shadcn/react/package.json` מייצא את `./message-scroller`.
- [ ] להעתיק כל קובץ ל־`src/components/ui/` לפי טבלת ההמרה (סעיף 6). מעתיקים רק את מה שבשימוש:
  - `message.tsx`: `MessageGroup`, `Message`, `MessageAvatar`, `MessageContent`, `MessageHeader`, `MessageFooter`.
  - `bubble.tsx`: `Bubble`, `BubbleContent`, `BubbleGroup`. בלי `BubbleReactions`.
  - `attachment.tsx`: `Attachment`, `AttachmentMedia`, `AttachmentContent`, `AttachmentTitle`, `AttachmentDescription`, `AttachmentActions`, `AttachmentAction`. בלי `AttachmentGroup` ו־`AttachmentTrigger`.
  - `message-scroller.tsx`: הכל.
- [ ] לכל קובץ: `import { cn } from "@/lib/utils"`, `import { Slot } from "@radix-ui/react-slot"` במקום `Slot.Root` מ־`radix-ui`, ו־`@/components/ui/button` במקום `@/registry/new-york-v4/ui/button`.

### משימה 4: בדיקת עשן ובדיקת RTL

**Files:** Create `src/components/ui/ai-primitives.test.tsx`, `scripts/ai-primitives-rtl.test.ts`

ב־`src` אין טיפוסי Node, ולכן בדיקת הקבצים יושבת ב־`scripts`, כמו `receipt-artifact-allowlist.test.ts`.

- [ ] ליצור את `src/components/ui/ai-primitives.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Attachment, AttachmentContent, AttachmentTitle } from "./attachment";
import { Bubble, BubbleContent } from "./bubble";
import { Empty, EmptyTitle } from "./empty";
import { InputGroup, InputGroupTextarea } from "./input-group";
import { Message, MessageContent } from "./message";
import { Spinner } from "./spinner";

describe("AI primitives", () => {
  it("render their slots", () => {
    const markup = renderToStaticMarkup(
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>hi</BubbleContent>
          </Bubble>
          <Attachment size="sm"><AttachmentContent><AttachmentTitle>r.jpg</AttachmentTitle></AttachmentContent></Attachment>
          <InputGroup><InputGroupTextarea aria-label="m" /></InputGroup>
          <Empty><EmptyTitle>t</EmptyTitle></Empty>
          <Spinner />
        </MessageContent>
      </Message>,
    );
    for (const slot of ["message", "bubble-content", "attachment", "input-group", "empty"]) {
      expect(markup).toContain(`data-slot="${slot}"`);
    }
  });
});
```

- [ ] ליצור את `scripts/ai-primitives-rtl.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PORTED = ["message", "bubble", "attachment", "message-scroller", "input-group", "empty", "spinner", "item"];
const FORBIDDEN = /(?<![\w:-])(?:ml|mr|pl|pr|left|right)-[\w[\]./-]+|text-(?:left|right)\b|oklch\(|color-mix\(|wrap-break-word|inset-s-|ring-3\b/;

describe("ported AI primitives", () => {
  it.each(PORTED)("%s has no physical-direction or Tailwind 4 classes", (name) => {
    const lines = readFileSync(`src/components/ui/${name}.tsx`, "utf8")
      .split("\n")
      .filter((line) => !line.includes("rtl:") && !line.includes("ltr:"));
    expect(lines.filter((line) => FORBIDDEN.test(line))).toEqual([]);
  });
});
```

- [ ] `npx vitest run src/components/ui/ai-primitives.test.tsx scripts/ai-primitives-rtl.test.ts` עובר. `npm run build` עובר.
- [ ] commit: `feat(ui): add AI Elements primitives for Tailwind 3`.

---

## PR UI-3 — מיכל, שורת כתיבה, שיחה וכרטיס טיוטה

**ענף:** `feat/ai-ui3-chat-shell`. **סוג:** UI. הלוגיקה ב־`AssistantDrawer.tsx` נשארת, חוץ מהשינויים המכוונים בסעיף 8.

### משימה 1: מודל התצוגה (TDD)

**Files:** Create `src/components/ai-intake/assistant-reply-view.ts`, `src/components/ai-intake/assistant-reply-view.test.ts`

**Interfaces — Produces:**

```ts
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
  | { kind: "thinking" }
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

export function buildReplyBlocks(state: ReplyState): ReplyBlock[];
```

**חוקי הסדר** (אותו סדר כמו ה־JSX של היום):
1. `checking` → `thinking`.
2. `askIntent` → `askIntent`.
3. `intent` → `intent`, עם `showNotSaved = status === null && intent !== "ask_data"`. אחריו, רק כש־`intent` מוגדר: בלוקי `ask_data` (`dataAnswer` / `askFamily` / `nameMissing` / `dataNotice`), `duplicateScan` (רק ב־`find_duplicates`), `halacha`, `rule`, `askType`, `askAmount`, `receipt` (רק כש־`receiptArtifactId` ויש `askType` או `draft`), `draft` (עם `locked = savedItemId !== null || status === "duplicateKept"`).
4. `status` → `status`, תמיד אחרון לפני `undo`.
5. `savedItemId` → `undo`.

- [ ] לכתוב בדיקות ל־`buildReplyBlocks`: (א) state ריק נותן `[]`; (ב) `checking` לבד נותן `[{kind:"thinking"}]`; (ג) תנועה עם טיוטה ו־`status: "saved"` ו־`savedItemId` נותנת `intent(showNotSaved:false)`, `draft(locked:true)`, `status`, `undo` בסדר הזה; (ד) `ask_data` עם `family_missing` נותן `askFamily` ולא `showNotSaved`; (ה) `receipt` מופיע רק עם `askType` או `draft`; (ו) `status` בלי `intent` עדיין מופיע (כשל קבלה).
- [ ] להריץ, לראות אותן נכשלות, לממש, לראות אותן עוברות.
- [ ] commit: `feat(ai): derive assistant reply blocks from drawer state`.

### משימה 2: גווני סוג משותפים

**Files:** Create `src/components/forms/transaction-form-parts/transaction-type-visuals.ts`; Modify `TransactionTypeSelector.tsx`

- [ ] ליצור:

```ts
import { CreditCard, HandCoins, Wallet, type LucideIcon } from "lucide-react";

export type BaseTransactionType = "income" | "expense" | "donation";

export const BASE_TYPE_ICON: Record<BaseTransactionType, LucideIcon> = {
  income: Wallet,
  expense: CreditCard,
  donation: HandCoins,
};

export const BASE_TYPE_TINT: Record<BaseTransactionType, string> = {
  income: "bg-green-100 dark:bg-green-900",
  expense: "bg-red-100 dark:bg-red-900",
  donation: "bg-yellow-100 dark:bg-yellow-900",
};
```

- [ ] ב־`TransactionTypeSelector.tsx`: `indicatorColors` הופך ל־`BASE_TYPE_TINT`, ושלושת ה־JSX של האייקונים הופכים ל־`BASE_TYPE_ICON[type]`. אין שינוי במחלקות. `npx vitest run src/components/forms` עובר.

### משימה 3: מצב בשם מפתח, ושמירה אחרי שמירה

**Files:** Modify `AssistantDrawer.tsx`

- [ ] `saveMessage: string | null` הופך ל־`status: StatusKey | null`. כל `setSaveMessage(t("aiIntake.X"))` הופך ל־`setStatus("X")`, ו־`t("transactionForm.validation.date.min", { ns: "transactions" })` הופך ל־`setStatus("dateMin")`. המיפויים שנבחרים לפי `result.reason` נשארים באותו סדר.
- [ ] `duplicateNote` הופך ל־`duplicateActionFailed: boolean`.
- [ ] `handleSave` חוזר מיד אם `savedItemId !== null` (מתקן את הבאג מסעיף 2.8).
- [ ] `npx vitest run src/components/ai-intake` עובר בלי שינוי בבדיקות.

### משימה 4: סבבים והיסטוריה

**Files:** Modify `AssistantDrawer.tsx`

- [ ] state חדש: `history: AssistantTurn[]`, ו־`activeUser: UserTurn | null`.
- [ ] `beginTurn(user: UserTurn)`: אם `activeUser` קיים, דוחף `{ id: crypto.randomUUID(), user: activeUser, blocks: buildReplyBlocks(currentReplyState()) }` ל־`history`, ואז `setActiveUser(user)`. `currentReplyState()` בונה `ReplyState` מה־state הנוכחי.
- [ ] קוראים ל־`beginTurn`: בתחילת `handleSubmit` (`{kind:"text"}`, או `{kind:"voice"}` כשמגיע מ־`finishVoice`), בתחילת `handleReceipt` (`{kind:"receipt", fileName: file.name, mimeType: file.type}`), ובתשובת סכום (סעיף 8).
- [ ] `handleSubmit` מנקה את `text` אחרי שקרא את `source`.
- [ ] `clearConversation` מנקה גם את `history` ואת `activeUser`.

### משימה 5: AssistantShell

**Files:** Create `src/components/ai-intake/AssistantShell.tsx`

**Interfaces — Produces:**

```ts
export const ASSISTANT_DESKTOP_SHELL: "dialog" | "sheet" = "dialog";

interface AssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;   // thread
  footer: React.ReactNode;     // composer
  initialFocusRef: React.RefObject<HTMLTextAreaElement | null>;
}
```

- [ ] נעילת הווריאנט, כמו ב־`ResponsiveConfirmationDialog`: `useMediaQuery("(max-width: 767px)")`, ושינוי רק כשהמיכל סגור, דרך `setTimeout(…, 0)`.
- [ ] פריסה משותפת לשלושת המיכלים: `flex h-full min-h-0 flex-col`. כותרת עם `Sparkles` (`text-primary`), כותרת, תיאור `sr-only` ו־`headerActions`. אחריה `Separator`, אזור שיחה `min-h-0 flex-1`, ושורת כתיבה `border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
- [ ] נייד: `<Drawer>` + `<DrawerContent className="h-[92dvh] max-h-[92dvh]">`. אין פוקוס אוטומטי, כדי שהמקלדת לא תכסה את ההצעות.
- [ ] מחשב, `dialog`: `<DialogContent className="flex h-[min(85dvh,48rem)] max-w-2xl flex-col gap-0 p-0" onOpenAutoFocus={…focus initialFocusRef}>`.
- [ ] מחשב, `sheet`: `<SheetContent side={i18n.dir() === "rtl" ? "left" : "right"} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">`. כפתור ה־X של `sheet.tsx` יושב ב־`right-4`. בגרסה הזו מסתירים אותו (`[&>button:last-child]:hidden`), ומשתמשים בכפתור הסגירה בכותרת.
- [ ] `DialogTitle` / `DrawerTitle` / `SheetTitle` ו־`Description` תמיד מרונדרים.

### משימה 6: AssistantComposer

**Files:** Create `src/components/ai-intake/AssistantComposer.tsx`

**Interfaces — Produces:**

```ts
interface AssistantComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReceipt: (file: File | undefined) => void;
  onToggleVoice: () => void;
  busy: boolean;           // checking
  recording: boolean;
  mode: "message" | "amount";
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}
```

- [ ] מבנה לפי Prompt Input: `<form>` → `InputGroup` → `InputGroupTextarea` (`aria-label` ו־`placeholder` = `aiIntake.placeholder`, או `aiIntake.askAmount` במצב `amount`; `rows={1}`, `className="max-h-40 min-h-12 [field-sizing:content]"`, `enterKeyHint="send"`, ו־`inputMode="decimal"` במצב `amount`).
- [ ] `InputGroupAddon align="block-end"`: קבלה (`Paperclip`, `aria-label="aiIntake.receipt"`, `variant="outline"`, `size="icon-sm"`, `rounded-full`), מיקרופון (`Mic`; בזמן הקלטה `Square` עם `variant="destructive"` ו־`animate-pulse`; `aria-label` = `aiIntake.voice` או `aiIntake.voiceStop`; `aria-pressed={recording}`), ושליחה (`ArrowUp`, `aria-label="aiIntake.send"`, `ms-auto`, `disabled` כשהשדה ריק, או ב־`busy`, או ב־`recording`).
- [ ] Enter שולח, ו־Shift+Enter יורד שורה. במכשיר מגע (`(pointer: coarse)`) Enter תמיד יורד שורה. לא שולחים כש־`event.nativeEvent.isComposing`.
- [ ] `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1}>`, כמו היום.

### משימה 7: AssistantThread ומצב ריק

**Files:** Create `src/components/ai-intake/AssistantThread.tsx`, `ReplyBlockView.tsx`, `blocks/StatusNote.tsx`, `blocks/ChoiceRow.tsx`, `blocks/ReceiptAttachment.tsx`

- [ ] `AssistantThread({ history, active, activeBlocks, onSuggestion, renderBlock })`: `MessageScrollerProvider autoScroll` → `MessageScroller` → `Viewport` → `Content className="gap-6 px-4 py-4"` עם `role="log"` ו־`aria-live="polite"`.
- [ ] סבב משתמש: `MessageScrollerItem scrollAnchor` → `Message align="end"` → `Bubble align="end" variant="muted"`. טקסט ב־`BubbleContent`, דיבור עם `Mic` ליד התמלול, וקבלה כ־`Attachment size="sm"` (`FileText` ל־PDF, `ImageIcon` לתמונה).
- [ ] סבב עוזר: `Message` → `MessageContent` → בלוקים. סבב היסטוריה מקבל `interactive={false}`.
- [ ] מצב ריק, כשאין היסטוריה ואין סבב פעיל: `Empty` עם `EmptyMedia variant="icon"` ו־`Sparkles`, `EmptyTitle` = `aiIntake.emptyTitle`, `EmptyDescription` = `aiIntake.emptyDescription`. מתחת: ארבע הצעות (`Button variant="outline" size="sm" className="rounded-full"`) מ־`aiIntake.suggestions.{transaction,question,duplicates,rule}`. לחיצה קוראת ל־`onSuggestion(text)`, שמפעיל את `handleSubmit(text)`.
- [ ] `ReplyBlockView({ block, interactive, handlers })`: `switch (block.kind)` עם `default: { const unreachable: never = block; return unreachable; }`.
- [ ] `thinking`: `Spinner` + `aiIntake.checking`, `text-muted-foreground`.
- [ ] `intent`: `p.text-sm` עם `aiIntake.intents.X`, ואחריו `aiIntake.notSaved` ב־`text-muted-foreground` כש־`showNotSaved`.
- [ ] `StatusNote`: אייקון לפי tone (`CircleCheck` + `text-success`, `CircleAlert` + `text-destructive`, `Info` + `text-muted-foreground`), וטקסט `t(key, { ns })`.
- [ ] `ChoiceRow({ prompt, options: { value, label, icon? }[], onChoose, disabled })`: `p.text-sm.font-medium` ואחריו `flex flex-wrap gap-2` של `Button variant="outline" size="sm"`. משמש ל־`askIntent`, ל־`askType` (עם `BASE_TYPE_ICON` ו־`data-icon="inline-start"`), ל־`askFamily` ולבחירת כלל עמום. כש־`interactive` הוא false, לא מרונדר.
- [ ] `askAmount`: `p` עם `aiIntake.askAmount`. התשובה נכתבת בשורת הכתיבה (סעיף 8).
- [ ] `ReceiptAttachment`: `Attachment` עם `AttachmentMedia` (`Receipt`), כותרת `aiIntake.viewReceipt`, תיאור `aiIntake.receiptKept`, ו־`AttachmentAction` שקורא ל־`openReceiptFile`, עם `aria-label="aiIntake.viewReceipt"`. אם `link` קיים: `a` עם `target="_blank"` ו־`rel="noopener noreferrer"`, באותו טקסט.

### משימה 8: DraftCard

**Files:** Create `src/components/ai-intake/blocks/DraftCard.tsx`

- [ ] `Card` מלא (`CardHeader` / `CardContent` / `CardFooter`).
- [ ] כותרת: תג סוג (`BASE_TYPE_ICON` ו־`BASE_TYPE_TINT` לפי `normalizeToBaseType(draft.type)`, ואת התווית `aiIntake.types.${draft.type}`), `Badge variant="outline"` עם `aiIntake.ruleApplied` כשיש כלל, ו־`CardDescription` עם `aiIntake.draftMeta`.
- [ ] תוכן, `grid gap-3 sm:grid-cols-2`:
  - סכום: `Label` + `InputGroup` עם `InputGroupInput` (`aria-label="aiIntake.editAmount"`, `inputMode="decimal"`, `dir="ltr"`, `className="text-lg font-semibold tabular-nums"`) ו־`InputGroupAddon align="inline-end"` עם `InputGroupText` של קוד המטבע.
  - תאריך: `Label` + `DatePicker` מ־`@/components/ui/date-picker`, עם `date={parseLocalDate(draft.date)}`, `setDate={(d) => d && onDateChange(formatLocalDate(d))}`, `minDate={minTransactionDateLocal()}`, כמו ב־`AmountCurrencyDateFields.tsx:158`. שגיאות התאריך מוצגות ב־`text-sm text-destructive`.
  - תיאור, ברוחב מלא (`sm:col-span-2`): `Label` + `Input` עם `aria-label="aiIntake.editDescription"`.
  - כפילויות: `Alert variant="warning"` עם `AlertTriangle`, `AlertTitle` = `aiIntake.duplicateWarning`, ו־`AlertDescription` עם `aiIntake.duplicateRanked` כשמדורג. אחריו `ItemGroup` של עד 3 `Item size="sm"`: תאריך דרך `useDisplayDate`, סכום דרך `formatCurrency`, תיאור, ו־`Badge variant="secondary"` עם `aiIntake.draftCandidate` לטיוטה.
- [ ] footer: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`. «זו אותה תנועה» (`outline`) רק כשיש כפילויות. כפתור ראשי `aiIntake.save` או `aiIntake.saveAnyway`, עם `Spinner data-icon="inline-start"` בזמן `saving`.
- [ ] `locked` או `!interactive`: מצב קריאה בלבד, שורה אחת `Item` עם האייקון, התיאור, הסכום המעוצב והתאריך המעוצב. בלי שדות ובלי footer.
- [ ] `undo` (רק בסבב פעיל): `Button variant="ghost" size="sm"` עם `Undo2` ו־`aiIntake.undo`, `disabled={undoing}`.

### משימה 9: חיבור ב־AssistantDrawer

**Files:** Modify `AssistantDrawer.tsx`, `public/locales/{he,en}/navigation.json`, `AssistantDrawer.characterization.test.tsx`

- [ ] ה־JSX של `AssistantDrawer` הופך ל־`AssistantShell` + `AssistantThread` + `AssistantComposer`. הבלוקים של UI-4 (`dataAnswer`, `askFamily`, `nameMissing`, `dataNotice`, `duplicateScan`, `rule`, `halacha`) מרונדרים זמנית עם ה־markup הנוכחי, שעובר כמו שהוא לתוך `ReplyBlockView`.
- [ ] כפתור «שיחה חדשה» ב־`headerActions`: `Button variant="ghost" size="icon-sm"` עם `RotateCcw`, `aria-label="aiIntake.newChat"`, ו־`Tooltip`. הוא קורא ל־`stopRecording()` ול־`clearConversation()`, ו־`disabled` כשאין שיחה.
- [ ] מפתחות חדשים, בעברית ובאנגלית: `newChat`, `emptyTitle`, `emptyDescription`, `suggestions.transaction`, `suggestions.question`, `suggestions.duplicates`, `suggestions.rule`. ההצעות בעברית: «קניתי קפה ב־12 ש״ח», «כמה תרמתי השנה?», «יש כפילויות?», «מהיום כל הוצאה על גן היא הוצאה מוכרת». באנגלית: "I bought coffee for 12 ILS", "How much did I donate this year?", "Any duplicates?", "From now on, daycare is a recognized expense". `emptyDescription`: «אפשר לכתוב, לצלם קבלה או לדבר. שום דבר לא נשמר בלי אישור שלך.» על testing, כל הצעה צריכה להגיע לכוונה ולתוצאה הצפויות. אם לא, מנסחים אותה מחדש. לא מוסיפים מילים למפענח.
- [ ] בבדיקת האפיון של הסכום: במקום השדה `aiIntake.askAmount` והכפתור `continue`, כותבים `15` בשורת הכתיבה ושולחים. מוסיפים בדיקות: (א) הסבב הקודם נשאר גלוי אחרי שליחה שנייה (`getAllByText` של הודעת המשתמש הראשונה); (ב) אחרי `saved` אין כפתור `aiIntake.save`; (ג) כפתור השליחה `disabled` כשהשדה ריק; (ד) «שיחה חדשה» מנקה את השיחה. מריצים גם עם `installDomPolyfills("mobile")`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:ratchet`, `npm run build`.

### משימה 10: גלריית פיתוח

**Files:** Create `src/pages/dev/AssistantGalleryPage.tsx`, `src/components/ai-intake/assistant-gallery-fixtures.ts`; Modify `src/routes.ts`

המטרה: לראות ולשפר כל מצב בלי backend, בלי התחברות ובלי לייצר מצב בעבודת יד. היא גם הבסיס לצילומי Playwright ב־UI-6.

- [ ] `assistant-gallery-fixtures.ts`: מערך של `{ id: string; title: string; history: AssistantTurn[]; active: UserTurn | null; activeBlocks: ReplyBlock[] }`. התרחישים: ריק; חושב; טיוטה; טיוטה עם כפילות; קבלה ושאלת סוג; שאלת סכום; ודאות נמוכה; תשובת נתונים; חסרה משפחה; נמען לא נמצא; סריקת כפילויות (רגיל, ואישור מחיקה פתוח); כלל (רגיל ועמום); הלכה; כל ה־`StatusKey` לפי tone; טיוטה שנשמרה עם «בטל»; שיחה של 4 סבבים. הנתונים בדויים, לא של משתמשים אמיתיים.
- [ ] `AssistantGalleryPage`: בראש הדף מתגים לשפה (`i18n.changeLanguage`), לערכת נושא (`document.documentElement.classList.toggle("dark")`) ולרוחב מסגרת (390 / 768 / 1440). מתחת, לכל תרחיש מסגרת בגובה 640px עם `AssistantThread` ו־`AssistantComposer`. ה־handlers הם `() => {}`. כפתור «פתח במיכל» פותח את `AssistantShell` האמיתי עם התרחיש.
- [ ] `routes.ts`: הנתיב `/dev/assistant` עם `lazyRouteComponent`, ונכנס ל־`addChildren` רק כש־`import.meta.env.DEV`. ב־`beforeLoad` של `rootRoute`, לפני בדיקת ה־session: `if (import.meta.env.DEV && location.pathname.startsWith("/dev/")) return;`. Vite מחליף את `import.meta.env.DEV` ב־`false` בבילד, ולכן הנתיב והקוד לא קיימים בייצור.
- [ ] לוודא: `npm run build`, ואז `rg -l "AssistantGalleryPage|assistant-gallery-fixtures" dist` מחזיר כלום.
- [ ] בכל PR אחרי זה, תרחיש חדש או מצב חדש מקבלים fixture בגלריה.

### משימה 11: בחירת המיכל במחשב, בעין

- [ ] זמנית, בענף בלבד: `?assistantShell=sheet` ב־URL מחליף את `ASSISTANT_DESKTOP_SHELL`.
- [ ] Push ל־Preview. צילומי מסך ב־1440 ו־1024, בעברית ובאנגלית, בהיר וכהה, לשני הווריאנטים, עם טיוטה ועם היסטוריה של 3 סבבים.
- [ ] יוסי בוחר. מוחקים את הווריאנט השני ואת פרמטר ה־URL. `ASSISTANT_DESKTOP_SHELL` נמחק, והמיכל שנבחר נשאר קבוע בקוד.
- [ ] commit: `feat(ai): rebuild the assistant as a chat on shadcn AI Elements`.

---

## PR UI-4 — שאר הכרטיסים

**ענף:** `feat/ai-ui4-reply-cards`. **סוג:** UI. רק רכיבי תצוגה, בלי שינוי ב־handlers.

- [ ] **`DataAnswer`:** התשובה כטקסט עוזר רגיל (`p.text-sm.leading-relaxed`) מ־`formatDataAnswer`, כמו היום. מתחת: שורת `text-xs text-muted-foreground` עם הטווח `from`–`to` דרך `useDisplayDate`. `askFamily` דרך `ChoiceRow`. `nameMissing`: הטקסט, ו־`Button variant="outline" size="sm"` עם `Search` ו־`aiIntake.categorySearch`. `dataNotice`: `StatusNote` (`unsupported` → info, `mixed` → info, `failed` → error).
- [ ] **`DuplicateScanCard`:** `pending` → `Spinner` + `aiIntake.duplicateScanPending`. `failed` → `StatusNote` error. `empty` → `StatusNote` success עם `duplicateScanEmpty`. רשימה: כותרת `duplicateScanCount` או `duplicateScanCountOne`, ואחריה `Card` לכל זוג עם `ItemGroup` של שני `Item` (תאריך מעוצב, סכום מעוצב, תיאור). לכל צד `Button variant="ghost" size="sm"` עם `Trash2` ו־`aiIntake.duplicateDelete`. ב־`CardFooter`: `Button variant="outline" size="sm"` עם `aiIntake.duplicateNot`. אישור מחיקה, לפי תבנית Confirmation: `Alert variant="destructive"` בתוך ה־Item, עם `duplicateConfirm` (`destructive`) ו־`duplicateCancel` (`outline`). `actionFailed` → `StatusNote` error.
- [ ] **`RuleCard`:** `Card` עם `CardTitle` = שם הכלל ו־`Badge` של הסוג. `CardDescription` = `aiIntake.ruleSentence`. עמום: `ChoiceRow` עם `aiIntake.askRule`. `CardFooter`: `Button` עם `aiIntake.ruleApprove` ו־`Spinner` בזמן `saving`.
- [ ] **`HalachaCard`:** `figure` עם `rounded-xl bg-primary/5 p-4`: אייקון `Quote` ב־`text-primary/60`, הציטוט ב־`blockquote.text-sm.leading-relaxed`, ו־`figcaption` עם ההסתייגות ב־`text-xs text-muted-foreground` ו־`Button variant="link" asChild` עם `Link to="/halacha"` ו־`BookOpen`. בלי פס צבע בצד (`border-s-4`): זה דפוס אסור.
- [ ] מוחקים את ה־markup הזמני מ־UI-3.
- [ ] בדיקות האפיון עוברות בלי שינוי. `npm test`, `typecheck`, `lint:ratchet`, `build`.
- [ ] commit: `feat(ai): style data, duplicate, rule and halacha replies`.

---

## PR UI-5 — תנועה ורגעי wow

**ענף:** `feat/ai-ui5-motion`. **סוג:** UI. בלי תלויות חדשות: `framer-motion`, `react-countup`, `react-dropzone` ו־`GoldenBubbles` כבר בפרויקט.

**העיקרון:** כל אפקט מספר משהו אמיתי על מה שה־AI עושה: קורא, מבין, ממלא, שומר. אין קישוט לשם קישוט.

**חוקי תנועה:**
- מנפישים רק `transform` ו־`opacity`, אף פעם לא רוחב, גובה או margin. `layout` של framer-motion מותר, כי הוא עובד דרך transform.
- easing: ease-out-quart, `[0.25, 1, 0.5, 1]`. בלי bounce ובלי elastic.
- משכים: 150–250ms לכניסה, עד 900ms להדגשה שדועכת.
- `useReducedMotion()` ו־`motion-reduce:` מכבים כל תנועה. המידע נשאר: הסימון נשאר סטטי, ה־shimmer הופך לטקסט מעומעם, והמספרים מופיעים מיד.

**אסור:** פס צבע בצד, טקסט גרדיאנט דקורטיבי (ה־shimmer מותר רק כמצב טעינה), glassmorphism, אימוג'י, אנימציה שחוזרת בלי סיבה.

### משימה 1: טוקני תנועה ו־Shimmer

**Files:** Create `src/components/ai-intake/assistant-motion.ts`, `src/components/ui/shimmer.tsx`; Modify `tailwind.config.js`

- [ ] `assistant-motion.ts`:

```ts
import type { Transition, Variants } from "framer-motion";

export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export const enter: Transition = { duration: 0.22, ease: EASE_OUT_QUART };

export const turnVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: enter },
};

export const blockListVariants: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const fieldVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: enter },
};
```

- [ ] ב־`tailwind.config.js`, תחת `keyframes` ו־`animation`. השם `text-shimmer` ולא `shimmer`, כי `@keyframes shimmer` כבר מוגדר פעמיים (ב־config וב־`index.css`) עם תוכן שונה:

```js
"text-shimmer": { from: { backgroundPosition: "100% 0" }, to: { backgroundPosition: "0% 0" } },
"receipt-scan": { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(400%)" } },
// animation:
"text-shimmer": "text-shimmer 1.8s linear infinite",
"receipt-scan": "receipt-scan 1.4s cubic-bezier(0.25,1,0.5,1) infinite",
```

- [ ] `shimmer.tsx`:

```tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Shimmer({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="shimmer"
      className={cn(
        "inline-block bg-[linear-gradient(90deg,hsl(var(--muted-foreground))_35%,hsl(var(--foreground))_50%,hsl(var(--muted-foreground))_65%)] bg-[length:250%_100%] bg-clip-text text-transparent animate-text-shimmer rtl:[animation-direction:reverse]",
        "motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] להוסיף `shimmer` ל־`PORTED` ב־`scripts/ai-primitives-rtl.test.ts`.

### משימה 2: "חושב" שמספר מה הוא עושה (TDD)

**Files:** Modify `assistant-reply-view.ts` (+test), `AssistantDrawer.tsx`, `ReplyBlockView.tsx`, locales

- [ ] `ReplyBlock` `thinking` מקבל `phase: "reading" | "receipt" | "voice" | "data" | "duplicates"`. `ReplyState` מקבל `pendingPhase: "reading" | "receipt" | "voice" | null`.
- [ ] חוקים חדשים ל־`buildReplyBlocks`, עם בדיקות שנכתבות קודם: `checking` נותן `thinking(pendingPhase)`. `intent === "ask_data" && dataReply === null && !checking` נותן `thinking("data")`. כך גם הזמן של `loadDataAnswer`, שהיום ריק לגמרי, מקבל מצב טעינה. `duplicateScan.status === "pending"` נותן `thinking("duplicates")`.
- [ ] `AssistantDrawer`: `setPendingPhase` לפני `setChecking(true)`. `handleSubmit` מקבל `"reading"`, `handleReceipt` מקבל `"receipt"`, ו־`finishVoice` מקבל `"voice"`.
- [ ] תצוגה: `AssistantMark` (משימה 3) במצב חושב, ולידו `<Shimmer>{t(\`aiIntake.thinking.${phase}\`)}</Shimmer>`, עם `role="status"`.
- [ ] מפתחות: `thinking.reading` «קורא את ההודעה…», `thinking.receipt` «קורא את הקבלה…», `thinking.voice` «מתמלל…», `thinking.data` «מחשב מהתנועות שלך…», `thinking.duplicates` «מחפש תנועות דומות…». באנגלית: "Reading your message…", "Reading the receipt…", "Transcribing…", "Calculating from your transactions…", "Looking for similar transactions…".

### משימה 3: סימן העוזר

**Files:** Create `src/components/ai-intake/AssistantMark.tsx`

- [ ] `AssistantMark({ thinking, size = "sm" | "md" })`: עיגול `rounded-full bg-primary/10 text-primary` עם `Sparkles`, ונקודה `size-1.5 rounded-full bg-accent` בפינה העליונה בצד הסוף (`-top-0.5 -end-0.5`). זה הזהב של הלוגו, במינון קטן.
- [ ] במצב `thinking`: `motion.span` עם `animate={{ scale: [1, 1.08, 1], opacity: [1, 0.8, 1] }}` ו־`transition={{ duration: 1.6, repeat: Infinity, ease: EASE_OUT_QUART }}`. בלי סיבוב.
- [ ] בשימוש: בכותרת (`md`), וכ־`MessageAvatar` בסבב עוזר. מופיע רק בבלוק הראשון של הסבב, כדי שלא יחזור על עצמו.

### משימה 4: כניסה של הודעות ובלוקים

**Files:** Modify `AssistantThread.tsx`

- [ ] `const MotionItem = motion.create(MessageScrollerItem)`, כמו בתבנית Chat של AI Elements. סבב חדש נכנס עם `turnVariants`. רשימת הבלוקים עוטפת `motion.div` עם `blockListVariants`, וכל בלוק מקבל `motion.div variants={fieldVariants}`. סבבי היסטוריה מקבלים `initial={false}`, כדי שלא יונפשו שוב ברינדור.
- [ ] `MessageScrollerButton` (חזרה לסוף) עם `ArrowDown` ו־`aria-label="aiIntake.scrollToLatest"`.

### משימה 5: "ה־AI מילא את זה"

**Files:** Modify `DraftCard.tsx`, `AssistantDrawer.tsx`

ב־§4.6 כתוב "טיוטה ניתנת לעריכה עם סימון שדות שהוסקו". זה בדיוק המקום לרגע של wow.

- [ ] `originalDraft` שומר גם `date`. שדה מסומן כ"מולא" כל עוד הערך שלו שווה למקור: סכום, תיאור ותאריך.
- [ ] שדה מולא: `Sparkles` קטן (`size-3 text-primary`) ליד ה־`Label`, עם `<span className="sr-only">{t("aiIntake.inferred")}</span>`. כשהמשתמש משנה את השדה, הסימן נעלם. זה מראה בדיוק מה ה־AI הבין ומה המשתמש תיקן.
- [ ] בכניסה: השדות נכנסים אחד אחרי השני (`staggerChildren: 0.06`: סכום, תאריך, תיאור). כל שדה מקבל שכבה `absolute inset-0 rounded-md bg-primary/10` שדועכת מ־opacity 1 ל־0 ב־900ms, כמו מילוי אוטומטי.
- [ ] מפתח: `inferred` «מולא אוטומטית» / "Filled in automatically".

### משימה 6: בחירת סוג באריחים

**Files:** Create `blocks/TypeChoice.tsx`; Modify `ReplyBlockView.tsx`

- [ ] במקום `ChoiceRow` ב־`askType`: `grid grid-cols-3 gap-2`. כל אריח הוא `button` עם `rounded-xl border bg-card p-3 flex flex-col items-center gap-1.5`, ובו אייקון בתוך `size-9 rounded-full` עם `BASE_TYPE_TINT` ו־`BASE_TYPE_ICON`, ותווית `text-sm font-medium`. אותו אופי כמו טופס התנועה.
- [ ] תנועה: `whileHover={{ y: -2 }}` ו־`whileTap={{ scale: 0.98 }}`. `focus-visible:ring-2 ring-ring`. שם הנגישות נשאר `aiIntake.types.X`.
- [ ] בקבלה: מעל האריחים, תצוגה מקדימה של מה שנקרא (`receiptPreview`) כשורה `Item`, עם הסכום המעוצב.

### משימה 7: קבלה שרואים

**Files:** Modify `AssistantDrawer.tsx`, `AssistantThread.tsx`

- [ ] `UserTurn` של קבלה מקבל `previewUrl: string | null`. ב־`handleReceipt`, לתמונה: `URL.createObjectURL(file)`. ל־PDF: `null`. כל ה־URLs נשמרים ב־ref ומשוחררים ב־`clearConversation` וב־unmount, דרך `URL.revokeObjectURL`.
- [ ] בבועה: `Attachment orientation="vertical"` עם `AttachmentMedia variant="image"` ו־`<img alt={fileName}>`. ל־PDF: `FileText`.
- [ ] בזמן `pendingPhase === "receipt"`, בסבב הפעיל: פס סריקה מעל התמונה, `absolute inset-x-0 top-0 h-1/4 bg-primary/20 animate-receipt-scan motion-reduce:hidden`, בתוך `overflow-hidden`.
- [ ] הקובץ לא נשלח לשום מקום חדש. ה־URL מקומי בלבד, והקריאה ל־`readReceiptImage(file)` לא משתנה.

### משימה 8: הקלטה חיה (TDD לפונקציה הטהורה)

**Files:** Create `src/components/ai-intake/assistant-audio-level.ts` (+test); Modify `AssistantDrawer.tsx`, `AssistantComposer.tsx`

- [ ] פונקציה טהורה, עם בדיקה קודם (שקט נותן 0, רעש מלא נותן 1, החזרה בטווח):

```ts
/** RMS of time-domain bytes (128 = silence), mapped to 0..1. */
export function levelFromSamples(samples: Uint8Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 2.5);
}
```

- [ ] ב־`toggleRecording`, אחרי `getUserMedia`, בתוך `try`: `AudioContext`, ‏`createAnalyser()` עם `fftSize = 256`, ו־`createMediaStreamSource(stream).connect(analyser)`. לולאת `requestAnimationFrame` מעדכנת `level` לכל היותר 15 פעמים בשנייה, ו־`elapsed` בשניות. ב־`onstop` וב־`stopRecording`: `cancelAnimationFrame` ו־`context.close()`. אם `AudioContext` לא קיים, מוצג רק הטיימר. ההקלטה עצמה לא משתנה.
- [ ] ב־`AssistantComposer`, כש־`recording`: במקום ה־textarea, שורה עם נקודה `size-2 rounded-full bg-destructive animate-pulse`, חמישה פסים `w-1 rounded-full bg-primary origin-bottom` עם `style={{ transform: \`scaleY(${0.25 + level * weights[i]})\` }}`, וטיימר `tabular-nums` `0:12 / 1:00`. אחריהם כפתור עצירה.
- [ ] מפתח: `recording` «מקליט» / "Recording".

### משימה 9: גרירה והדבקה של קבלה

**Files:** Modify `AssistantShell.tsx`, `AssistantComposer.tsx`, `AssistantDrawer.characterization.test.tsx`

- [ ] במחשב: `useDropzone({ noClick: true, noKeyboard: true, multiple: false, accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "application/pdf": [] }, onDropAccepted: ([file]) => onReceipt(file) })` על תוכן המיכל. ב־`isDragActive`: שכבה `absolute inset-2 rounded-xl border-2 border-dashed border-primary/50 bg-background/90` עם `Receipt` ו־`aiIntake.dropReceipt` («שחרר כאן קבלה» / "Drop the receipt here").
- [ ] בשורת הכתיבה: `onPaste`. אם `clipboardData.files[0]` הוא אחד מהסוגים האלה, `preventDefault()` ו־`onReceipt(file)`. צילום מסך של קבלה עם Ctrl+V עובד.
- [ ] שני המסלולים קוראים לאותו `handleReceipt`. בדיקה חדשה: הדבקת `File` של `image/png` בשורת הכתיבה קוראת ל־`readReceiptImage` עם הקובץ.

### משימה 10: רגע השמירה

**Files:** Modify `DraftCard.tsx`

- [ ] כש־`locked` אחרי `saved`, הכרטיס מתכווץ לשורת סיכום (`motion.div layout`). בשורה: `CircleCheck` שהקו שלו מצויר (`motion.path` עם `pathLength` מ־0 ל־1 ב־350ms) ב־`text-success`, `aiIntake.saved`, הסכום המעוצב, התיאור ו«בטל».
- [ ] תרומה (`donation` או `non_tithe_donation`): `GoldenBubbles` פעם אחת, אותו רכיב של סימון חומש בטופס. זה רגע המעשר של Ten10. בהוצאה ובהכנסה: רק הסימון.
- [ ] בנייד: `navigator.vibrate?.(12)` אחרי שמירה מוצלחת.
- [ ] `motion-reduce`: אין בועות ואין ציור. הסימון מופיע מלא.

### משימה 11: תשובה עם מספר

**Files:** Modify `blocks/DataAnswer.tsx`

- [ ] מעל המשפט: הסכום (או המספר, ב־`count`), ב־`text-2xl font-semibold tabular-nums` עם `dir="ltr"`. `CountUp` מ־`react-countup`, עם `duration={0.6}` ו־`preserveValue`. ב־`motion-reduce` הערך מופיע מיד. מתחתיו המשפט מ־`formatDataAnswer` והטווח.
- [ ] בלי גרדיאנט, בלי כרטיס ובלי "שורת KPI": מספר אחד שעונה על השאלה, והמשפט שמסביר אותו.

### משימה 12: השוואת כפילות

**Files:** Modify `DraftCard.tsx`

- [ ] ב־`Alert variant="warning"`, המועמד הראשון מוצג בשתי עמודות, «החדשה» מול «הקיימת». שדות זהים (סכום, תיאור), ותאריך בהפרש של עד 3 ימים, מודגשים ב־`rounded bg-warning/15 px-1`. כך רואים מיד למה המערכת חושבת שזו כפילות. שאר המועמדים נשארים ברשימה.

### משימה 13: מצב ריק חי

**Files:** Modify `AssistantThread.tsx`, locales

- [ ] הכותרת לפי שעה מקומית: `greeting.morning` (5–11) «בוקר טוב», `greeting.afternoon` (12–16) «צהריים טובים», `greeting.evening` (17–21) «ערב טוב», `greeting.night` «לילה טוב». באנגלית: "Good morning", "Good afternoon", "Good evening", "Good night". `AssistantMark size="md"` מעליה.
- [ ] ההצעות כ־chips עם אייקון מוביל: `CreditCard` לתנועה, `ChartColumn` לשאלה, `CopyCheck` לכפילויות, `ListChecks` לכלל. כניסה מדורגת של 40ms.

### משימה 14: בדיקה ו־commit

- [ ] `npm test`, `typecheck`, `lint:ratchet`, `build`. בדיקות האפיון עוברות.
- [ ] בדיקה בעין עם `prefers-reduced-motion: reduce` (DevTools → Rendering): כל המידע גלוי ושום דבר לא זז.
- [ ] Performance ב־DevTools בנייד מדומה (4x CPU slowdown): אין long task מעל 50ms בזמן כניסת טיוטה.
- [ ] commit: `feat(ai): add purposeful motion to the assistant`.

---

## PR UI-6 — QA ותיעוד

**ענף:** `feat/ai-ui6-qa-docs`.

- [ ] צילומי Playwright לעוזר, על `/dev/assistant` מקומית (בלי התחברות ובלי backend): מצב ריק, טיוטה עם כפילות, שאלת נתונים וסריקת כפילויות. כל אחד בעברית ובאנגלית, בהיר וכהה, ב־390 וב־1440. התמונות נשמרות כבסיס להשוואה. זה גם הבסיס הוויזואלי שנדרש לפני שדרוג ל־Tailwind 4.
- [ ] מטריצת QA (סעיף 9) על ה־Preview, כולל טלפון אמיתי (Android Chrome ו־iOS Safari): מקלדת פתוחה לא מכסה את שורת הכתיבה, גלילה בתוך המגירה, Share Target של קובץ ושל טקסט נפתח בשיחה.
- [ ] `llm-instructions/features/ai/ai-intake-how-it-works.md`: פסקת UI קצרה. שיחה עם היסטוריה שנמחקת בסגירה, Drawer בנייד, המיכל שנבחר במחשב, ושמירה חוזרת חסומה אחרי שמירה.
- [ ] `llm-instructions/ui/ui-component-guidelines.md`: סעיף 12, «AI Elements ב־Tailwind 3». מה הועתק, טבלת ההמרה (סעיף 6), ואיך מוסיפים רכיב AI חדש.
- [ ] `docs/superpowers/plans/ai-progress.md`: שורות UI-1 עד UI-6 בטבלה, ויומן.
- [ ] commit: `docs(ai): document the assistant chat UI`.

---

## 6. טבלת המרה: Tailwind 4 → Tailwind 3

| v4 (registry) | v3 (אצלנו) |
|---|---|
| `import { cn } from "cn"` | `import { cn } from "@/lib/utils"` |
| `import { Slot } from "radix-ui"` + `Slot.Root` | `import { Slot } from "@radix-ui/react-slot"` + `Slot` |
| `*:data-[slot=x]:bg-primary` | `[&>[data-slot=x]]:bg-primary` |
| `*:data-slot:self-end` | `[&>[data-slot]]:self-end` |
| `*:[img]:aspect-square` | `[&>img]:aspect-square` |
| `has-data-[slot=x]:px-2` | `has-[[data-slot=x]]:px-2` |
| `group-has-data-[slot=x]/g:…` | `group-has-[[data-slot=x]]/g:…` |
| `has-[>a,>button]:hover:bg-muted/50` | `[&:has(>a,>button):hover]:bg-muted/50` |
| `[button]:text-left` | `[&:is(button)]:text-start` |
| `[button,a]:focus-visible:…` | `[&:is(button,a)]:focus-visible:…` |
| `wrap-break-word` | `break-words` |
| `ring-3` | `ring-2` |
| `inset-s-1/2` | `start-1/2` |
| `left-3` / `right-3` | `start-3` / `end-3` |
| `size-6!` | `!size-6` |
| `w-30` | `w-[7.5rem]` |
| `duration-400` | `duration-[400ms]` |
| `data-autoscrolling:…` | `data-[autoscrolling]:…` |
| `data-pending-scroll:invisible` | `data-[pending-scroll]:invisible` |
| `scrollbar-thin` | `[scrollbar-width:thin]` |
| `scrollbar-none` | `[scrollbar-width:none]` |
| `scrollbar-gutter-stable` | `[scrollbar-gutter:stable]` |
| `contain-content` | `[contain:content]` |
| `scroll-fade-b`, `scroll-fade-x` | מוחקים |
| `shimmer` | `animate-pulse` |
| `bg-[color-mix(in_oklch,var(--secondary),…)]` | `bg-secondary/80` |
| `bg-[color-mix(in_oklch,var(--muted),…)]` | `bg-muted/80` |
| `bg-[oklch(from_var(--primary)_0.93_…)]` (tinted) | `bg-primary/10 dark:bg-primary/20` |
| tinted hover | `bg-primary/20 dark:bg-primary/30` |
| `size="icon-sm"` / `"icon-xs"` | אותו דבר, אחרי UI-2 משימה 2 |

## 7. מה כל בלוק מקבל מ־AI Elements

| מצב היום | בלוק | תבנית / רכיב |
|---|---|---|
| ההודעה שנשלחה (לא מוצגת היום) | סבב משתמש | Message + Bubble + Attachment |
| `checking` | `thinking` | Spinner |
| `askIntent`, `askType`, `askFamily`, כלל עמום | `ChoiceRow` | Suggestion (Button outline) |
| טיוטה | `DraftCard` | Card + InputGroup + DatePicker + Alert + Item |
| קבלה | `ReceiptAttachment` | Attachment |
| תשובת נתונים | `DataAnswer` | טקסט עוזר |
| סריקת כפילויות ומחיקה | `DuplicateScanCard` | Item + Confirmation (Alert) |
| כלל | `RuleCard` | Card + Badge |
| הלכה | `HalachaCard` | blockquote + Button link |
| הודעת מצב | `StatusNote` | אייקון + טוקן סמנטי |
| שורת הכתיבה | `AssistantComposer` | Prompt Input (InputGroup) |
| השיחה | `AssistantThread` | Chat (MessageScroller) + Empty + Suggestion |

## 8. שינויי התנהגות מכוונים (כל השאר נשאר)

1. **שיחה עם היסטוריה.** סבב קודם נשאר גלוי לקריאה בלבד. הפעולות פעילות רק בסבב האחרון.
2. **תשובה ל«כמה?» נכתבת בשורת הכתיבה,** כמו בכל צ'אט, ומופיעה כבועה של המשתמש. כש־`clarification === "amount"`, שליחה קוראת ל־`handleAmountReply(text)`. החתימה הופכת ל־`handleAmountReply(reply = amountReply)`. השדה הנפרד והכפתור «המשך» נמחקים. זה תואם את מה שקורה היום: שליחת הטופס במצב הזה כבר קוראת ל־`handleAmountReply`.
3. **אחרי שמירה הטיוטה ננעלת.** אין לחיצה שנייה על «אשר ושמור» (מתקן את סעיף 2.8). אחרי «בטל», הטיוטה חוזרת להיות ניתנת לעריכה, כמו היום.
4. **שליחה ריקה חסומה.** הכפתור `disabled` כשאין טקסט. היום שליחה ריקה מציגה «אני יודע רק לטפל בתנועות».
5. **שורת הכתיבה מתרוקנת אחרי שליחה.**
6. **התאריך נבחר ב־`DatePicker`,** והוא מכבד את הלוח העברי. הערך הנשמר נשאר `YYYY-MM-DD`, ובדיקות `isIsoDate` ו־`MIN_TRANSACTION_DATE` נשארות.
7. **סכומים ותאריכים בכפילויות** מוצגים דרך `formatCurrency` ו־`useDisplayDate`.
8. **שני מסלולי קלט חדשים לקבלה (UI-5):** גרירה למיכל במחשב, והדבקה מהלוח. שניהם קוראים ל־`handleReceipt` הקיים, עם אותם סוגי קבצים ואותה תקרה.
9. **מצב טעינה לשאלת נתונים (UI-5).** היום, בזמן החישוב לא מוצג כלום.

## 9. מטריצת QA

| ציר | ערכים |
|---|---|
| שפה | עברית (RTL), אנגלית (LTR) |
| ערכת נושא | בהיר, כהה |
| רוחב | 360, 390, 768, 1024, 1440 |
| גובה | מחשב נמוך (`short`: ≥1024 רוחב, <800 גובה) |
| זרימות | טקסט → טיוטה → שמירה → ביטול; בלי סוג; בלי סכום; כפילות; ודאות נמוכה; שאלת נתונים; סריקת כפילויות ומחיקה; כלל; הלכה; קבלה (תמונה, PDF, גדולה מדי, כשל); דיבור (אישור, דחייה, ארוך מדי); Share Target; שיחה חדשה; סגירה ופתיחה |
| נגישות | ניווט מקלדת בלבד, פוקוס נראה בשני הנושאים, קורא מסך מכריז על תשובה חדשה (`aria-live`), לכל כפתור אייקון יש שם |

## 10. מחוץ לתחום

- טעינה עצלה של העוזר (§8.1). `Sidebar` קורא ל־`assistantRef.current?.receive` מיד אחרי `setAssistantOpen(true)`, ו־`React.lazy` ישבור את Share Target. נדרש PR נפרד עם תור.
- הוצאת הלוגיקה מ־`AssistantDrawer.tsx` ל־hook. אפשר אחרי UI-4, כשהבדיקות מכסות.
- streaming, Reasoning, Tool ו־Trace. התשובות היום לא מוזרמות.
- עריכה מלאה דרך `TransactionForm.onOverrideSubmit` (§4.6). זו יכולת חדשה, לא עיצוב.
- שדרוג ל־Tailwind 4. נעשה על `main` אחרי מיזוג `feat/ai-intake`, ב־PR נפרד עם צילומי Playwright לפני ואחרי. אחריו מחליפים את ארבעת הקבצים שהועתקו בגרסת ה־registry (`npx shadcn@latest add message bubble attachment message-scroller --overwrite`).
- ניסוח מחדש של הודעות קיימות («לא נשמר.» בסוף כל שגיאה).

## 11. מפתחות תרגום חדשים

כולם ב־`public/locales/{he,en}/navigation.json`, תחת `aiIntake`. ה־namespace `navigation` נטען מראש ב־`src/lib/i18n.ts`, ולכן אין טעינה מאוחרת. אין להשתמש במקף ארוך (—) בטקסט.

| מפתח | עברית | English | PR |
|---|---|---|---|
| `newChat` | שיחה חדשה | New chat | UI-3 |
| `emptyTitle` | במה לעזור? | How can I help? | UI-3 |
| `emptyDescription` | אפשר לכתוב, לצלם קבלה או לדבר. שום דבר לא נשמר בלי אישור שלך. | Type, snap a receipt, or talk. Nothing is saved without your OK. | UI-3 |
| `suggestions.transaction` | קניתי קפה ב־12 ש״ח | I bought coffee for 12 ILS | UI-3 |
| `suggestions.question` | כמה תרמתי השנה? | How much did I donate this year? | UI-3 |
| `suggestions.duplicates` | יש כפילויות? | Any duplicates? | UI-3 |
| `suggestions.rule` | מהיום כל הוצאה על גן היא הוצאה מוכרת | From now on, daycare is a recognized expense | UI-3 |
| `scrollToLatest` | לסוף השיחה | Jump to latest | UI-5 |
| `thinking.reading` | קורא את ההודעה… | Reading your message… | UI-5 |
| `thinking.receipt` | קורא את הקבלה… | Reading the receipt… | UI-5 |
| `thinking.voice` | מתמלל… | Transcribing… | UI-5 |
| `thinking.data` | מחשב מהתנועות שלך… | Calculating from your transactions… | UI-5 |
| `thinking.duplicates` | מחפש תנועות דומות… | Looking for similar transactions… | UI-5 |
| `inferred` | מולא אוטומטית | Filled in automatically | UI-5 |
| `recording` | מקליט | Recording | UI-5 |
| `dropReceipt` | שחרר כאן קבלה | Drop the receipt here | UI-5 |
| `greeting.morning` | בוקר טוב | Good morning | UI-5 |
| `greeting.afternoon` | צהריים טובים | Good afternoon | UI-5 |
| `greeting.evening` | ערב טוב | Good evening | UI-5 |
| `greeting.night` | לילה טוב | Good night | UI-5 |

מפתחות קיימים לא משנים ולא מוחקים. `continue` ו־`askAmount` נשארים: `askAmount` משמש גם את ה־placeholder של שורת הכתיבה במצב סכום.

## 12. סיכונים

| סיכון | מה עושים |
|---|---|
| vaul וחלון קופץ של `DatePicker` בתוך המגירה | `TransactionEditModal` כבר עושה את זה בנייד. בודקים בטלפון אמיתי. |
| מקלדת בנייד מכסה את שורת הכתיבה | `h-[92dvh]` ו־`safe-area-inset-bottom`. vaul מזיז קלט כברירת מחדל (`repositionInputs`). בודקים ב־iOS. |
| `@shadcn/react` לפני 1.0 | גרסה נעולה (`--save-exact`). החלופה: `ScrollArea` ו־`scrollIntoView`, אותו API של `MessageScrollerItem`. |
| מחלקות v3 משורשרות (`group-data-…:[&>…]:…`) | בודקים בעין ב־UI-2, דרך ה־Preview של UI-3. אם לא נוצר CSS, מפרקים לשתי מחלקות. |
| נעילת הווריאנט בזמן מקלדת | אותו דפוס כמו `ResponsiveConfirmationDialog` (§11 ב־`ui-component-guidelines.md`). |
