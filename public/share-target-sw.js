/* Share Target only. Every other request falls through to the NetworkOnly worker. */
const SHARE_DB = "ten10-share-target";
const SHARE_STORE = "files";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  // Any site can post a form here. Drop what the request says came from another site; keep the OS share.
  if (fromAnotherSite(event.request)) {
    event.respondWith(Response.redirect(`${self.location.origin}/`, 303));
    return;
  }
  event.respondWith(storeSharedFile(event.request));
});

/**
 * An OS share has no initiator. A form on another site says so in Fetch Metadata or Origin, where the
 * worker can see them. Browsers that hide them, and an opaque "null" origin, still pass: the app sends
 * nothing to the AI until the user confirms the share, so a forged one costs nothing.
 */
function fromAnotherSite(request) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site === "cross-site" || site === "same-site") return true;
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin !== "null" && origin !== self.location.origin;
}

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
    const title = form.get("title");
    const text = form.get("text");
    const sharedUrl = form.get("url");
    const hasFile = file && typeof file.arrayBuffer === "function" && file.size > 0;
    const hasText = [title, text, sharedUrl].some((part) => typeof part === "string" && part.trim());
    if (hasFile || hasText) {
      const record = {
        id: crypto.randomUUID(),
        name: hasFile && typeof file.name === "string" && file.name ? file.name : "share",
        type: hasFile && typeof file.type === "string" && file.type ? file.type : "text/plain",
        buffer: hasFile ? await file.arrayBuffer() : undefined,
        title: typeof title === "string" ? title : "",
        text: typeof text === "string" ? text : "",
        url: typeof sharedUrl === "string" ? sharedUrl : "",
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
