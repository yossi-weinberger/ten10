import {
  decodeReceiptBase64,
  readModelText,
  readReceiptDraft,
  readReceiptKind,
  readReceiptArtifactId,
  readStoredReceiptPath,
  receiptFilePart,
  receiptMagicMatches,
  receiptSha256,
  receiptStoragePath,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_MAX_BYTES,
} from "./receipt-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("receipt draft keeps a total and rejects a missing one", () => {
  const draft = readReceiptDraft({
    description: "שופרסל",
    date: "2026-10-18",
    amount: 247.8,
    currency: "ils",
  });
  assert(draft?.description === "שופרסל", "merchant");
  assert(draft?.amount === 247.8, "amount");
  assert(draft?.currency === "ILS", "currency");
  assert(draft?.kind === "receipt", "missing kind");
  assert(readReceiptDraft({
    kind: "invoice",
    description: "שופרסל",
    date: "2026-10-18",
    amount: 10,
    currency: "ILS",
  })?.kind === "receipt", "unknown kind");
  assert(readReceiptDraft({ kind: "several_receipts" }) === null, "several is not one draft");
  assert(readReceiptDraft({ kind: "statement", description: "bank", date: "2026-10-18", amount: 10, currency: "ILS" }) === null, "statement is not one draft");
  assert(readReceiptKind({ kind: "several_receipts" }) === "several_receipts", "several");
  assert(readReceiptKind({ kind: "statement" }) === "statement", "statement");
  assert(readReceiptKind({ kind: "invoice" }) === "receipt", "unknown stays one receipt");
  assert(readReceiptDraft('{"description":null}') === null, "unreadable");
  assert(readReceiptDraft({ description: "x", date: "2026-02-31", amount: 10, currency: "ILS" }) === null, "bad date");
});

Deno.test("the client byte ceiling fits in the server base64 ceiling", () => {
  const encoded = Math.ceil(RECEIPT_MAX_BYTES / 3) * 4;
  assert(encoded <= RECEIPT_MAX_BASE64_CHARS, "base64 of the max file fits");
  assert(Math.ceil((RECEIPT_MAX_BYTES + 1) / 3) * 4 > RECEIPT_MAX_BASE64_CHARS, "one more byte does not");
});

Deno.test("a pdf is sent as a file and a photo as an image", () => {
  const pdf = receiptFilePart("application/pdf", "QQ==");
  const photo = receiptFilePart("image/jpeg", "QQ==");
  assert(pdf?.type === "input_file" && pdf.file_data.startsWith("data:application/pdf;base64,"), "pdf");
  assert(photo?.type === "input_image" && photo.image_url.startsWith("data:image/jpeg;base64,"), "photo");
  assert(receiptFilePart("text/plain", "QQ==") === null, "other files");
});

Deno.test("a receipt is stored only when the header matches the declared type", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  assert(receiptMagicMatches("image/jpeg", jpeg), "jpeg");
  assert(!receiptMagicMatches("image/jpeg", png), "png is not jpeg");
  assert(receiptMagicMatches("image/png", png), "png");
  assert(receiptMagicMatches("image/webp", webp), "webp");
  assert(receiptMagicMatches("application/pdf", pdf), "pdf");
  assert(!receiptMagicMatches("text/plain", pdf), "other type");
  assert(decodeReceiptBase64("QQ==")?.length === 1, "decoded byte");
  assert(decodeReceiptBase64("!!!!") === null, "bad base64");
});

Deno.test("the storage path stays under the user and has no filename", () => {
  const path = receiptStoragePath(
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    new Date("2026-10-21T22:30:00Z"),
  );
  assert(path === "11111111-1111-4111-8111-111111111111/2026/10/22222222-2222-4222-8222-222222222222", "path");
  assert(receiptStoragePath("not-a-user", "22222222-2222-4222-8222-222222222222", new Date()) === null, "user");
  const recorded = readStoredReceiptPath({
    storage_path: path,
    already_stored: true,
    artifact_id: "22222222-2222-4222-8222-222222222222",
  });
  assert(recorded?.alreadyStored === true && recorded.storagePath === path, "recorded");
  assert(recorded?.artifactId === "22222222-2222-4222-8222-222222222222", "artifact");
  assert(readStoredReceiptPath({}) === null, "missing path");
  assert(readReceiptArtifactId("not-an-id") === null, "bad artifact");
});

Deno.test("the receipt hash is 64 hex characters", async () => {
  const hash = await receiptSha256(new Uint8Array([1, 2, 3]));
  assert(/^[0-9a-f]{64}$/.test(hash), "hex");
});

Deno.test("model text is read from the responses payload", () => {
  const text = readModelText({
    output: [{ content: [{ type: "output_text", text: "{\"amount\":10}" }] }],
  });
  assert(text === "{\"amount\":10}", "joined text");
});
