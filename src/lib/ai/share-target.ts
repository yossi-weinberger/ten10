export const SHARE_DB = "ten10-share-target";
export const SHARE_STORE = "files";
export const SHARE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SharedReceiptRecord {
  id: string;
  name: string;
  type: string;
  buffer?: ArrayBuffer;
  title?: string;
  text?: string;
  url?: string;
  savedAt: number;
}

export type SharedIntake =
  | { kind: "file"; file: File }
  | { kind: "text"; text: string };

/** Joins the text fields of one share. A later field already inside an earlier one is dropped. */
export function sharedTextMessage(parts: Array<string | null | undefined>): string {
  const kept: string[] = [];
  for (const part of parts) {
    const value = typeof part === "string" ? part.trim() : "";
    if (!value) continue;
    if (kept.some((previous) => previous.includes(value))) continue;
    kept.push(value);
  }
  return kept.join("\n").slice(0, 2000);
}

export function isExpiredShare(savedAt: number, now: number): boolean {
  return now - savedAt > SHARE_MAX_AGE_MS;
}

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Takes the newest share and drops anything older than 24 hours. */
export async function takeSharedIntake(now = Date.now()): Promise<SharedIntake | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openShareDb();
  try {
    const records = await new Promise<SharedReceiptRecord[]>((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE, "readwrite");
      const store = tx.objectStore(SHARE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = Array.isArray(request.result) ? request.result as SharedReceiptRecord[] : [];
        const fresh = rows.filter((row) => row && !isExpiredShare(row.savedAt, now));
        for (const row of rows) {
          if (!fresh.includes(row)) store.delete(row.id);
        }
        const newest = fresh.sort((a, b) => b.savedAt - a.savedAt)[0];
        if (newest) store.delete(newest.id);
        resolve(newest ? [newest] : []);
      };
      request.onerror = () => reject(request.error);
    });
    const record = records[0];
    if (!record) return null;
    if (record.buffer && record.buffer.byteLength > 0) {
      return { kind: "file", file: new File([record.buffer], record.name, { type: record.type }) };
    }
    const text = sharedTextMessage([record.title, record.text, record.url]);
    return text ? { kind: "text", text } : null;
  } finally {
    db.close();
  }
}
