import { readModelText } from "./receipt-draft.ts";
import { splitRequestBody, SPLIT_MODEL, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { parseSplitPayload, readSplitResponse } from "./split-response.ts";

/** Standing-order sentences from the plan, including review-wish section 2. Not fitted to a model. */

const TODAY = "2026-10-28";

interface RecurringCase {
  id: string;
  text: string;
  amount: number;
  currency: "ILS" | "USD" | "EUR";
  type?: "donation" | "expense" | "income";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  calendar?: "gregorian" | "hebrew";
  day?: number;
  count?: number;
  notRecurring?: boolean;
  unsupported?: boolean;
  startMonth?: string;
}

const CASES: RecurringCase[] = [
  {
    id: "he-01",
    text: "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש",
    amount: 200,
    currency: "ILS",
    type: "donation",
    frequency: "monthly",
    calendar: "hebrew",
    day: 1,
  },
  {
    id: "he-02",
    text: "מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה",
    amount: 1500,
    currency: "ILS",
    type: "expense",
    frequency: "monthly",
    calendar: "gregorian",
    day: 10,
  },
  {
    id: "he-03",
    text: "תפתח תרומה קבועה של 36 שקל לחב״ד כל שבוע, ל־12 שבועות",
    amount: 36,
    currency: "ILS",
    type: "donation",
    frequency: "weekly",
    count: 12,
  },
  {
    id: "en-01",
    text: "Set up a monthly donation of 100 NIS to Ezer Mizion starting next month",
    amount: 100,
    currency: "ILS",
    type: "donation",
    frequency: "monthly",
  },
  {
    id: "en-02",
    text: "From now on log 180 shekels every year on Purim for matanot la'evyonim",
    amount: 180,
    currency: "ILS",
    frequency: "yearly",
  },
  {
    id: "en-03",
    text: "make my fifty dollar pledge to the kollel recurring every month until the end of the year",
    amount: 50,
    currency: "USD",
    type: "donation",
    frequency: "monthly",
  },
  {
    id: "he-this-month",
    text: "200 ש״ח לכולל בכל 30 לחודש, גם החודש",
    amount: 200,
    currency: "ILS",
    type: "donation",
    frequency: "monthly",
    day: 30,
    startMonth: "2026-10",
  },
  {
    id: "he-next-month",
    text: "200 ש״ח לכולל בכל 10 לחודש, מהחודש הבא",
    amount: 200,
    currency: "ILS",
    type: "donation",
    frequency: "monthly",
    day: 10,
    startMonth: "2026-11",
  },
  {
    id: "en-bimonthly",
    text: "Pay 40 dollars bimonthly for the gym",
    amount: 40,
    currency: "USD",
    notRecurring: true,
    unsupported: true,
    frequency: "monthly",
  },
  {
    id: "en-non",
    text: "This is a non-recurring expense of 15 dollars for coffee",
    amount: 15,
    currency: "USD",
    notRecurring: true,
    unsupported: false,
    frequency: "monthly",
  },
];

function readKey(path: string): string {
  const file = Deno.readTextFileSync(path);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

async function ask(key: string, text: string): Promise<unknown> {
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...splitRequestBody(text, TODAY, {}, "eval"), model: SPLIT_MODEL }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`http ${response.status} ${detail.slice(0, 180)}`);
  }
  return response.json();
}

const key = readKey(Deno.args[0] ?? "");
let passed = 0;
for (const item of CASES) {
  const first = await ask(key, item.text);
  const payload = parseSplitPayload(readModelText(first)) ? first : await ask(key, item.text).catch(() => first);
  const read = readSplitResponse(item.text, readModelText(payload), TODAY);
  const row = read.route === "several" ? read.items[0] : null;
  const recurrence = row?.recurrence ?? null;
  const checks = item.notRecurring
    ? [
      row?.amount === item.amount,
      recurrence === null,
      item.unsupported === undefined || row?.unsupportedFrequency === item.unsupported,
    ]
    : [
      row?.amount === item.amount,
      row?.currency === item.currency,
      item.type === undefined || row?.typeHint === item.type,
      recurrence?.frequency === item.frequency,
      item.calendar === undefined || recurrence?.calendarType === item.calendar,
      item.day === undefined || recurrence?.dayOfMonth === item.day,
      item.count === undefined || recurrence?.totalOccurrences === item.count,
      item.startMonth === undefined || recurrence?.startDate?.slice(0, 7) === item.startMonth,
    ];
  const ok = checks.every(Boolean);
  if (ok) passed += 1;
  console.log(JSON.stringify({
    id: item.id,
    ok,
    amount: row?.amount ?? null,
    currency: row?.currency ?? null,
    type: row?.typeHint ?? null,
    frequency: recurrence?.frequency ?? null,
    calendar: recurrence?.calendarType ?? null,
    day: recurrence?.dayOfMonth ?? null,
    count: recurrence?.totalOccurrences ?? null,
    start: recurrence?.startDate ?? null,
  }));
}
console.log(`recurring ${passed}/${CASES.length}`);
