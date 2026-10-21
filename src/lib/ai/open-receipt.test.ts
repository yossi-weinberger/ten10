import { describe, expect, it } from "vitest";
import { isReceiptUrl } from "./receipt-url";

const project = "https://bbcllewcotypedqsnwmi.supabase.co";

describe("receipt preview url", () => {
  it("accepts a signed url on this project and rejects anything else", () => {
    expect(isReceiptUrl(
      `${project}/storage/v1/object/sign/intake-artifacts/user/2026/10/file?token=abc`,
      project,
    )).toBe(true);
    expect(isReceiptUrl("https://example.com/storage/v1/object/sign/intake-artifacts/x", project)).toBe(false);
    expect(isReceiptUrl(`${project}/storage/v1/object/public/intake-artifacts/x`, project)).toBe(false);
  });
});
