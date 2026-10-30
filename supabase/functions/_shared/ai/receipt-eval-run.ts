import { readModelText, receiptFilePart } from "./receipt-draft.ts";
import { splitAnthropicBody, SPLIT_MESSAGES_URL, SPLIT_MODEL, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { readModelUsage } from "./model-call.ts";
import { readSplitResponse } from "./split-response.ts";
import { scoreSplitFields, type SplitExpected, type SplitFieldScore } from "./split-score.ts";
import { gatewayProviderOptions } from "./gateway-tags.ts";

/**
 * Args: transcription model, env file, results json path.
 * Copy the file to text, then read that text with the intake model.
 * The copy prompt is the generic instruction. It is not fitted to this set.
 */

const TRANSCRIBE_MODEL = Deno.args[0] ?? "anthropic/claude-haiku-5.5";
const ENV_PATH = Deno.args[1] ?? "";
const OUT_PATH = Deno.args[2] ?? "";

const COPY_PROMPT = [
  "Copy this document line by line, as written.",
  "The photo may be rotated or upside down.",
  "The text may be Hebrew or English. Copy what you can read. Do not refuse.",
  "Do not interpret, translate, calculate, or add fields.",
  "Keep the original language and the original digits.",
].join("\n");

function copyHasDigits(text: string): boolean {
  return /\d/.test(text);
}

function readKey(): string {
  const file = Deno.readTextFileSync(ENV_PATH);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function mediaType(file: string): string | null {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".pdf")) return "application/pdf";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

interface ReceiptCase {
  id: string;
  file: string;
  kind: "receipt" | "several" | "statement";
  today: string;
  expected: SplitExpected;
}

function rate(correct: number, checked: number): number | null {
  return checked === 0 ? null : Math.round((correct / checked) * 1000) / 1000;
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  const total = present.reduce((sum, value) => sum + value, 0);
  return Math.round((total / present.length) * 1_000_000) / 1_000_000;
}

function shorten(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= 800 ? trimmed : `${trimmed.slice(0, 800)}…`;
}

function reasoningTokens(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: { output_tokens_details?: { reasoning_tokens?: unknown } } }).usage;
  const value = usage?.output_tokens_details?.reasoning_tokens;
  return typeof value === "number" ? value : null;
}

async function post(key: string, url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`http ${response.status} ${detail.slice(0, 240)}`);
  }
  return response.json();
}

const root = new URL("./fixtures/receipts/", import.meta.url);
const lines = Deno.readTextFileSync(new URL("answers.jsonl", root)).split(/\r?\n/).filter((line) => line.length > 0);
const cases = lines.map((line) => JSON.parse(line) as ReceiptCase);
const key = readKey();
const sentences: {
  id: string;
  kindOk: boolean;
  fields: SplitFieldScore;
  copy: string | null;
  read: string | null;
  copyReasoningTokens: number | null;
  readReasoningTokens: number | null;
  copyCostUsd: number | null;
  readCostUsd: number | null;
}[] = [];
let failed = 0;

for (const item of cases) {
  try {
    const type = mediaType(item.file);
    const bytes = Deno.readFileSync(new URL(item.file, root));
    const part = type ? receiptFilePart(type, encodeBase64(bytes)) : null;
    if (!part) throw new Error(`${item.id} unsupported file`);
    const copiedPayload = await post(key, SPLIT_RESPONSES_URL, {
      model: TRANSCRIBE_MODEL,
      max_output_tokens: 4000,
      input: [{ role: "user", content: [{ type: "input_text", text: COPY_PROMPT }, part] }],
      providerOptions: {
        gateway: gatewayProviderOptions({ source: "eval" }),
        anthropic: { thinking: { type: "disabled" } },
      },
    });
    const copied = readModelText(copiedPayload);
    const readable = copyHasDigits(copied);
    const readPayload = readable
      ? await post(key, SPLIT_MESSAGES_URL, {
        ...splitAnthropicBody(copied, item.today, { receipt: true }, "eval"),
        model: SPLIT_MODEL,
      })
      : null;
    const read = readPayload ? readModelText(readPayload) : "";
    const fields = scoreSplitFields(copied, read, item.today, item.expected);
    const actual = readSplitResponse(copied, read, item.today);
    const kindOk = item.kind === "statement"
      ? actual.route === "list"
      : actual.route === "several"
        && actual.items.length === (item.kind === "receipt" ? 1 : item.expected.items.length);
    sentences.push({
      id: item.id,
      kindOk,
      fields,
      copy: shorten(copied),
      read: shorten(read),
      copyReasoningTokens: reasoningTokens(copiedPayload),
      readReasoningTokens: readPayload ? reasoningTokens(readPayload) : null,
      copyCostUsd: readModelUsage(copiedPayload).costUsd,
      readCostUsd: readPayload ? readModelUsage(readPayload).costUsd : null,
    });
  } catch (error) {
    failed += 1;
    sentences.push({
      id: item.id,
      kindOk: false,
      fields: scoreSplitFields("", "", item.today, item.expected),
      copy: null,
      read: error instanceof Error ? error.message : "failed",
      copyReasoningTokens: null,
      readReasoningTokens: null,
      copyCostUsd: null,
      readCostUsd: null,
    });
  }
}

const fields = sentences.map((sentence) => sentence.fields);
const sum = (pick: (score: SplitFieldScore) => number) => fields.reduce((total, score) => total + pick(score), 0);
const summary = {
  transcribeModel: TRANSCRIBE_MODEL,
  readerModel: SPLIT_MODEL,
  cases: cases.length,
  failed,
  kind: rate(sentences.filter((sentence) => sentence.kindOk).length, sentences.length),
  amount: rate(sum((score) => score.amountCorrect), sum((score) => score.amountChecked)),
  date: rate(sum((score) => score.dateCorrect), sum((score) => score.dateChecked)),
  wrongAnchoredAmount: fields.filter((score) => score.wrongAnchoredAmount).length,
  checkAmounts: sum((score) => score.checkAmounts),
  costPerReceiptUsd: average(sentences.map((sentence) => (
    sentence.copyCostUsd === null && sentence.readCostUsd === null
      ? null
      : (sentence.copyCostUsd ?? 0) + (sentence.readCostUsd ?? 0)
  ))),
  sentences,
};

console.log(JSON.stringify({ ...summary, sentences: sentences.length }, null, 2));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
