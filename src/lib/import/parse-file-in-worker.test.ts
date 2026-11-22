import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParseFileWorkerRequest, ParseFileWorkerResponse } from "./parse-file.worker";

type FakeWorkerHandler = (event: MessageEvent) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: FakeWorkerHandler | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly posted: ParseFileWorkerRequest[] = [];

  constructor(
    public readonly url: URL | string,
    public readonly options?: WorkerOptions
  ) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: ParseFileWorkerRequest) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(response: ParseFileWorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent);
  }
}

const { parseFileInWorker } = await import("./parse-file-in-worker");

describe("parseFileInWorker", () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWorker) {
      globalThis.Worker = originalWorker;
    }
  });

  it("resolves with the worker parse result and terminates", async () => {
    const file = new File(["date,amount\n2026-01-01,1"], "ok.csv", { type: "text/csv" });
    const pending = parseFileInWorker(file, undefined, 5000);

    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0]!;
    expect(worker.options).toEqual({ type: "module" });
    expect(worker.posted[0]?.file).toBe(file);

    worker.emit({
      id: worker.posted[0]!.id,
      ok: true,
      result: {
        ok: true,
        file: {
          headers: ["date", "amount"],
          rows: [{ date: "2026-01-01", amount: "1" }],
          sampleRows: [{ date: "2026-01-01", amount: "1" }],
          rowCount: 1,
        },
      },
    });

    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(worker.terminated).toBe(true);
  });

  it("terminates the worker when the timeout fires", async () => {
    vi.useFakeTimers();
    const file = new File(["x"], "slow.xls", { type: "application/vnd.ms-excel" });
    const pending = parseFileInWorker(file, undefined, 25);

    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0]!;

    const expectation = expect(pending).rejects.toThrow("file_parse_timeout");
    await vi.advanceTimersByTimeAsync(25);
    await expectation;
    expect(worker.terminated).toBe(true);
    vi.useRealTimers();
  });
});
