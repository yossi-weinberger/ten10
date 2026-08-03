import { describe, it, expect, vi } from "vitest";
import type { FileRejection } from "react-dropzone";
import {
  getDropzoneRejectionMessage,
  getPrimaryDropzoneRejectionCode,
} from "./dropzone-rejection";

function rejection(code: string, message = "x"): FileRejection[] {
  return [
    {
      file: new File([""], "f.bin"),
      errors: [{ code, message }],
    },
  ];
}

const keys = {
  tooLarge: "errors.tooLarge",
  tooManyFiles: "errors.tooManyFiles",
  unsupportedFormat: "errors.unsupportedFormat",
};

describe("getPrimaryDropzoneRejectionCode", () => {
  it("maps known dropzone codes", () => {
    expect(getPrimaryDropzoneRejectionCode(rejection("file-too-large"))).toBe(
      "file-too-large"
    );
    expect(getPrimaryDropzoneRejectionCode(rejection("too-many-files"))).toBe(
      "too-many-files"
    );
    expect(
      getPrimaryDropzoneRejectionCode(rejection("file-invalid-type"))
    ).toBe("file-invalid-type");
  });

  it("falls back to unknown for empty or unfamiliar codes", () => {
    expect(getPrimaryDropzoneRejectionCode([])).toBe("unknown");
    expect(getPrimaryDropzoneRejectionCode(rejection("custom-code"))).toBe(
      "unknown"
    );
  });
});

describe("getDropzoneRejectionMessage", () => {
  it("interpolates size for file-too-large", () => {
    const t = vi.fn((key: string, opts?: Record<string, string | number>) =>
      key === keys.tooLarge ? `too-large:${opts?.size}` : key
    );
    expect(
      getDropzoneRejectionMessage(rejection("file-too-large"), t, keys, {
        maxSizeBytes: 5 * 1024 * 1024,
      })
    ).toBe("too-large:5");
  });

  it("passes maxFiles for too-many-files", () => {
    const t = vi.fn((key: string, opts?: Record<string, string | number>) =>
      key === keys.tooManyFiles ? `too-many:${opts?.maxFiles}` : key
    );
    expect(
      getDropzoneRejectionMessage(rejection("too-many-files"), t, keys, {
        maxSizeBytes: 1024,
        maxFiles: 3,
      })
    ).toBe("too-many:3");
  });

  it("uses unsupportedFormat for invalid type and unknown codes", () => {
    const t = vi.fn((key: string) => key);
    expect(
      getDropzoneRejectionMessage(rejection("file-invalid-type"), t, keys, {
        maxSizeBytes: 1024,
      })
    ).toBe(keys.unsupportedFormat);
    expect(
      getDropzoneRejectionMessage([], t, keys, { maxSizeBytes: 1024 })
    ).toBe(keys.unsupportedFormat);
  });
});
