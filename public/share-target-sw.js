/* Share Target only. Every other request falls through to the NetworkOnly worker. */
const SHARE_DB = "ten10-share-target";
const SHARE_STORE = "files";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  event.respondWith(storeSharedFile(event.request));
});

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) db.createObjectStore(SHARE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeSharedFile(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const record = {
        id: crypto.randomUUID(),
        name: typeof file.name === "string" && file.name ? file.name : "receipt",
        type: typeof file.type === "string" && file.type ? file.type : "application/octet-stream",
        buffer: await file.arrayBuffer(),
        savedAt: Date.now(),
      };
      const db = await openShareDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(SHARE_STORE, "readwrite");
        tx.objectStore(SHARE_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
  } catch {
    // Still open the app. A failed store must not leave the share sheet hanging.
  }
  return Response.redirect(`${self.location.origin}/?ai-share=1`, 303);
}
