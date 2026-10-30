import { readModelText, receiptFilePart } from "./receipt-draft.ts";
import { splitRequestBody, SPLIT_MODEL, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
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
  "Do not interpret, translate, calculate, or add fields.",
  "Keep the original language and the original digits.",
].join("\n");

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

async function post(key: string, body: unknown): Promise<unknown> {
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`http ${response.status}`);
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
  raw: string | null;
}[] = [];
let failed = 0;

for (const item of cases) {
  try {
    const type = mediaType(item.file);
    const bytes = Deno.readFileSync(new URL(item.file, root));
    const part = type ? receiptFilePart(type, encodeBase64(bytes)) : null;
    if (!part) throw new Error(`${item.id} unsupported file`);
    const copied = readModelText(await post(key, {
      model: TRANSCRIBE_MODEL,
      max_output_tokens: 4000,
      input: [{ role: "user", content: [{ type: "input_text", text: COPY_PROMPT }, part] }],
      providerOptions: {
        gateway: gatewayProviderOptions({ source: "eval" }),
        anthropic: { thinking: { type: "disabled" } },
      },
    }));
    const read = readModelText(await post(key, {
      ...splitRequestBody(copied, item.today, {}, "eval"),
      model: SPLIT_MODEL,
    }));
    const fields = scoreSplitFields(copied, read, item.today, item.expected);
    const actual = readSplitResponse(copied, read, item.today);
    const kindOk = item.kind === "statement"
      ? actual.route === "list"
      : actual.route === "several"
        && actual.items.length === (item.kind === "receipt" ? 1 : item.expected.items.length);
    sentences.push({ id: item.id, kindOk, fields, raw: fields.parsed ? null : copied });
  } catch (error) {
    failed += 1;
    sentences.push({
      id: item.id,
      kindOk: false,
      fields: scoreSplitFields("", "", item.today, item.expected),
      raw: error instanceof Error ? error.message : "failed",
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
  sentences,
};

console.log(JSON.stringify({ ...summary, sentences: sentences.length }, null, 2));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
