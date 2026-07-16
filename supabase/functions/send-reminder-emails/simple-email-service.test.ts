import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimpleEmailService } from "./simple-email-service.ts";

const reminderUrl =
  "https://ten10-app.com/unsubscribe?token=reminder-token&type=reminder";
const allUrl =
  "https://ten10-app.com/unsubscribe?token=all-token&type=all";

vi.mock("./jwt-utils.ts", () => ({
  generateUnsubscribeUrls: vi.fn().mockResolvedValue({
    reminderUrl:
      "https://ten10-app.com/unsubscribe?token=reminder-token&type=reminder",
    allUrl: "https://ten10-app.com/unsubscribe?token=all-token&type=all",
  }),
}));

interface SesPayload {
  Destination: {
    ToAddresses: string[];
  };
  Content: {
    Raw: {
      Data: string;
    };
  };
}

function decodeBase64(value: string): string {
  return Buffer.from(value, "base64").toString("utf8");
}

function decodeMimePart(rawMime: string, contentType: string): string {
  const match = rawMime.match(
    new RegExp(
      `Content-Type: ${contentType}; charset="UTF-8"\\r\\n` +
        "Content-Transfer-Encoding: base64\\r\\n\\r\\n" +
        "([A-Za-z0-9+/=\\r\\n]+?)\\r\\n--",
    ),
  );

  expect(match).not.toBeNull();
  return decodeBase64(match![1].replaceAll("\r\n", ""));
}

describe("SimpleEmailService", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const environment: Record<string, string> = {
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      AWS_REGION: "eu-central-1",
      SES_FROM: "reminder-noreply@ten10-app.com",
    };

    vi.stubGlobal("Deno", {
      env: {
        get: (key: string) => environment[key],
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends localized subject, HTML, and plain text through Raw MIME", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ MessageId: "message-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new SimpleEmailService();
    const result = await service.sendReminderEmail(
      "recipient@example.com",
      "user-123",
      384.7,
      384.7,
      0,
      "he",
      "יוסי ויינברגר",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(request.body as string) as SesPayload;
    const rawMime = decodeBase64(payload.Content.Raw.Data);
    const encodedSubject = rawMime.match(
      /Subject: =\?utf-8\?B\?([^?]+)\?=/,
    );
    const textBody = decodeMimePart(rawMime, "text/plain");
    const htmlBody = decodeMimePart(rawMime, "text/html");

    expect(payload.Destination.ToAddresses).toEqual(["recipient@example.com"]);
    expect(encodedSubject).not.toBeNull();
    expect(decodeBase64(encodedSubject![1])).toContain("תזכורת מעשר");
    expect(rawMime).toContain(`List-Unsubscribe: <${allUrl}>`);
    expect(rawMime).toContain(
      "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    );
    expect(textBody).toContain("ערב טוב, יוסי");
    expect(textBody).toContain("יתרת המעשר שלך לתרומה היא");
    expect(textBody).toContain("הפסקת תזכורות חודשיות");
    expect(textBody).toContain(reminderUrl);
    expect(textBody).toContain(allUrl);
    expect(htmlBody).toContain('lang="he"');
    expect(htmlBody).toContain('dir="rtl"');
    expect(htmlBody).toContain("ערב טוב, יוסי");
    expect(htmlBody).toContain("יתרת המעשר שלך לתרומה היא");
    expect(htmlBody).toContain(reminderUrl.replaceAll("&", "&amp;"));
    expect(htmlBody).toContain(allUrl.replaceAll("&", "&amp;"));
    expect(
      rawMime
        .split("\r\n")
        .filter((line) => /^[A-Za-z0-9+/=]+$/.test(line))
        .every((line) => line.length <= 76),
    ).toBe(true);
    expect(rawMime.split("\r\n").every((line) => line.length <= 998)).toBe(
      true,
    );
    expect(result).toEqual({
      userId: "user-123",
      email: "recipient@example.com",
      titheBalance: 384.7,
      messageId: "message-123",
      status: "sent",
    });
  });
});
