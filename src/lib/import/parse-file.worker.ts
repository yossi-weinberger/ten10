import { parseFile } from "./parsers";

export type ParseFileWorkerRequest = {
  id: number;
  file: File;
  sheetName?: string;
};

export type ParseFileWorkerResponse =
  | { id: number; ok: true; result: Awaited<ReturnType<typeof parseFile>> }
  | { id: number; ok: false; errorMessage: string };

/**
 * Worker entry typed against a narrow scope instead of `lib: webworker`,
 * which clashes with the app's DOM lib when both are active.
 */
type ParseWorkerScope = {
  onmessage: ((event: MessageEvent<ParseFileWorkerRequest>) => void | Promise<void>) | null;
  postMessage: (message: ParseFileWorkerResponse) => void;
};

const workerScope = globalThis as unknown as ParseWorkerScope;

workerScope.onmessage = async (event: MessageEvent<ParseFileWorkerRequest>) => {
  const { id, file, sheetName } = event.data;
  try {
    const result = await parseFile(file, sheetName);
    workerScope.postMessage({ id, ok: true, result });
  } catch (err) {
    workerScope.postMessage({
      id,
      ok: false,
      errorMessage: err instanceof Error ? err.message : "parse_worker_error",
    });
  }
};
