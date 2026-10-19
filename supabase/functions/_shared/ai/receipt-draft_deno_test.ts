import { readModelText, readReceiptDraft, receiptFilePart } from "./receipt-draft.ts";

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
  assert(readReceiptDraft('{"description":null}') === null, "unreadable");
  assert(readReceiptDraft({ description: "x", date: "2026-02-31", amount: 10, currency: "ILS" }) === null, "bad date");
});

Deno.test("a pdf is sent as a file and a photo as an image", () => {
  const pdf = receiptFilePart("application/pdf", "QQ==");
  const photo = receiptFilePart("image/jpeg", "QQ==");
  assert(pdf?.type === "input_file" && pdf.file_data.startsWith("data:application/pdf;base64,"), "pdf");
  assert(photo?.type === "input_image" && photo.image_url.startsWith("data:image/jpeg;base64,"), "photo");
  assert(receiptFilePart("text/plain", "QQ==") === null, "other files");
});

Deno.test("model text is read from the responses payload", () => {
  const text = readModelText({
    output: [{ content: [{ type: "output_text", text: "{\"amount\":10}" }] }],
  });
  assert(text === "{\"amount\":10}", "joined text");
});
