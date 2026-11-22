/// <reference lib="webworker" />
import { parseFile } from "./parsers";

export type ParseFileWorkerRequest = {
  id: number;
  file: File;
  sheetName?: string;
};

export type ParseFileWorkerResponse =
  | { id: number; ok: true; result: Awaited<ReturnType<typeof parseFile>> }
  | { id: number; ok: false; errorMessage: string };

self.onmessage = async (event: MessageEvent<ParseFileWorkerRequest>) => {
  const { id, file, sheetName } = event.data;
  try {
    const result = await parseFile(file, sheetName);
    const response: ParseFileWorkerResponse = { id, ok: true, result };
    self.postMessage(response);
  } catch (err) {
    const response: ParseFileWorkerResponse = {
      id,
      ok: false,
      errorMessage: err instanceof Error ? err.message : "parse_worker_error",
    };
    self.postMessage(response);
  }
};
