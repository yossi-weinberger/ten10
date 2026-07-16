import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { renderDownloadEmail } from "../process-email-request/email-template.ts";
import {
  renderContactAttachmentListItem,
  renderContactEmail,
  renderContactEmailSubject,
  type ContactMessageRecord,
} from "../send-contact-email/email-template.ts";
import {
  generateAlertEmailHTML,
  generateAlertEmailSubject,
  type CronJobFailure,
} from "../send-cron-alerts/email-template.ts";
import {
  buildEmailBodies,
  generateDailySummarySubject,
  type BuildEmailBodiesInput,
} from "../send-new-user-email/email-template.ts";
import {
  generateReminderEmailHTML,
  generateReminderEmailSubject,
  type EmailTemplateData,
} from "../send-reminder-emails/email-templates.ts";
import {
  readRepositoryAuthTemplates,
  renderAuthTemplatePreview,
} from "./auth-email-template-parser.ts";

type PreviewAudience = "User" | "Admin";
type PreviewLanguage = "Hebrew" | "English";

interface PreviewDefinition {
  filename: string;
  name: string;
  audience: PreviewAudience;
  language: PreviewLanguage;
  variant: string;
  subject: string;
  html: string;
  expectedContent: readonly string[];
}

interface PreviewMetadata {
  filename: string;
  name: string;
  audience: PreviewAudience;
  language: PreviewLanguage;
  variant: string;
  subject: string;
}

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(CURRENT_DIRECTORY, "../../..");
const OUTPUT_DIRECTORY = resolve(REPOSITORY_ROOT, "tmp/email-previews");
const INVALID_IMAGE_ORIGIN = "https://invalid.example.test";

const EXPECTED_FILES = [
  "auth-confirm-signup-he.html",
  "auth-invite-he.html",
  "auth-magic-link-he.html",
  "auth-reset-password-he.html",
  "contact-dev-en.html",
  "contact-halacha-he.html",
  "cron-alert-he.html",
  "daily-summary-en.html",
  "download-he.html",
  "index.html",
  "reminder-en-outstanding.html",
  "reminder-he-credit.html",
  "reminder-he-outstanding.html",
] as const;

const EXPECTED_METADATA: PreviewMetadata[] = [
  {
    audience: "User",
    filename: "reminder-he-outstanding.html",
    language: "Hebrew",
    name: "Tithe reminder",
    subject: "תזכורת מעשר - נותרו 384.70 ₪ לתרומה",
    variant: "Outstanding balance",
  },
  {
    audience: "User",
    filename: "reminder-he-credit.html",
    language: "Hebrew",
    name: "Tithe reminder",
    subject: "תזכורת מעשר - הינך בזכות של 384.70 ₪",
    variant: "Credit balance",
  },
  {
    audience: "User",
    filename: "reminder-en-outstanding.html",
    language: "English",
    name: "Tithe reminder",
    subject: "Tithe reminder - ₪384.70 remaining",
    variant: "Outstanding balance",
  },
  {
    audience: "User",
    filename: "download-he.html",
    language: "Hebrew",
    name: "Desktop download",
    subject: "קישור להורדת Ten10",
    variant: "Transactional",
  },
  {
    audience: "Admin",
    filename: "contact-halacha-he.html",
    language: "Hebrew",
    name: "Contact notification",
    subject:
      "[TEN10][HALACHA] #TEN-2026-ABCDE - שאלה סינתטית בנושא חישוב מעשר",
    variant: "Halacha",
  },
  {
    audience: "Admin",
    filename: "contact-dev-en.html",
    language: "English",
    name: "Contact notification",
    subject:
      "[TEN10][DEV] #TEN-2026-ABCDE - Synthetic desktop diagnostics",
    variant: "Development",
  },
  {
    audience: "Admin",
    filename: "daily-summary-en.html",
    language: "English",
    name: "Daily summary",
    subject: "[Ten10] Daily Summary: +2 users (42 total), 2 downloads",
    variant: "Operational summary",
  },
  {
    audience: "Admin",
    filename: "cron-alert-he.html",
    language: "Hebrew",
    name: "Cron alert",
    subject: "[Ten10 Alert] 2 Cron Job Failure(s) Detected",
    variant: "Failure alert",
  },
  {
    audience: "User",
    filename: "auth-confirm-signup-he.html",
    language: "Hebrew",
    name: "Auth",
    subject: "אשר את הרשמתך ל-Ten10",
    variant: "Confirm signup",
  },
  {
    audience: "User",
    filename: "auth-reset-password-he.html",
    language: "Hebrew",
    name: "Auth",
    subject: "איפוס סיסמה ל-Ten10",
    variant: "Reset password",
  },
  {
    audience: "User",
    filename: "auth-magic-link-he.html",
    language: "Hebrew",
    name: "Auth",
    subject: "קישור כניסה ל-Ten10",
    variant: "Magic link",
  },
  {
    audience: "User",
    filename: "auth-invite-he.html",
    language: "Hebrew",
    name: "Auth",
    subject: "הוזמנת להצטרף ל-Ten10",
    variant: "Invite",
  },
];

const reminderBaseData: EmailTemplateData = {
  chomeshBalance: 0,
  fullName: "משתמש לדוגמה",
  israelMonth: 1,
  language: "he",
  maaserBalance: 384.7,
  titheBalance: 384.7,
  unsubscribeUrls: {
    allUrl: "https://ten10-app.com/unsubscribe?type=all&token=synthetic",
    reminderUrl:
      "https://ten10-app.com/unsubscribe?type=reminder&token=synthetic",
  },
};

const contactBaseRecord: ContactMessageRecord = {
  app_version: "0.7.4",
  attachments: [
    {
      name: "synthetic-diagnostics.txt",
      path: "synthetic/synthetic-diagnostics.txt",
    },
  ],
  body: "Synthetic message body for local preview inspection.",
  channel: "dev",
  client_platform: "windows",
  created_at: "2026-07-16T10:00:00.000Z",
  id: "abcde000-0000-0000-0000-000000000000",
  ip: "192.0.2.10",
  locale: "en-US",
  session_id: "synthetic-session",
  severity: "high",
  subject: "Synthetic desktop diagnostics",
  user_agent: "Ten10 Synthetic Client/0.7.4",
  user_email: "preview-user@example.test",
  user_id: "synthetic-user",
  user_name: "Synthetic Preview User",
};

const dailySummaryInput: BuildEmailBodiesInput = {
  downloadRequests: {
    details: [
      {
        created_at: "2026-07-16T07:15:00.000Z",
        from_email: "download-preview@example.test",
        id: "synthetic-download-1",
        reason: "Synthetic desktop installer request",
        status: "sent",
      },
      {
        created_at: "2026-07-16T06:10:00.000Z",
        from_email: "blocked-preview@example.test",
        id: "synthetic-download-2",
        reason: null,
        status: "blocked",
      },
    ],
    total: 18,
    windowCount: 2,
  },
  github: {
    last24h: 3,
    latestDownloads: 12,
    latestVersion: "v0.7.4",
    totalDownloads: 128,
  },
  hours: 24,
  reminderLogs: [
    {
      day_of_month: 16,
      emails_failed: 1,
      emails_sent: 4,
      notes: null,
      run_at: "2026-07-16T08:00:00.000Z",
      users_processed: 5,
      was_reminder_day: true,
      was_shabbat: false,
    },
  ],
  rows: [
    {
      auth_created_at: "2026-07-16T10:30:00.000Z",
      avatar_url: "https://assets.example.test/synthetic-avatar.png",
      email: "new-preview@example.test",
      full_name: "Synthetic New User",
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      mailing_list_consent: true,
    },
    {
      auth_created_at: "2026-07-16T11:45:00.000Z",
      avatar_url: null,
      email: null,
      full_name: null,
      id: "87654321-aaaa-bbbb-cccc-210987654321",
      mailing_list_consent: false,
    },
  ],
  totalUsers: 42,
};

const cronFailures: CronJobFailure[] = [
  {
    duration_seconds: 12,
    end_time: "2026-07-16T09:00:12.000Z",
    jobid: 1,
    jobname: "synthetic_nightly_rollup",
    return_message: "Synthetic worker failure",
    runid: 101,
    start_time: "2026-07-16T09:00:00.000Z",
    status: "failed",
  },
  {
    duration_seconds: 30,
    end_time: "2026-07-16T10:15:30.000Z",
    jobid: 2,
    jobname: "synthetic_billing_sync",
    return_message: "Synthetic timeout",
    runid: 102,
    start_time: "2026-07-16T10:15:00.000Z",
    status: "error",
  },
];

function renderAttachment(label: string): string {
  return `<ul>${renderContactAttachmentListItem(
    label,
    "https://storage.example.test/synthetic-signed-file?token=synthetic",
  )}</ul>`;
}

function buildPreviewDefinitions(): PreviewDefinition[] {
  const reminderHebrewOutstanding = {
    ...reminderBaseData,
  };
  const reminderHebrewCredit = {
    ...reminderBaseData,
    titheBalance: -384.7,
  };
  const reminderEnglishOutstanding = {
    ...reminderBaseData,
    fullName: "Example User",
    language: "en" as const,
  };
  const download = renderDownloadEmail({
    directDownloadLink:
      "https://downloads.example.test/Ten10-Synthetic-Setup.exe",
    jumboMailLink: "https://downloads.example.test/synthetic-jumbo-mail",
  });
  const halachaRecord: ContactMessageRecord = {
    ...contactBaseRecord,
    body: "זוהי הודעה סינתטית לצורך תצוגה מקומית.",
    channel: "halacha",
    locale: "he-IL",
    subject: "שאלה סינתטית בנושא חישוב מעשר",
    user_email: "halacha-preview@example.test",
    user_name: "משתמש סינתטי",
  };
  const halachaContact = renderContactEmail({
    attachmentLinksHtml: renderAttachment("synthetic-halacha.pdf"),
    channel: "halacha",
    record: halachaRecord,
    ticketNumber: "TEN-2026-ABCDE",
  });
  const devContact = renderContactEmail({
    attachmentLinksHtml: renderAttachment("synthetic-diagnostics.txt"),
    channel: "dev",
    record: contactBaseRecord,
    ticketNumber: "TEN-2026-ABCDE",
  });
  const dailySummary = buildEmailBodies(dailySummaryInput);
  const authContent: Record<
    ReturnType<typeof readRepositoryAuthTemplates>[number]["name"],
    readonly string[]
  > = {
    "confirm-signup": ["ברוכים הבאים ל-Ten10!", "אשר הרשמה"],
    "reset-password": ["איפוס סיסמה", "אפס סיסמה"],
    "magic-link": ["התחברות ל-Ten10", "התחבר עכשיו"],
    invite: ["הוזמנת ל-Ten10!", "קבל הזמנה"],
  };
  const authVariants: Record<
    ReturnType<typeof readRepositoryAuthTemplates>[number]["name"],
    string
  > = {
    "confirm-signup": "Confirm signup",
    "reset-password": "Reset password",
    "magic-link": "Magic link",
    invite: "Invite",
  };

  return [
    {
      audience: "User",
      expectedContent: [
        "ערב טוב, משתמש",
        "יתרת המעשר שלך לתרומה היא",
        "384.70",
        "הפסקת תזכורות חודשיות",
      ],
      filename: "reminder-he-outstanding.html",
      html: generateReminderEmailHTML(reminderHebrewOutstanding),
      language: "Hebrew",
      name: "Tithe reminder",
      subject: generateReminderEmailSubject(reminderHebrewOutstanding),
      variant: "Outstanding balance",
    },
    {
      audience: "User",
      expectedContent: [
        "הינך נמצא בזכות של",
        "384.70",
        "ביטול הרשמה מכל המיילים",
      ],
      filename: "reminder-he-credit.html",
      html: generateReminderEmailHTML(reminderHebrewCredit),
      language: "Hebrew",
      name: "Tithe reminder",
      subject: generateReminderEmailSubject(reminderHebrewCredit),
      variant: "Credit balance",
    },
    {
      audience: "User",
      expectedContent: [
        "Good evening, Example",
        "Your remaining tithe balance is",
        "Stop monthly reminders",
      ],
      filename: "reminder-en-outstanding.html",
      html: generateReminderEmailHTML(reminderEnglishOutstanding),
      language: "English",
      name: "Tithe reminder",
      subject: generateReminderEmailSubject(reminderEnglishOutstanding),
      variant: "Outstanding balance",
    },
    {
      audience: "User",
      expectedContent: [
        "לבקשתך, הנה הקישורים להורדת תוכנת",
        "להורדה דרך ג'מבו מייל",
        "לפרטים נוספים על התוכנה",
      ],
      filename: "download-he.html",
      html: download.htmlBody,
      language: "Hebrew",
      name: "Desktop download",
      subject: download.subject,
      variant: "Transactional",
    },
    {
      audience: "Admin",
      expectedContent: [
        "פנייה חדשה לרב",
        halachaRecord.subject,
        halachaRecord.body,
        "מידע טכני:",
      ],
      filename: "contact-halacha-he.html",
      html: halachaContact.htmlBody,
      language: "Hebrew",
      name: "Contact notification",
      subject: renderContactEmailSubject(
        "halacha",
        "TEN-2026-ABCDE",
        halachaRecord.subject,
      ),
      variant: "Halacha",
    },
    {
      audience: "Admin",
      expectedContent: [
        "New Contact Message",
        contactBaseRecord.subject,
        contactBaseRecord.body,
        "Technical Metadata:",
      ],
      filename: "contact-dev-en.html",
      html: devContact.htmlBody,
      language: "English",
      name: "Contact notification",
      subject: renderContactEmailSubject(
        "dev",
        "TEN-2026-ABCDE",
        contactBaseRecord.subject,
      ),
      variant: "Development",
    },
    {
      audience: "Admin",
      expectedContent: [
        "Daily Summary",
        "Synthetic New User",
        "Synthetic desktop installer request",
      ],
      filename: "daily-summary-en.html",
      html: dailySummary.htmlBody,
      language: "English",
      name: "Daily summary",
      subject: generateDailySummarySubject(dailySummaryInput),
      variant: "Operational summary",
    },
    {
      audience: "Admin",
      expectedContent: [
        "⚠️ התראות על כשלונות CRON Jobs",
        "synthetic_nightly_rollup",
        "Synthetic timeout",
      ],
      filename: "cron-alert-he.html",
      html: generateAlertEmailHTML(cronFailures),
      language: "Hebrew",
      name: "Cron alert",
      subject: generateAlertEmailSubject(cronFailures),
      variant: "Failure alert",
    },
    ...readRepositoryAuthTemplates().map((template) => ({
      audience: "User" as const,
      expectedContent: authContent[template.name],
      filename: `auth-${template.name}-he.html`,
      html: renderAuthTemplatePreview(template),
      language: "Hebrew" as const,
      name: "Auth",
      subject: template.subject,
      variant: authVariants[template.name],
    })),
  ];
}

function metadataFor(preview: PreviewDefinition): PreviewMetadata {
  const { audience, filename, language, name, subject, variant } = preview;
  return { audience, filename, language, name, subject, variant };
}

function remoteImagesDisabled(html: string): string {
  return html
    .replaceAll(
      EMAIL_TOKENS.logoUrl,
      `${INVALID_IMAGE_ORIGIN}/logo/logo-wide.png`,
    )
    .replaceAll(
      EMAIL_TOKENS.headerBackgroundUrl,
      `${INVALID_IMAGE_ORIGIN}/email/reminder-header-blur.png`,
    );
}

function safeInlineJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function renderPreviewIndex(previews: PreviewDefinition[]): string {
  const fallbackHtmlByFilename = Object.fromEntries(
    previews
      .filter((preview) => preview.audience === "User")
      .map((preview) => [
        preview.filename,
        remoteImagesDisabled(preview.html),
      ]),
  );
  const rows = previews
    .map((preview) => {
      const narrowHref = `index.html?preview=${preview.filename}&width=narrow`;
      const narrowHrefHtml = escapeHtml(narrowHref);
      const fallbackLink =
        preview.audience === "User"
          ? `<a data-view="fallback" href="${narrowHrefHtml}&amp;images=off">Images off</a>`
          : "Not applicable";

      return `<tr data-file="${preview.filename}">
        <td>${escapeHtml(preview.name)}</td>
        <td>${preview.audience}</td>
        <td>${preview.language}</td>
        <td>${escapeHtml(preview.variant)}</td>
        <td dir="auto">${escapeHtml(preview.subject)}</td>
        <td><a data-view="desktop" href="${preview.filename}">Desktop</a></td>
        <td><a data-view="narrow" href="${narrowHrefHtml}">Narrow</a></td>
        <td>${fallbackLink}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ten10 local email previews</title>
    <style>
      :root { color-scheme: light; font-family: Arial, sans-serif; }
      body { margin: 0; background: #f4f5f3; color: #243834; }
      main { max-width: 1280px; margin: 0 auto; padding: 24px; }
      h1 { margin-top: 0; }
      .notice { padding: 12px 16px; background: #fff7df; border: 1px solid #f0c000; }
      table { width: 100%; margin-top: 20px; border-collapse: collapse; background: white; }
      th, td { padding: 10px; border: 1px solid #ded9ca; text-align: left; vertical-align: top; }
      th { background: #f9f6eb; }
      a { color: #11676a; }
      #inspector[hidden], #index[hidden] { display: none; }
      .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
      .frame-shell { margin: 0 auto; background: white; border: 1px solid #ded9ca; }
      .frame-shell.narrow { width: 390px; max-width: 100%; }
      .frame-shell.desktop { width: 900px; max-width: 100%; }
      iframe { display: block; width: 100%; min-height: 900px; border: 0; }
    </style>
  </head>
  <body>
    <main>
      <section id="index">
        <h1>Ten10 local email previews</h1>
        <p class="notice">Local synthetic-data output only. No production recipients, secrets, or credentials are included.</p>
        <table>
          <thead>
            <tr>
              <th>Email name</th>
              <th>Audience</th>
              <th>Language</th>
              <th>Variant</th>
              <th>Subject</th>
              <th>Desktop</th>
              <th>Narrow width</th>
              <th>Remote images</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>
      <section id="inspector" hidden>
        <div class="toolbar">
          <a href="index.html">← All previews</a>
          <strong id="inspection-label"></strong>
        </div>
        <div id="frame-shell" class="frame-shell desktop">
          <iframe id="preview-frame" title="Email preview"></iframe>
        </div>
      </section>
    </main>
    <script>
      const fallbackHtmlByFilename = ${safeInlineJson(fallbackHtmlByFilename)};
      const parameters = new URLSearchParams(window.location.search);
      const preview = parameters.get("preview");

      if (preview) {
        const narrow = parameters.get("width") === "narrow";
        const imagesOff = parameters.get("images") === "off";
        const indexSection = document.getElementById("index");
        const inspector = document.getElementById("inspector");
        const frameShell = document.getElementById("frame-shell");
        const frame = document.getElementById("preview-frame");
        const label = document.getElementById("inspection-label");

        indexSection.hidden = true;
        inspector.hidden = false;
        frameShell.className = "frame-shell " + (narrow ? "narrow" : "desktop");
        label.textContent = preview + " · " + (narrow ? "narrow" : "desktop") + (imagesOff ? " · remote images disabled" : "");

        if (imagesOff && fallbackHtmlByFilename[preview]) {
          frame.srcdoc = fallbackHtmlByFilename[preview];
        } else {
          frame.src = preview;
        }
      }
    </script>
  </body>
</html>`;
}

function writePreviewFiles(
  previews: PreviewDefinition[],
  indexHtml: string,
): void {
  rmSync(OUTPUT_DIRECTORY, { force: true, recursive: true });
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  for (const preview of previews) {
    writeFileSync(
      resolve(OUTPUT_DIRECTORY, preview.filename),
      `${preview.html}\n`,
      "utf8",
    );
  }

  writeFileSync(resolve(OUTPUT_DIRECTORY, "index.html"), `${indexHtml}\n`, "utf8");
}

const previews = buildPreviewDefinitions();
const indexHtml = renderPreviewIndex(previews);

describe("complete email preview index", () => {
  it("defines exactly the required preview metadata and production subjects", () => {
    expect(previews.map(metadataFor)).toEqual(EXPECTED_METADATA);
    expect(
      [...previews.map((preview) => preview.filename), "index.html"].sort(),
    ).toEqual(EXPECTED_FILES);
  });

  it.each(previews)(
    "preserves the subject and content contract for $filename",
    (preview) => {
      const expected = EXPECTED_METADATA.find(
        (metadata) => metadata.filename === preview.filename,
      );

      expect(expected).toBeDefined();
      expect(preview.subject).toBe(expected?.subject);
      expect(preview.html).toMatch(/^<!DOCTYPE html>/);
      expect(preview.html).not.toContain("{{ .ConfirmationURL }}");
      expect(preview.html).not.toContain("@gmail.com");
      for (const content of preview.expectedContent) {
        expect(preview.html).toContain(content);
      }
    },
  );

  it("provides an image-disabled fallback for every user-facing preview", () => {
    const userPreviews = previews.filter(
      (preview) => preview.audience === "User",
    );

    expect(userPreviews).toHaveLength(8);
    for (const preview of userPreviews) {
      const fallbackHtml = remoteImagesDisabled(preview.html);

      expect(fallbackHtml).not.toContain(EMAIL_TOKENS.logoUrl);
      expect(fallbackHtml).not.toContain(EMAIL_TOKENS.headerBackgroundUrl);
      expect(fallbackHtml).toContain(INVALID_IMAGE_ORIGIN);
      expect(fallbackHtml).toContain(EMAIL_TOKENS.colors.cream);
      expect(indexHtml).toContain(
        `href="index.html?preview=${preview.filename}&amp;width=narrow&amp;images=off"`,
      );
    }
  });

  it("lists exact metadata and desktop/narrow links for every preview", () => {
    expect(indexHtml.match(/<tr data-file=/g)).toHaveLength(12);
    expect(indexHtml).toContain("Local synthetic-data output only.");

    for (const metadata of EXPECTED_METADATA) {
      expect(indexHtml).toContain(`<tr data-file="${metadata.filename}">`);
      expect(indexHtml).toContain(`>${escapeHtml(metadata.name)}</td>`);
      expect(indexHtml).toContain(`>${metadata.audience}</td>`);
      expect(indexHtml).toContain(`>${metadata.language}</td>`);
      expect(indexHtml).toContain(`>${escapeHtml(metadata.variant)}</td>`);
      expect(indexHtml).toContain(
        `dir="auto">${escapeHtml(metadata.subject)}</td>`,
      );
      expect(indexHtml).toContain(
        `data-view="desktop" href="${metadata.filename}"`,
      );
      expect(indexHtml).toContain(
        `data-view="narrow" href="index.html?preview=${metadata.filename}&amp;width=narrow"`,
      );
    }
  });

  it("writes exactly the required file set when explicitly enabled", () => {
    if (process.env.WRITE_EMAIL_PREVIEWS !== "1") return;

    writePreviewFiles(previews, indexHtml);

    expect(readdirSync(OUTPUT_DIRECTORY).sort()).toEqual(EXPECTED_FILES);
    for (const preview of previews) {
      const output = readFileSync(
        resolve(OUTPUT_DIRECTORY, preview.filename),
        "utf8",
      );

      expect(output).toBe(`${preview.html}\n`);
      expect(output).toContain(preview.expectedContent[0]);
    }
    expect(readFileSync(resolve(OUTPUT_DIRECTORY, "index.html"), "utf8")).toBe(
      `${indexHtml}\n`,
    );
  });
});
