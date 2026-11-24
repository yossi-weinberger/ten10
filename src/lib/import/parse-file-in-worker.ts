import type { parseFile } from "./parsers";
import type {
  ParseFileWorkerRequest,
  ParseFileWorkerResponse,
} from "./parse-file.worker";

type ParseFileResult = Awaited<ReturnType<typeof parseFile>>;

let nextRequestId = 1;

/**
 * Runs `parseFile` in a dedicated worker so a hard timeout can terminate
 * synchronous parser work (e.g. pathological HTML-as-.xls) without freezing the UI.
 */
export function parseFileInWorker(
  file: File,
  sheetName: string | undefined,
  timeoutMs: number
): Promise<ParseFileResult> {
  return new Promise<ParseFileResult>((resolve, reject) => {
    const worker = new Worker(
      new URL("./parse-file.worker.ts", import.meta.url),
      { type: "module" }
    );
    const id = nextRequestId++;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timer);
      worker.terminate();
      fn();
    };

    const timer = globalThis.setTimeout(() => {
      finish(() => reject(new Error("file_parse_timeout")));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<ParseFileWorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;
      if (data.ok) {
        finish(() => resolve(data.result));
        return;
      }
      finish(() => reject(new Error(data.errorMessage)));
    };

    worker.onerror = (event) => {
      finish(() => reject(event.error instanceof Error ? event.error : new Error("parse_worker_error")));
    };

    const request: ParseFileWorkerRequest = { id, file, sheetName };
    worker.postMessage(request);
  });
}
