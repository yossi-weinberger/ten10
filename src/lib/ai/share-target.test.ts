import { afterEach, describe, expect, it } from "vitest";
import { clearSharedIntake, isExpiredShare, SHARE_DB, SHARE_MAX_AGE_MS, SHARE_STORE, sharedTextMessage } from "./share-target";

type Row = { id: string };

function installMemoryDb(rows: Map<string, Row>): void {
  const store = {
    clear() {
      rows.clear();
      return { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
    },
  };
  const request = {
    result: {
      objectStoreNames: { contains: () => true },
      transaction: () => ({ objectStore: () => store }),
      close: () => undefined,
    },
    onupgradeneeded: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  const originalClear = store.clear.bind(store);
  store.clear = () => {
    const result = originalClear();
    queueMicrotask(() => result.onsuccess?.());
    return result;
  };
  (globalThis as { indexedDB?: { open: () => typeof request } }).indexedDB = {
    open: () => {
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
}

describe("shared receipt age", () => {
  afterEach(() => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
  });

  it("keeps a file inside 24 hours and drops an older one", () => {
    const now = 1_000_000_000;
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS, now)).toBe(false);
    expect(isExpiredShare(now - SHARE_MAX_AGE_MS - 1, now)).toBe(true);
  });

  it("joins shared text and drops empty parts", () => {
    expect(sharedTextMessage(["  Title ", "", "https://example.com"])).toBe("Title\nhttps://example.com");
    expect(sharedTextMessage(["", "  "])).toBe("");
  });

  it("clears stored shares when intake is off", async () => {
    const rows = new Map<string, Row>([["1", { id: "1" }]]);
    installMemoryDb(rows);
    await clearSharedIntake();
    expect(rows.size).toBe(0);
    expect(SHARE_DB).toBe("ten10-share-target");
    expect(SHARE_STORE).toBe("files");
  });

  it("does not repeat a url that is already in the shared text", () => {
    const sentence = "קניה על פיצה https://example.com/r/1";
    expect(sharedTextMessage([sentence, sentence, "https://example.com/r/1"])).toBe(sentence);
  });
});
