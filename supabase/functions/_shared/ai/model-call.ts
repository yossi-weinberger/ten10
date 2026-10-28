import type { GatewayFeature } from "./gateway-tags.ts";
import { logger } from "../logger.ts";

/** One provider call from Edge, for `ai.model_calls`. No message text, image, amount, or path. */

export type ModelErrorCode = "timeout" | "network" | "http_4xx" | "http_5xx" | "unreadable";

export interface ModelUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  generationId: string | null;
}

export interface ModelCallRow extends ModelUsage {
  userId: string;
  operation: GatewayFeature;
  model: string;
  ok: boolean;
  httpStatus: number | null;
  errorCode: ModelErrorCode | null;
  latencyMs: number;
}

export type ModelCallResult =
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number | null; errorCode: ModelErrorCode };

export interface ModelCallInput {
  userId: string;
  operation: GatewayFeature;
  model: string;
  url: string;
  init: Omit<RequestInit, "signal">;
  timeoutMs: number;
  record: (row: ModelCallRow) => Promise<void>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const NO_USAGE: ModelUsage = { inputTokens: null, outputTokens: null, costUsd: null, generationId: null };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function dollars(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Jev and Responses put tokens in `usage` and cost in `provider_metadata.gateway`.
 * Transcription has no tokens and uses `providerMetadata`.
 * `gatewayCost` is what the gateway bills, including the per-request tag surcharge.
 */
export function readModelUsage(payload: unknown): ModelUsage {
  const body = record(payload);
  if (!body) return NO_USAGE;
  const usage = record(body.usage);
  const metadata = record(body.provider_metadata) ?? record(body.providerMetadata);
  const gateway = record(metadata?.gateway);
  const generationId = typeof gateway?.generationId === "string" ? gateway.generationId : null;
  return {
    inputTokens: count(usage?.input_tokens),
    outputTokens: count(usage?.output_tokens),
    costUsd: dollars(gateway?.gatewayCost),
    generationId,
  };
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

function keepRecording(pending: Promise<void>): Promise<void> {
  const recording = pending.catch(() => logger.error("model call was not recorded"));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } })
    .EdgeRuntime;
  // waitUntil keeps the write alive after the response is sent, without delaying it.
  if (runtime) {
    runtime.waitUntil(recording);
    return Promise.resolve();
  }
  return recording;
}

/** Calls the provider and records one row, also on failure. A failed write never fails the call. */
export async function callModel(input: ModelCallInput): Promise<ModelCallResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? (() => performance.now());
  const started = now();
  let result: ModelCallResult;
  let usage = NO_USAGE;
  try {
    const response = await fetchImpl(input.url, {
      ...input.init,
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    if (!response.ok) {
      await response.body?.cancel();
      result = {
        ok: false,
        status: response.status,
        errorCode: response.status >= 500 ? "http_5xx" : "http_4xx",
      };
    } else {
      try {
        const payload = await response.json();
        usage = readModelUsage(payload);
        result = { ok: true, status: response.status, payload };
      } catch (error) {
        result = {
          ok: false,
          status: response.status,
          errorCode: isTimeout(error) ? "timeout" : "unreadable",
        };
      }
    }
  } catch (error) {
    result = { ok: false, status: null, errorCode: isTimeout(error) ? "timeout" : "network" };
  }

  await keepRecording(input.record({
    userId: input.userId,
    operation: input.operation,
    model: input.model,
    ok: result.ok,
    httpStatus: result.status,
    errorCode: result.ok ? null : result.errorCode,
    latencyMs: Math.max(0, Math.round(now() - started)),
    ...usage,
  }));
  return result;
}
