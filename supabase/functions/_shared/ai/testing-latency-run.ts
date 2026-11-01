/**
 * Client-side latency of the testing edge functions.
 * Args: path to a local env file that is not committed.
 * That file must set TEST_USER_EMAIL, TEST_USER_PASSWORD,
 * VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY for the testing project.
 * Run only after list_ai_reader_rules exists on testing.
 */

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const ENV_PATH = Deno.args[0] ?? "";
const TESTING_REF = "bbcllewcotypedqsnwmi";
const PRODUCTION_REF = "flpzqbvbymoluoeeeofg";

function readEnv(path: string): Map<string, string> {
  const values = new Map<string, string>();
  const file = Deno.readTextFileSync(path);
  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const split = trimmed.indexOf("=");
    if (split < 1) continue;
    values.set(trimmed.slice(0, split), trimmed.slice(split + 1).trim());
  }
  return values;
}

function required(env: Map<string, string>, name: string): string {
  const value = env.get(name)?.trim() ?? "";
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

function textsFrom(path: string | URL, count: number): { id: string; text: string; today: string }[] {
  const rows = JSON.parse(Deno.readTextFileSync(path)) as { id?: unknown; text?: unknown; today?: unknown }[];
  return rows.flatMap((row) => {
    if (typeof row.id !== "string" || typeof row.text !== "string") return [];
    return [{ id: row.id, text: row.text, today: typeof row.today === "string" ? row.today : "2026-11-01" }];
  }).slice(0, count);
}

function mediaType(file: string): string | null {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".pdf")) return "application/pdf";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

interface Timed {
  id: string;
  ms: number;
  ok: boolean;
}

const env = readEnv(ENV_PATH);
const url = required(env, "VITE_SUPABASE_URL");
if (url.includes(PRODUCTION_REF) || !url.includes(TESTING_REF)) {
  throw new Error("refusing a project that is not the testing project");
}
const supabase = createClient(url, required(env, "VITE_SUPABASE_ANON_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await supabase.auth.signInWithPassword({
  email: required(env, "TEST_USER_EMAIL"),
  password: required(env, "TEST_USER_PASSWORD"),
});
if (signed.error) throw new Error("sign-in failed");

async function invokeTimed(name: string, id: string, body: unknown): Promise<Timed> {
  const started = performance.now();
  const result = await supabase.functions.invoke(name, { body });
  const ms = Math.round(performance.now() - started);
  const usage = result.data && typeof result.data === "object"
    ? (result.data as { usage_id?: unknown }).usage_id
    : null;
  if (name === "ai-split-items" && typeof usage === "string") {
    await supabase.functions.invoke("ai-split-items", { body: { release: usage } });
  }
  return { id, ms, ok: !result.error && result.data !== null };
}

const root = new URL("./fixtures/", import.meta.url);
const splits = textsFrom(new URL("split-eval-cases.json", root), 60);
const questions = textsFrom(new URL("question-slot-eval-cases.json", root), 30);
const receiptRoot = new URL("./fixtures/receipts/", import.meta.url);
const receiptLines = Deno.readTextFileSync(new URL("answers.jsonl", receiptRoot)).split(/\r?\n/).filter((line) => line.length > 0);
const receipts = receiptLines.flatMap((line) => {
  const row = JSON.parse(line) as { id?: unknown; file?: unknown; kind?: unknown };
  if (row.kind !== "receipt" || typeof row.id !== "string" || typeof row.file !== "string") return [];
  return [{ id: row.id, file: row.file }];
}).slice(0, 10);

const splitMeasured: Timed[] = [];
for (const item of splits) {
  const timed = await invokeTimed("ai-split-items", item.id, {
    text: item.text,
    today: item.today,
    timeZone: "Asia/Jerusalem",
    calendar: "gregorian",
  });
  splitMeasured.push(timed);
}

const questionMeasured: Timed[] = [];
for (const item of questions) {
  questionMeasured.push(await invokeTimed("ai-read-question", item.id, {
    text: item.text,
    today: item.today,
    calendar: "gregorian",
  }));
}

const receiptMeasured: Timed[] = [];
for (const item of receipts) {
  const type = mediaType(item.file);
  if (!type) {
    receiptMeasured.push({ id: item.id, ms: 0, ok: false });
    continue;
  }
  const bytes = Deno.readFileSync(new URL(item.file, receiptRoot));
  receiptMeasured.push(await invokeTimed("ai-read-receipt", item.id, {
    media_type: type,
    data: encodeBase64(bytes),
    time_zone: "Asia/Jerusalem",
  }));
}

function report(name: string, rows: Timed[]) {
  const ok = rows.filter((row) => row.ok);
  return {
    name,
    calls: rows.length,
    ok: ok.length,
    failed: rows.filter((row) => !row.ok).map((row) => row.id),
    p50: percentile(ok.map((row) => row.ms), 0.5),
    p95: percentile(ok.map((row) => row.ms), 0.95),
  };
}

console.log(JSON.stringify({
  split: report("ai-split-items", splitMeasured),
  question: report("ai-read-question", questionMeasured),
  receipt: report("ai-read-receipt", receiptMeasured),
}, null, 2));
