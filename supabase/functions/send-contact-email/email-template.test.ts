import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import {
  renderContactAttachmentListItem,
  renderContactEmail,
  renderContactEmailSubject,
  type ContactMessageRecord,
} from "./email-template.ts";

interface AttachmentFixture {
  label: string;
  href: string | null;
}

const hebrewSlogan = "CONTACT · HALACHA";
const englishSlogan = "CONTACT · DEV";
const adminFooter = ["Ten10 Operations", "Automated internal email"] as const;
const ticketNumber = "TEN-2026-ABCDE";
const signedUrl =
  "https://example.test/storage/object/sign/contact-attachments/file.pdf?token=signed&download=1";
const defaultAttachment: AttachmentFixture = {
  href: signedUrl,
  label: "receipt.pdf",
};

const baseRecord: ContactMessageRecord = {
  app_version: "0.7.4",
  attachments: [{ name: "receipt.pdf", path: "contact/receipt.pdf" }],
  body: "The complete message body.",
  channel: "dev",
  client_platform: "windows",
  created_at: "2026-07-16T10:00:00.000Z",
  id: "abcde000-0000-0000-0000-000000000000",
  ip: "203.0.113.10",
  locale: "en-US",
  session_id: "session-123",
  severity: "high",
  subject: "A complete subject",
  user_agent: "Ten10 Desktop/0.7.4",
  user_email: "person@example.test",
  user_id: "user-123",
  user_name: "Example Person",
};

function attachmentLinksHtml(
  attachments: AttachmentFixture[] = [defaultAttachment],
): string {
  return `
      <div style="margin-top: 20px; padding: 15px; background-color: #ebf8ff; border: 2px solid #4299e1; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #2c5282;">קבצים מצורפים / Attachments:</h3>
        <ul style="margin-bottom: 0; padding-right: 20px;">
          ${attachments
            .map(({ href, label }) =>
              renderContactAttachmentListItem(label, href),
            )
            .join("")}
        </ul>
      </div>
    `;
}

function expectedHebrewTextBody(
  record: ContactMessageRecord,
  ticket: string,
): string {
  return `פנייה חדשה לרב. כרטיס: ${ticket}. נושא: ${record.subject}. הודעה: ${record.body}`;
}

function expectedEnglishTextBody(
  record: ContactMessageRecord,
  ticket: string,
): string {
  const severityLabels = {
    high: "High",
    low: "Low",
    med: "Medium",
  } as const;

  return `New contact message. Ticket: ${ticket}. Subject: ${record.subject}.${
    record.severity ? ` Severity: ${severityLabels[record.severity]}.` : ""
  } Message: ${record.body}`;
}

function expectedHebrewOrderedText(
  record: ContactMessageRecord,
  ticket: string,
  attachments: AttachmentFixture[],
): string[] {
  const severityLabels = {
    high: "גבוהה",
    low: "נמוכה",
    med: "בינונית",
  } as const;
  const orderedText = [
    hebrewSlogan,
    "פנייה חדשה לרב",
    "מאת:",
    `${record.user_name || "אנונימי"} (${record.user_email || "לא צוין"})`,
    "מספר כרטיס:",
    ticket,
    "נושא:",
    record.subject,
  ];

  if (record.severity) {
    orderedText.push("חומרה:", `חומרה: ${severityLabels[record.severity]}`);
  }

  orderedText.push(record.body);

  if (attachments.length > 0) {
    orderedText.push(
      "קבצים מצורפים:",
      "קבצים מצורפים / Attachments:",
      ...attachments.map(({ href, label }) =>
        href ? label : `${label} (Error generating link)`,
      ),
    );
  }

  orderedText.push(
    "מידע טכני:",
    "פלטפורמה",
    record.client_platform,
    "גרסת אפליקציה",
    record.app_version || "לא זמין",
    "שפה",
    record.locale || "לא זמין",
    "מזהה משתמש",
    record.user_id || "אנונימי",
    "IP",
    record.ip || "לא זמין",
    "User Agent",
    record.user_agent || "לא זמין",
    ...adminFooter,
  );

  return orderedText;
}

function expectedEnglishOrderedText(
  record: ContactMessageRecord,
  ticket: string,
  attachments: AttachmentFixture[],
): string[] {
  const severityLabels = {
    high: "High",
    low: "Low",
    med: "Medium",
  } as const;
  const orderedText = [
    englishSlogan,
    "New Contact Message",
    "From:",
    `${record.user_name || "Anonymous"} (${record.user_email || "No email"})`,
    "Ticket ID:",
    ticket,
    "Subject:",
    record.subject,
  ];

  if (record.severity) {
    orderedText.push("Severity:", severityLabels[record.severity]);
  }

  orderedText.push(record.body);

  if (attachments.length > 0) {
    orderedText.push(
      "Attachments:",
      "קבצים מצורפים / Attachments:",
      ...attachments.map(({ href, label }) =>
        href ? label : `${label} (Error generating link)`,
      ),
    );
  }

  orderedText.push(
    "Technical Metadata:",
    "Platform",
    record.client_platform,
    "App Version",
    record.app_version || "N/A",
    "Locale",
    record.locale || "N/A",
    "User ID",
    record.user_id || "Anonymous",
    "IP",
    record.ip || "N/A",
    "User Agent",
    record.user_agent || "N/A",
    ...adminFooter,
  );

  return orderedText;
}

function expectedLinks(
  attachments: AttachmentFixture[],
): Array<{ href: string; text: string }> {
  return attachments.flatMap(({ href, label }) =>
    href ? [{ href, text: label }] : [],
  );
}

function expectCompleteContract(
  htmlBody: string,
  orderedText: string[],
  links: Array<{ href: string; text: string }>,
): void {
  expect(extractSemanticContract(htmlBody)).toEqual({ links, orderedText });
}

describe("contact email template", () => {
  it("renders the exact production subjects", () => {
    expect(
      renderContactEmailSubject("halacha", ticketNumber, "נושא הלכתי מלא"),
    ).toBe("[TEN10][HALACHA] #TEN-2026-ABCDE - נושא הלכתי מלא");
    expect(
      renderContactEmailSubject("dev", ticketNumber, "A complete subject"),
    ).toBe("[TEN10][DEV] #TEN-2026-ABCDE - A complete subject");
  });

  it("preserves the complete ordered Hebrew content and links", () => {
    const record: ContactMessageRecord = {
      ...baseRecord,
      body: "גוף הפנייה המלא.",
      channel: "halacha",
      locale: "he-IL",
      subject: "נושא הלכתי מלא",
      user_name: "ישראל ישראלי",
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "halacha",
      record,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedHebrewTextBody(record, ticketNumber),
    );
    expect(rendered.htmlBody).toContain('lang="he"');
    expect(rendered.htmlBody).toContain('dir="rtl"');
    expectCompleteContract(
      rendered.htmlBody,
      expectedHebrewOrderedText(record, ticketNumber, [defaultAttachment]),
      expectedLinks([defaultAttachment]),
    );
  });

  it("preserves the complete ordered English content and links", () => {
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "dev",
      record: baseRecord,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(baseRecord, ticketNumber),
    );
    expect(rendered.htmlBody).toContain('lang="en"');
    expect(rendered.htmlBody).toContain('dir="ltr"');
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(baseRecord, ticketNumber, [
        defaultAttachment,
      ]),
      expectedLinks([defaultAttachment]),
    );
  });

  it("preserves the complete no-severity contract", () => {
    const record: ContactMessageRecord = {
      ...baseRecord,
      severity: undefined,
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "dev",
      record,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(record, ticketNumber),
    );
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(record, ticketNumber, [defaultAttachment]),
      expectedLinks([defaultAttachment]),
    );
  });

  it("preserves the complete no-attachments contract", () => {
    const rendered = renderContactEmail({
      attachmentLinksHtml: "",
      channel: "dev",
      record: baseRecord,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(baseRecord, ticketNumber),
    );
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(baseRecord, ticketNumber, []),
      [],
    );
  });

  it("preserves the complete signed-URL failure attachment contract", () => {
    const failedAttachment: AttachmentFixture = {
      href: null,
      label: "receipt.pdf",
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml([failedAttachment]),
      channel: "dev",
      record: baseRecord,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(baseRecord, ticketNumber),
    );
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(baseRecord, ticketNumber, [
        failedAttachment,
      ]),
      [],
    );
  });

  it("preserves the complete missing-metadata fallback contract", () => {
    const record: ContactMessageRecord = {
      ...baseRecord,
      app_version: undefined,
      ip: undefined,
      locale: undefined,
      user_agent: undefined,
      user_email: undefined,
      user_id: undefined,
      user_name: undefined,
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "dev",
      record,
      ticketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(record, ticketNumber),
    );
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(record, ticketNumber, [defaultAttachment]),
      expectedLinks([defaultAttachment]),
    );
  });

  it.each(["low", "med"] as const)(
    "preserves the complete ordered Hebrew %s severity contract",
    (severity) => {
      const record: ContactMessageRecord = {
        ...baseRecord,
        body: "גוף פנייה לבדיקת חומרה.",
        channel: "halacha",
        locale: "he-IL",
        severity,
        subject: "בדיקת חומרה",
        user_name: "ישראל ישראלי",
      };
      const rendered = renderContactEmail({
        attachmentLinksHtml: attachmentLinksHtml(),
        channel: "halacha",
        record,
        ticketNumber,
      });

      expect(rendered.textBody).toBe(
        expectedHebrewTextBody(record, ticketNumber),
      );
      expectCompleteContract(
        rendered.htmlBody,
        expectedHebrewOrderedText(record, ticketNumber, [defaultAttachment]),
        expectedLinks([defaultAttachment]),
      );
    },
  );

  it.each([
    ["low", "#e0eee9", "#11676a"],
    ["med", "#fef3c7", "#92400e"],
    ["high", "#fee2e2", "#991b1b"],
  ] as const)(
    "preserves the complete English %s severity contract and colors",
    (severity, backgroundColor, textColor) => {
      const record: ContactMessageRecord = { ...baseRecord, severity };
      const rendered = renderContactEmail({
        attachmentLinksHtml: "",
        channel: "dev",
        record,
        ticketNumber,
      });

      expect(rendered.textBody).toBe(
        expectedEnglishTextBody(record, ticketNumber),
      );
      expectCompleteContract(
        rendered.htmlBody,
        expectedEnglishOrderedText(record, ticketNumber, []),
        [],
      );
      expect(rendered.htmlBody).toContain(`background-color: ${backgroundColor}`);
      expect(rendered.htmlBody).toContain(`color: ${textColor}`);
    },
  );

  it("escapes every dynamic HTML value including ticket and preserves decoded contracts", () => {
    const unsafe = "<img src=x onerror=alert(1)>";
    const unsafeTicketNumber = `ticket ${unsafe}`;
    const unsafeUrl =
      'https://example.test/file?token=signed&name=<img src=x onerror=alert(1)>"';
    const record: ContactMessageRecord = {
      ...baseRecord,
      app_version: `version ${unsafe}`,
      body: `body ${unsafe}`,
      client_platform: `platform ${unsafe}`,
      ip: `ip ${unsafe}`,
      locale: `locale ${unsafe}`,
      subject: `subject ${unsafe}`,
      user_agent: `agent ${unsafe}`,
      user_email: `email ${unsafe}`,
      user_id: `id ${unsafe}`,
      user_name: `name ${unsafe}`,
    };
    const unsafeAttachment: AttachmentFixture = {
      href: unsafeUrl,
      label: `attachment ${unsafe}`,
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml([unsafeAttachment]),
      channel: "dev",
      record,
      ticketNumber: unsafeTicketNumber,
    });

    expect(rendered.textBody).toBe(
      expectedEnglishTextBody(record, unsafeTicketNumber),
    );
    expectCompleteContract(
      rendered.htmlBody,
      expectedEnglishOrderedText(record, unsafeTicketNumber, [
        unsafeAttachment,
      ]),
      expectedLinks([unsafeAttachment]),
    );
    expect(rendered.htmlBody).not.toContain(unsafe);
    expect(rendered.htmlBody).not.toContain(unsafeTicketNumber);
    expect(rendered.htmlBody).not.toContain(unsafeUrl);
  });

  it("escapes a malicious failed attachment label without creating a link", () => {
    const unsafe = "<img src=x onerror=alert(1)>";
    const label = `failed attachment ${unsafe}`;
    const itemHtml = `<ul>${renderContactAttachmentListItem(label, null)}</ul>`;

    expect(extractSemanticContract(itemHtml)).toEqual({
      links: [],
      orderedText: [`${label} (Error generating link)`],
    });
    expect(itemHtml).not.toContain(unsafe);
  });

  it("rejects added, reordered, and attachment href mutations", () => {
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "dev",
      record: baseRecord,
      ticketNumber,
    });
    const expectedOrderedText = expectedEnglishOrderedText(
      baseRecord,
      ticketNumber,
      [defaultAttachment],
    );
    const expectedAttachmentLinks = expectedLinks([defaultAttachment]);
    const addedContent = rendered.htmlBody.replace(
      "New Contact Message",
      "New Contact Message<p>Unexpected content</p>",
    );
    const reorderedContent = rendered.htmlBody
      .replace("Platform", "__PLATFORM__")
      .replace("App Version", "Platform")
      .replace("__PLATFORM__", "App Version");
    const changedHref = rendered.htmlBody.replace(
      "token=signed&amp;download=1",
      "token=changed&amp;download=1",
    );

    expect(addedContent).not.toBe(rendered.htmlBody);
    expect(reorderedContent).not.toBe(rendered.htmlBody);
    expect(changedHref).not.toBe(rendered.htmlBody);
    for (const mutation of [addedContent, reorderedContent, changedHref]) {
      expect(() =>
        expectCompleteContract(
          mutation,
          expectedOrderedText,
          expectedAttachmentLinks,
        ),
      ).toThrow();
    }
  });

  it("rejects a Hebrew visible-content mutation", () => {
    const record: ContactMessageRecord = {
      ...baseRecord,
      channel: "halacha",
    };
    const rendered = renderContactEmail({
      attachmentLinksHtml: attachmentLinksHtml(),
      channel: "halacha",
      record,
      ticketNumber,
    });
    const changedHebrewTitle = rendered.htmlBody.replace(
      "פנייה חדשה לרב",
      "פנייה ששונתה",
    );

    expect(changedHebrewTitle).not.toBe(rendered.htmlBody);
    expect(() =>
      expectCompleteContract(
        changedHebrewTitle,
        expectedHebrewOrderedText(record, ticketNumber, [defaultAttachment]),
        expectedLinks([defaultAttachment]),
      ),
    ).toThrow();
  });
});
