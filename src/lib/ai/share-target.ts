export const SHARE_DB = "ten10-share-target";
export const SHARE_STORE = "files";
export const SHARE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SharedReceiptRecord {
  id: string;
  name: string;
  type: string;
  buffer: ArrayBuffer;
  savedAt: number;
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

/** Takes the newest shared file and drops anything older than 24 hours. */
export async function takeSharedReceipt(now = Date.now()): Promise<File | null> {
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
    return new File([record.buffer], record.name, { type: record.type });
  } finally {
    db.close();
  }
}
