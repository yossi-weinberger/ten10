import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import {
  buildEmailBodies,
  generateDailySummarySubject,
  type BuildEmailBodiesInput,
  type ReminderRunLog,
} from "./email-template.ts";

const englishSlogan = "DAILY OPERATIONS";
const adminFooter = ["Ten10 Operations", "Automated internal email"] as const;

const populatedInput: BuildEmailBodiesInput = {
  downloadRequests: {
    details: [
      {
        created_at: "2026-07-16T07:15:00.000Z",
        from_email: "download@example.test",
        id: "download-1",
        reason: "Requested desktop installer",
        status: "sent",
      },
      {
        created_at: "2026-07-16T06:10:00.000Z",
        from_email: "blocked@example.test",
        id: "download-2",
        reason: null,
        status: "blocked",
      },
      {
        created_at: "2026-07-16T05:05:00.000Z",
        from_email: "error@example.test",
        id: "download-3",
        reason: "Mailbox rejected",
        status: "error",
      },
    ],
    total: 120,
    windowCount: 3,
  },
  github: {
    last24h: 7,
    latestDownloads: 40,
    latestVersion: "v0.7.4",
    totalDownloads: 640,
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
      avatar_url: "https://example.test/avatar.png?size=36&format=webp",
      email: "complete@example.test",
      full_name: "Complete User",
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
    {
      auth_created_at: null,
      avatar_url: null,
      email: "unknown-consent@example.test",
      full_name: "Unknown Consent",
      id: "abcdef12-aaaa-bbbb-cccc-abcdef123456",
      mailing_list_consent: null,
      updated_at: "2026-07-16T12:00:00.000Z",
    },
  ],
  totalUsers: 342,
};

const expectedPopulatedTextBody = `Daily Summary
Last 24 hours.

🌐 Web users last 24h: 3 (all-time: 342)
💻 Email downloads last 24h: 3 (all-time: 120)
📧 Reminder emails: 4 sent | 1 failed
📦 GitHub installs — last 24h: +7 | all-time: 640 | v0.7.4: 40

  - Complete User | complete@example.test | date=16/07/2026 13:30 | consent: Yes
  - Not provided | unknown | date=16/07/2026 14:45 | consent: No
  - Unknown Consent | unknown-consent@example.test | date=16/07/2026 15:00 | consent: Unknown

💻 Desktop Platform — Download requests last 24h: 3 (all-time: 120)
  16/07/2026 10:15 | download@example.test | sent (Requested desktop installer)
  16/07/2026 09:10 | blocked@example.test | blocked
  16/07/2026 08:05 | error@example.test | error (Mailbox rejected)`;

const expectedPopulatedOrderedText = [
  englishSlogan,
  "Daily Summary",
  "Last 24 hours",
  "💻 Email downloads",
  "3",
  "All-time: 120",
  "🌐 New web users",
  "3",
  "All-time: 342",
  "📦 GitHub installs",
  "+7",
  "All-time: 640",
  "v0.7.4: 40",
  "📧 Reminder emails: 4 sent · 1 failed",
  "🌐 Web Platform — New Users",
  "Complete User",
  "Yes",
  "complete@example.test",
  "16/07/2026 · 13:30 · 12345678...",
  "N/A",
  "Not provided",
  "No",
  "unknown",
  "16/07/2026 · 14:45 · 87654321...",
  "N/A",
  "Unknown Consent",
  "Unknown",
  "unknown-consent@example.test",
  "16/07/2026 · 15:00 · abcdef12...",
  "💻 Desktop Platform — Download Requests",
  "download@example.test",
  "✓ sent",
  "16/07/2026 · 10:15",
  "Requested desktop installer",
  "blocked@example.test",
  "blocked",
  "16/07/2026 · 09:10",
  "error@example.test",
  "error",
  "16/07/2026 · 08:05",
  "Mailbox rejected",
  ...adminFooter,
];

function withReminderLogs(
  reminderLogs: ReminderRunLog[],
): BuildEmailBodiesInput {
  return { ...populatedInput, reminderLogs };
}

function visibleText(input: BuildEmailBodiesInput): string[] {
  return extractSemanticContract(buildEmailBodies(input).htmlBody).orderedText;
}

describe("daily new-user summary email template", () => {
  it("renders the exact production subject", () => {
    expect(generateDailySummarySubject(populatedInput)).toBe(
      "[Ten10] Daily Summary: +3 users (342 total), 3 downloads",
    );
  });

  it("preserves the complete empty-summary HTML and exact text body", () => {
    const input: BuildEmailBodiesInput = {
      downloadRequests: { details: [], total: 120, windowCount: 0 },
      github: {
        last24h: null,
        latestDownloads: null,
        latestVersion: "—",
        totalDownloads: null,
      },
      hours: 24,
      reminderLogs: [],
      rows: [],
      totalUsers: 342,
    };
    const rendered = buildEmailBodies(input);

    expect(rendered.textBody).toBe(
      "Last 24 hours: No new profiles and no new download requests.\nTotal users (all-time): 342",
    );
    expect(rendered.htmlBody).toContain('lang="en"');
    expect(rendered.htmlBody).toContain('dir="ltr"');
    expect(extractSemanticContract(rendered.htmlBody)).toEqual({
      links: [],
      orderedText: [
        englishSlogan,
        "Daily Summary",
        "Last 24 hours: No new profiles and no new download requests.",
        "Total registered users (all-time): 342",
        ...adminFooter,
      ],
    });
  });

  it("preserves the complete populated ordered text, links, and text-body line order", () => {
    const rendered = buildEmailBodies(populatedInput);

    expect(rendered.textBody).toBe(expectedPopulatedTextBody);
    expect(extractSemanticContract(rendered.htmlBody)).toEqual({
      links: [],
      orderedText: expectedPopulatedOrderedText,
    });
    expect(rendered.htmlBody).toContain('lang="en"');
    expect(rendered.htmlBody).toContain('dir="ltr"');
    expect(rendered.htmlBody).toContain("max-width: 800px");
    expect(rendered.htmlBody).toContain("ten10-metric");
    expect(rendered.htmlBody).toContain("@media only screen and (max-width: 620px)");
    expect(rendered.htmlBody).toContain(
      'src="https://example.test/avatar.png?size=36&amp;format=webp"',
    );
  });

  it("preserves reminder success wording", () => {
    const text = visibleText(
      withReminderLogs([
        {
          day_of_month: 16,
          emails_failed: 0,
          emails_sent: 4,
          notes: null,
          run_at: "2026-07-16T08:00:00.000Z",
          users_processed: 4,
          was_reminder_day: true,
          was_shabbat: false,
        },
      ]),
    );

    expect(text).toContain("📧 Reminder emails: 4 sent");
    expect(text).not.toContain("1 failed");
  });

  it("preserves reminder failure wording", () => {
    const text = visibleText(
      withReminderLogs([
        {
          day_of_month: 16,
          emails_failed: 3,
          emails_sent: 0,
          notes: null,
          run_at: "2026-07-16T08:00:00.000Z",
          users_processed: 3,
          was_reminder_day: true,
          was_shabbat: false,
        },
      ]),
    );

    expect(text).toContain("📧 Reminder emails: ⚠️ 3 failed, 0 sent");
  });

  it("preserves reminder-day no-users wording", () => {
    const text = visibleText(
      withReminderLogs([
        {
          day_of_month: 16,
          emails_failed: 0,
          emails_sent: 0,
          notes: null,
          run_at: "2026-07-16T08:00:00.000Z",
          users_processed: 0,
          was_reminder_day: true,
          was_shabbat: false,
        },
      ]),
    );

    expect(text).toContain(
      "📧 Reminder emails: reminder day — no users configured",
    );
  });

  it("preserves Shabbat skip wording", () => {
    const text = visibleText(
      withReminderLogs([
        {
          day_of_month: 16,
          emails_failed: 0,
          emails_sent: 0,
          notes: null,
          run_at: "2026-07-16T08:00:00.000Z",
          users_processed: 0,
          was_reminder_day: false,
          was_shabbat: true,
        },
      ]),
    );

    expect(text).toContain("📧 Reminder emails: skipped (Shabbat)");
  });

  it("preserves non-reminder-day wording", () => {
    const text = visibleText(withReminderLogs([]));

    expect(text).toContain("📧 Reminder emails: not a reminder day");
  });

  it("preserves the complete non-reminder-day failure contract", () => {
    const input = withReminderLogs([
      {
        day_of_month: 16,
        emails_failed: 3,
        emails_sent: 0,
        notes: null,
        run_at: "2026-07-16T08:00:00.000Z",
        users_processed: 3,
        was_reminder_day: false,
        was_shabbat: false,
      },
    ]);
    const expectedTextBody = expectedPopulatedTextBody.replace(
      "📧 Reminder emails: 4 sent | 1 failed",
      "📧 Reminder emails: 0 sent | 3 failed",
    );
    const expectedContract = {
      links: [],
      orderedText: expectedPopulatedOrderedText.map((text) =>
        text === "📧 Reminder emails: 4 sent · 1 failed"
          ? "📧 Reminder emails: 3 failed"
          : text,
      ),
    };
    const rendered = buildEmailBodies(input);

    expect(rendered.textBody).toBe(expectedTextBody);
    expect(extractSemanticContract(rendered.htmlBody)).toEqual(
      expectedContract,
    );

    const mutatedHtml = rendered.htmlBody.replace(
      "📧 Reminder emails: <strong style=\"color: #dc2626;\">3 failed</strong>",
      "📧 Reminder emails: <strong style=\"color: #dc2626;\">4 failed</strong>",
    );
    const mutatedText = rendered.textBody.replace(
      "📧 Reminder emails: 0 sent | 3 failed",
      "📧 Reminder emails: 0 sent | 4 failed",
    );

    expect(mutatedHtml).not.toBe(rendered.htmlBody);
    expect(mutatedText).not.toBe(rendered.textBody);
    expect(extractSemanticContract(mutatedHtml)).not.toEqual(expectedContract);
    expect(mutatedText).not.toBe(expectedTextBody);
  });

  it("preserves GitHub-unavailable wording and data fallbacks", () => {
    const input: BuildEmailBodiesInput = {
      ...populatedInput,
      github: {
        last24h: null,
        latestDownloads: null,
        latestVersion: "—",
        totalDownloads: null,
      },
    };
    const rendered = buildEmailBodies(input);

    expect(visibleText(input)).toContain("GitHub unavailable");
    expect(rendered.textBody).toContain(
      "📦 GitHub installs — last 24h: — | all-time: — | —: —",
    );
  });

  it("escapes all dynamic HTML while preserving decoded visible output", () => {
    const unsafe = `"<img src=x onerror='alert(1)'>"`;
    const avatarUrl =
      `https://example.test/avatar" onerror='alert(1)'?x=<unsafe>&y=2`;
    const escapedAvatarUrl =
      "https://example.test/avatar&quot; onerror=&#39;alert(1)&#39;?x=&lt;unsafe&gt;&amp;y=2";
    const input: BuildEmailBodiesInput = {
      ...populatedInput,
      downloadRequests: {
        details: [
          {
            created_at: "invalid <time>",
            from_email: `download ${unsafe}`,
            id: "download-unsafe",
            reason: `reason ${unsafe}`,
            status: `status ${unsafe}`,
          },
        ],
        total: 1,
        windowCount: 1,
      },
      github: {
        ...populatedInput.github,
        latestVersion: `version ${unsafe}`,
      },
      rows: [
        {
          auth_created_at: "invalid <time>",
          avatar_url: avatarUrl,
          email: `email ${unsafe}`,
          full_name: `name ${unsafe}`,
          id: `12345678${unsafe}`,
          mailing_list_consent: true,
        },
      ],
    };
    const rendered = buildEmailBodies(input);
    const contract = extractSemanticContract(rendered.htmlBody);

    expect(contract.orderedText).toContain(`name ${unsafe}`);
    expect(contract.orderedText).toContain(`email ${unsafe}`);
    expect(contract.orderedText).toContain(`version ${unsafe}: 40`);
    expect(contract.orderedText).toContain(`download ${unsafe}`);
    expect(contract.orderedText).toContain(`reason ${unsafe}`);
    expect(contract.links).toEqual([]);
    expect(rendered.htmlBody).toContain(`src="${escapedAvatarUrl}"`);
    expect(rendered.htmlBody).not.toContain(unsafe);
    expect(rendered.htmlBody).not.toContain(`src="${avatarUrl}"`);
    expect(rendered.htmlBody).not.toContain(`name ${unsafe}`);
    expect(rendered.htmlBody).not.toContain(`email ${unsafe}`);
    expect(rendered.htmlBody).not.toContain(`version ${unsafe}`);
    expect(rendered.htmlBody).not.toContain(`download ${unsafe}`);
    expect(rendered.htmlBody).not.toContain(`reason ${unsafe}`);

    const unescapedAvatarMutation = rendered.htmlBody.replace(
      escapedAvatarUrl,
      avatarUrl,
    );
    const escapedName = "name &quot;&lt;img src=x onerror=&#39;alert(1)&#39;&gt;&quot;";
    const rawTextMutation = rendered.htmlBody.replace(
      escapedName,
      `name ${unsafe}`,
    );

    expect(unescapedAvatarMutation).not.toBe(rendered.htmlBody);
    expect(rawTextMutation).not.toBe(rendered.htmlBody);
    expect(unescapedAvatarMutation).toContain(`src="${avatarUrl}"`);
    expect(extractSemanticContract(rawTextMutation)).not.toEqual(contract);
  });

  it("rejects added and reordered visible-content mutations", () => {
    const rendered = buildEmailBodies(populatedInput);
    const expectedContract = {
      links: [],
      orderedText: expectedPopulatedOrderedText,
    };
    const addedContent = rendered.htmlBody.replace(
      "Daily Summary",
      "Daily Summary<p>Unexpected content</p>",
    );
    const reorderedContent = rendered.htmlBody
      .replace("Complete User", "__COMPLETE_USER__")
      .replace("Not provided", "Complete User")
      .replace("__COMPLETE_USER__", "Not provided");

    expect(addedContent).not.toBe(rendered.htmlBody);
    expect(reorderedContent).not.toBe(rendered.htmlBody);
    for (const mutation of [addedContent, reorderedContent]) {
      expect(extractSemanticContract(mutation)).not.toEqual(expectedContract);
    }
  });
});
