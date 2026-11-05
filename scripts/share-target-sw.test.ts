import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(resolve(process.cwd(), "public/share-target-sw.js"), "utf8");
const ORIGIN = "https://app.ten10.test";

type FetchListener = (event: { request: Request; respondWith: (response: Promise<Response> | Response) => void }) => void;

/** Runs the worker script against a fake `self` and an IndexedDB that only records puts. */
function loadWorker() {
  let listener: FetchListener | null = null;
  const stored: unknown[] = [];
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (_type: string, fn: FetchListener) => {
      listener = fn;
    },
  };
  const indexedDB = {
    open: () => {
      const request: Record<string, unknown> = {};
      const db = {
        objectStoreNames: { contains: () => true },
        close: () => undefined,
        transaction: () => {
          const tx: Record<string, unknown> = {
            objectStore: () => ({
              put: (record: unknown) => {
                stored.push(record);
                setTimeout(() => (tx.oncomplete as () => void)?.(), 0);
              },
            }),
          };
          return tx;
        },
      };
      request.result = db;
      setTimeout(() => (request.onsuccess as () => void)?.(), 0);
      return request;
    },
  };
  new Function("self", "indexedDB", SOURCE)(self, indexedDB);
  return {
    stored,
    async post(headers: Record<string, string>): Promise<Response> {
      const body = new FormData();
      body.set("text", "קניתי מאפים ב-15");
      let response: Promise<Response> | Response | null = null;
      listener!({
        request: new Request(`${ORIGIN}/share-target`, { method: "POST", headers, body }),
        respondWith: (value) => {
          response = value;
        },
      });
      return await response!;
    },
  };
}

describe("share target worker", () => {
  it("stores an OS share and opens the assistant", async () => {
    const worker = loadWorker();
    const response = await worker.post({});
    expect(worker.stored).toHaveLength(1);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/?ai-share=1`);
  });

  it("drops a form posted from another site", async () => {
    const forged: Record<string, string>[] = [{ "Sec-Fetch-Site": "cross-site" }, { "Sec-Fetch-Site": "same-site" }, { Origin: "https://evil.example" }];
    for (const headers of forged) {
      const worker = loadWorker();
      const response = await worker.post(headers);
      expect(worker.stored).toHaveLength(0);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    }
  });
});
