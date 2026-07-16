# Shared Email Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one Ten10 visual system to every existing email through user-facing and admin/internal layouts while preserving all current content and behavior exactly.

**Architecture:** Add shared visual tokens and two email-safe layout renderers, then migrate one email type at a time into pure template modules. Lock each renderer to its current subject, ordered visible text, links, language, sender contract, and plain text through behavioral tests. Generate all real-content previews locally and stop before any push until the user approves every preview.

**Tech Stack:** TypeScript, Supabase Edge Functions on Deno, AWS SES Raw MIME, Supabase Auth templates, Vitest, email-safe presentation tables and inline CSS.

## Global Constraints

- Presentation only: do not change subjects, visible copy, links, labels, data fields, language behavior, recipients, CC, reply-to, sender variables, triggers, rate limits, no-send behavior, unsubscribe behavior, or attachment behavior.
- Do not add product options or links that do not exist in the current renderers.
- User-facing emails use the warm user layout.
- Admin/internal emails use the compact admin layout from the same brand family.
- User-facing language remains recipient-aware where currently implemented.
- Admin/internal language remains channel-specific as currently implemented.
- Use exact brand tokens: teal `#11676a`, gold `#f0c000`, cream `#f9f6eb`, warm white surfaces, and `Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif`.
- Keep delivered HTML email-safe: presentation tables, inline CSS, explicit `lang`, `dir`, and alignment.
- Do not add CSS filters, backdrop blur, animation, transitions, JavaScript, or unsupported layout dependencies.
- Keep all imports at the top.
- Keep TypeScript union handling exhaustive.
- Do not merge the two SES transport services in this plan.
- Preserve reminder MIME folding, List-Unsubscribe headers, tags, configuration set, SigV4, and unsubscribe JWT behavior.
- Preserve generic MIME transport behavior unless a dedicated regression test proves a required compatibility fix.
- Use synthetic preview data only. Never copy production PII into fixtures.
- Local commits are allowed as review checkpoints.
- Do not push any redesign commit to PR #347 until the user approves every required preview.
- Do not update Supabase Auth Dashboard templates until repository previews are approved.

---

## File Structure

### Create

- `supabase/functions/_shared/email-tokens.ts`
  - Exact visual tokens only.
- `supabase/functions/_shared/email-layout-user.ts`
  - Warm 600px user-facing shell.
- `supabase/functions/_shared/email-layout-admin.ts`
  - Compact admin shell supporting up to 800px.
- `supabase/functions/_shared/email-layouts.test.ts`
  - Token, direction, fallback, and escaping tests.
- `supabase/functions/process-email-request/email-template.ts`
  - Pure download email renderer.
- `supabase/functions/process-email-request/email-template.test.ts`
  - Exact content and layout contract.
- `supabase/functions/send-contact-email/email-template.ts`
  - Pure Hebrew/English contact renderer.
- `supabase/functions/send-contact-email/email-template.test.ts`
  - Content, escaping, attachment, and direction contracts.
- `supabase/functions/send-new-user-email/email-template.ts`
  - Pure daily-summary renderer extracted from the current implementation.
- `supabase/functions/send-new-user-email/email-template.test.ts`
  - Empty and populated summary contracts.
- `supabase/functions/send-cron-alerts/email-template.ts`
  - Pure cron-alert renderer.
- `supabase/functions/send-cron-alerts/email-template.test.ts`
  - Alert content, table, and escaping contracts.
- `supabase/functions/_tests/auth-email-templates.test.ts`
  - Parses and validates repository Auth subjects and HTML blocks.
- `supabase/functions/_tests/email-previews.test.ts`
  - Generates every required real-content preview and index.
- `supabase/functions/_tests/email-semantic-contract.ts`
  - Test-only helpers for ordered text and link extraction.

### Modify

- `supabase/functions/process-email-request/index.ts`
  - Call the pure download renderer.
- `supabase/functions/send-contact-email/index.ts`
  - Call the pure contact renderer.
- `supabase/functions/send-new-user-email/index.ts`
  - Call the extracted daily-summary renderer.
- `supabase/functions/send-cron-alerts/index.ts`
  - Call the pure cron-alert renderer.
- `supabase/functions/send-reminder-emails/email-templates.ts`
  - Consume shared visual tokens only if output remains visually equivalent.
- `supabase/auth-email-templates.md`
  - Restyle the four existing templates without changing subjects or copy.
- `vitest.config.ts`
  - Ensure shared and Auth template tests are discovered.
- `llm-instructions/features/email/email-reminders-feature-complete-guide.md`
  - Link the shared design inventory without changing reminder behavior docs.
- `llm-instructions/backend/supabase-integration-status.md`
  - Record renderer and preview locations after implementation.

### Explicitly Unchanged

- `supabase/functions/_shared/simple-email-service.ts`
- `supabase/functions/send-reminder-emails/simple-email-service.ts`
- `supabase/functions/send-reminder-emails/jwt-utils.ts`
- `infrastructure/cloudflare/email-worker.js`
- Cron schedules and migrations
- Supabase Auth Dashboard configuration

---

### Task 1: Shared Tokens and Layout Contracts

**Files:**
- Create: `supabase/functions/_shared/email-tokens.ts`
- Create: `supabase/functions/_shared/email-layout-user.ts`
- Create: `supabase/functions/_shared/email-layout-admin.ts`
- Create: `supabase/functions/_shared/email-layouts.test.ts`
- Create: `supabase/functions/_tests/email-semantic-contract.ts`
- Modify: `vitest.config.ts`

**Interfaces:**

```ts
export type EmailDirection = "rtl" | "ltr";
export type EmailLanguage = "he" | "en";

export interface EmailShellInput {
  lang: EmailLanguage;
  dir: EmailDirection;
  bodyHtml: string;
  headerSlogan: string;
  maxWidth?: 600 | 800;
}

export function renderUserEmailShell(input: EmailShellInput): string;
export function renderAdminEmailShell(input: EmailShellInput): string;
```

- [ ] **Step 1: Write failing layout tests**

Create tests asserting:

```ts
expect(EMAIL_TOKENS.colors.teal).toBe("#11676a");
expect(EMAIL_TOKENS.colors.gold).toBe("#f0c000");
expect(EMAIL_TOKENS.colors.cream).toBe("#f9f6eb");
expect(EMAIL_TOKENS.fontFamily).toBe(
  "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
);
```

For user layout, assert:

- `lang="he"` and `dir="rtl"` are emitted from input.
- Maximum width is 600px.
- Header background contains the hosted blur asset and cream fallback.
- Logo and supplied slogan are rendered.
- `bodyHtml` appears once and unchanged.

For admin layout, assert:

- `lang="en"` and `dir="ltr"` are emitted from input.
- Maximum width is 800px.
- Header is compact and uses the same logo, teal, gold, cream, and font stack.
- `bodyHtml` appears once and unchanged.
- No new visible footer or operational label is invented.

- [ ] **Step 2: Run tests to verify RED**

```powershell
npm test -- supabase/functions/_shared/email-layouts.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement exact tokens**

```ts
export const EMAIL_TOKENS = {
  colors: {
    teal: "#11676a",
    gold: "#f0c000",
    cream: "#f9f6eb",
    surface: "#fffdf8",
    border: "#ded9ca",
    text: "#243834",
    mutedText: "#596662",
  },
  fontFamily:
    "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
  logoUrl: "https://ten10-app.com/logo/logo-wide.png",
  headerBackgroundUrl:
    "https://ten10-app.com/email/reminder-header-blur.png",
  userWidth: 600,
  adminWidth: 800,
} as const;
```

- [ ] **Step 4: Implement minimal email-safe layouts**

Both layouts must:

- Return a complete HTML document.
- Use presentation tables and inline CSS.
- Escape only layout-owned values.
- Insert `bodyHtml` verbatim.
- Render the existing supplied slogan verbatim.
- Use no extra visible copy.

- [ ] **Step 5: Add semantic contract helpers**

Create test-only helpers:

```ts
export interface SemanticEmailContract {
  orderedText: string[];
  links: Array<{ text: string; href: string }>;
}

export function normalizeVisibleText(value: string): string;
export function extractSemanticContract(html: string): SemanticEmailContract;
```

The extractor must:

- Remove style and head content.
- Convert block endings and `<br>` to line boundaries.
- Strip tags.
- Decode the HTML entities used by current templates.
- Collapse repeated spaces without reordering text.
- Extract anchor text and `href` in document order.

- [ ] **Step 6: Run focused and full tests**

```powershell
npm test -- supabase/functions/_shared/email-layouts.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 7: Stop for task review**

Do not push.

---

### Task 2: Desktop Download Email

**Files:**
- Create: `supabase/functions/process-email-request/email-template.ts`
- Create: `supabase/functions/process-email-request/email-template.test.ts`
- Modify: `supabase/functions/process-email-request/index.ts`

**Interfaces:**

```ts
export interface DownloadEmailInput {
  jumboMailLink: string;
  directDownloadLink: string | null;
}

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export function renderDownloadEmail(
  input: DownloadEmailInput,
): RenderedEmail;
```

- [ ] **Step 1: Write exact content tests from the current renderer**

Assert subject exactly:

```text
קישור להורדת Ten10
```

Assert text output preserves, in order:

```text
שלום,
לבקשתך, הנה הקישורים להורדת תוכנת Ten10:
1. להורדה דרך ג'מבו מייל (למי שחסום לו הגלישה ויש לו מייל בלבד):
אם הקישור לא נפתח, נא לבקש מסינון האינטרנט שלך לאשר אותו.
בברכה,
צוות Ten10
```

When a direct link exists, preserve:

```text
2. להורדה ישירה:
```

Assert HTML preserves exactly these visible labels:

```text
שלום,
לבקשתך, הנה הקישורים להורדת תוכנת Ten10 לניהול מעשרות:
להורדה דרך ג'מבו מייל
למי שחסום לו הגלישה ויש לו מייל בלבד
או לחץ על הקישור:
להורדה ישירה
שים לב:
אם הקישור לא נפתח (למשל בנטפרי/אתרוג), ייתכן שצריך לבקש אישור מיוחד מהסינון שלך עבור הקישור הספציפי הזה.
לפרטים נוספים על התוכנה
בברכה,
צוות Ten10
נא לא להשיב למייל זה. לשאלות ותמיכה ניתן לפנות לכתובת:
קישור ישיר (JumboMail) להעתקה:
קישור להורדה ישירה:
```

Assert links remain:

- Existing `JUMBOMAIL_LINK`.
- Existing direct release link when present.
- `https://ten10-app.com/landing`.
- `mailto:support@ten10-app.com`.

- [ ] **Step 2: Run tests to verify RED**

```powershell
npm test -- supabase/functions/process-email-request/email-template.test.ts
```

Expected: FAIL because the pure renderer does not exist.

- [ ] **Step 3: Extract the current renderer without visual changes**

Move subject, text, and HTML generation into `renderDownloadEmail`. Keep every string and conditional unchanged.

Update `index.ts` to pass:

```ts
const renderedEmail = renderDownloadEmail({
  jumboMailLink: JUMBOMAIL_LINK,
  directDownloadLink,
});
```

- [ ] **Step 4: Verify the baseline contract is green**

```powershell
npm test -- supabase/functions/process-email-request/email-template.test.ts
```

- [ ] **Step 5: Apply the user layout**

Replace only presentation wrappers with `renderUserEmailShell`. Preserve the current content HTML and link order.

- [ ] **Step 6: Re-run contract and import checks**

```powershell
npm test -- supabase/functions/process-email-request/email-template.test.ts
npm run check-supabase-imports
```

- [ ] **Step 7: Generate local preview**

With `WRITE_EMAIL_PREVIEWS=1`, write:

```text
tmp/email-previews/download-he.html
```

Use synthetic URLs and current labels.

- [ ] **Step 8: Stop for visual and code review**

Do not push.

---

### Task 3: Contact Email, Hebrew and English

**Files:**
- Create: `supabase/functions/send-contact-email/email-template.ts`
- Create: `supabase/functions/send-contact-email/email-template.test.ts`
- Modify: `supabase/functions/send-contact-email/index.ts`

**Interfaces:**

```ts
export interface ContactEmailTemplateInput {
  channel: "halacha" | "dev";
  ticketNumber: string;
  record: ContactMessageRecord;
  attachmentLinksHtml: string;
}

export function renderContactEmail(
  input: ContactEmailTemplateInput,
): { htmlBody: string; textBody: string };
```

The existing subject remains generated in `index.ts`:

```text
[TEN10][CHANNEL] #TEN-YYYY-ID - {subject}
```

- [ ] **Step 1: Write failing Hebrew content contract**

Assert ordered labels:

```text
פנייה חדשה לרב
מאת:
מספר כרטיס:
נושא:
חומרה:
קבצים מצורפים:
מידע טכני:
פלטפורמה
גרסת אפליקציה
שפה
מזהה משתמש
IP
User Agent
```

Assert Hebrew text body pattern remains:

```text
פנייה חדשה לרב. כרטיס: {ticket}. נושא: {subject}. הודעה: {body}
```

- [ ] **Step 2: Write failing English content contract**

Assert ordered labels:

```text
New Contact Message
From:
Ticket ID:
Subject:
Severity:
Attachments:
Technical Metadata:
Platform
App Version
Locale
User ID
IP
User Agent
```

Assert the English text body preserves severity and message order.

- [ ] **Step 3: Add security assertions**

Use fixture values containing:

```text
<img src=x onerror=alert(1)>
```

Assert user name, email, subject, body, metadata, and attachment labels are HTML-escaped while signed attachment URLs remain functional.

- [ ] **Step 4: Extract current renderers and verify baseline**

```powershell
npm test -- supabase/functions/send-contact-email/email-template.test.ts
```

- [ ] **Step 5: Apply compact admin layout**

Use `renderAdminEmailShell` for both directions. Preserve:

- Hebrew `dir="rtl"`.
- English `dir="ltr"`.
- Severity labels and colors.
- Existing metadata.
- Existing attachment section.

- [ ] **Step 6: Generate previews**

```text
tmp/email-previews/contact-halacha-he.html
tmp/email-previews/contact-dev-en.html
```

- [ ] **Step 7: Run focused and full tests**

```powershell
npm test -- supabase/functions/send-contact-email/email-template.test.ts
npm test
```

- [ ] **Step 8: Stop for visual and code review**

Do not push.

---

### Task 4: Daily New-User Summary

**Files:**
- Create: `supabase/functions/send-new-user-email/email-template.ts`
- Create: `supabase/functions/send-new-user-email/email-template.test.ts`
- Modify: `supabase/functions/send-new-user-email/index.ts`

**Interfaces:**

Move the current `buildEmailBodies` inputs and return type into the new module without changing them.

- [ ] **Step 1: Write failing empty-summary contract**

Assert exact visible content:

```text
Daily Summary
Last {hours} hours: No new profiles and no new download requests.
Total registered users (all-time):
```

Assert the text body remains identical.

- [ ] **Step 2: Write failing populated-summary contract**

Protect these existing labels:

```text
Email downloads
New web users
GitHub installs
Reminder emails:
Web Platform — New Users
Avatar
Full Name
Email
User ID
Date
Time
Consent
Desktop Platform — Download Requests
```

Protect current emoji and status wording because they are existing content.

- [ ] **Step 3: Protect data contract**

Assert:

- Avatar or `N/A`.
- Full name fallback `Not provided`.
- Email fallback `unknown`.
- Truncated user ID.
- Israel-local date and time.
- `Yes`, `No`, or `Unknown` consent.
- Existing download and GitHub data.
- Current reminder status wording.

- [ ] **Step 4: Extract current builder without visual changes**

Run:

```powershell
npm test -- supabase/functions/send-new-user-email/email-template.test.ts
```

- [ ] **Step 5: Apply compact admin layout**

Preserve all sections and data. Replace only shell, spacing, typography, borders, stat presentation, and table styling.

- [ ] **Step 6: Generate preview**

```text
tmp/email-previews/daily-summary-en.html
```

- [ ] **Step 7: Run focused tests**

```powershell
npm test -- supabase/functions/send-new-user-email/email-template.test.ts
npm test
```

- [ ] **Step 8: Stop for visual and code review**

Do not push.

---

### Task 5: Cron Failure Alerts

**Files:**
- Create: `supabase/functions/send-cron-alerts/email-template.ts`
- Create: `supabase/functions/send-cron-alerts/email-template.test.ts`
- Modify: `supabase/functions/send-cron-alerts/index.ts`

**Interfaces:**

```ts
export function generateAlertEmailHTML(
  failures: CronJobFailure[],
): string;

export function generateAlertEmailText(
  failures: CronJobFailure[],
): string;
```

- [ ] **Step 1: Write exact content tests**

Protect HTML labels:

```text
⚠️ התראות על כשלונות CRON Jobs
נמצאו {count} כשלונות ב-24 השעות האחרונות
שם ה-Job
סטטוס
הודעה
זמן
לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs
```

Protect plain text:

```text
Cron Job Failures Alert
Found {count} failure(s) in the last 24 hours:
Check Supabase Dashboard → Database → Cron Jobs for details.
```

- [ ] **Step 2: Protect escaping**

Assert job name, status, return message, and timestamp render safely.

- [ ] **Step 3: Extract existing functions and verify baseline**

```powershell
npm test -- supabase/functions/send-cron-alerts/email-template.test.ts
```

- [ ] **Step 4: Apply compact admin layout**

Preserve the mixed language behavior exactly. Do not translate the subject, table, or text body.

- [ ] **Step 5: Generate preview**

```text
tmp/email-previews/cron-alert-he.html
```

- [ ] **Step 6: Run focused and full tests**

```powershell
npm test -- supabase/functions/send-cron-alerts/email-template.test.ts
npm test
```

- [ ] **Step 7: Stop for visual and code review**

Do not push.

---

### Task 6: Supabase Auth Templates

**Files:**
- Modify: `supabase/auth-email-templates.md`
- Create: `supabase/functions/_tests/auth-email-templates.test.ts`

**Interfaces:**

The test parser produces:

```ts
interface AuthTemplate {
  name:
    | "confirm-signup"
    | "reset-password"
    | "magic-link"
    | "invite";
  subject: string;
  html: string;
}
```

- [ ] **Step 1: Write parser and exact baseline tests**

Protect subjects:

```text
אשר את הרשמתך ל-Ten10
איפוס סיסמה ל-Ten10
קישור כניסה ל-Ten10
הוזמנת להצטרף ל-Ten10
```

Protect CTA template variable:

```text
{{ .ConfirmationURL }}
```

Protect each current title, paragraph, CTA, and footer exactly as stored in the repository.

- [ ] **Step 2: Run baseline tests**

```powershell
npm test -- supabase/functions/_tests/auth-email-templates.test.ts
```

- [ ] **Step 3: Restyle all four HTML blocks**

Apply the user-facing layout tokens manually in the static templates. Do not change any Hebrew sentence, subject, CTA, template variable, or footer text.

- [ ] **Step 4: Verify semantic contracts**

```powershell
npm test -- supabase/functions/_tests/auth-email-templates.test.ts
```

- [ ] **Step 5: Generate previews**

Replace `{{ .ConfirmationURL }}` with a synthetic local URL only in preview output:

```text
tmp/email-previews/auth-confirm-signup-he.html
tmp/email-previews/auth-reset-password-he.html
tmp/email-previews/auth-magic-link-he.html
tmp/email-previews/auth-invite-he.html
```

- [ ] **Step 6: Stop for visual and code review**

Do not update Supabase Dashboard and do not push.

---

### Task 7: Reminder Token Alignment and Complete Preview Index

**Files:**
- Modify: `supabase/functions/send-reminder-emails/email-templates.ts`
- Modify: `supabase/functions/send-reminder-emails/email-templates.test.ts`
- Create: `supabase/functions/_tests/email-previews.test.ts`

**Interfaces:**

The preview generator imports only production renderers and Auth template parser output.

- [ ] **Step 1: Align reminder with shared tokens**

Replace duplicate visual constants only where output values remain identical:

- Teal.
- Gold.
- Cream.
- Font stack.
- Logo URL.
- Header asset URL.
- Border color.

Do not change reminder content, balance logic, greeting, links, encouragement, or MIME behavior.

- [ ] **Step 2: Verify reminder tests**

```powershell
npm test -- supabase/functions/send-reminder-emails
```

Expected: all existing reminder tests pass unchanged.

- [ ] **Step 3: Write the complete preview generator**

Generate exactly:

```text
reminder-he-outstanding.html
reminder-he-credit.html
reminder-en-outstanding.html
download-he.html
contact-halacha-he.html
contact-dev-en.html
daily-summary-en.html
cron-alert-he.html
auth-confirm-signup-he.html
auth-reset-password-he.html
auth-magic-link-he.html
auth-invite-he.html
index.html
```

The index lists:

- Email name.
- Audience.
- Language.
- Variant.
- Subject.
- Link to desktop preview.
- Link with a narrow-width preview parameter or wrapper.

- [ ] **Step 4: Add fallback inspection**

For each user-facing preview, create a view that replaces remote image URLs with an invalid synthetic host while preserving fallback colors.

- [ ] **Step 5: Run preview generation**

```powershell
$env:WRITE_EMAIL_PREVIEWS = "1"
npm test -- supabase/functions/_tests/email-previews.test.ts
Remove-Item Env:WRITE_EMAIL_PREVIEWS
```

Expected: 13 files generated under `tmp/email-previews`.

- [ ] **Step 6: Run all automated checks**

```powershell
npm test
npm run build
npm run check-supabase-imports
git diff --check
```

- [ ] **Step 7: Present previews to user**

Start a local static server for `tmp/email-previews` and provide the index URL.

Record feedback for every email. Do not push.

---

### Task 8: Approval Record, Documentation, and Push Gate

**Files:**
- Create: `docs/email-preview-approval.md`
- Modify: `llm-instructions/features/email/email-reminders-feature-complete-guide.md`
- Modify: `llm-instructions/backend/supabase-integration-status.md`
- Verify: all changed files

- [ ] **Step 1: Create approval record after user review**

Run only after explicit user approval:

```powershell
$previewDate = Get-Date -Format "yyyy-MM-dd"
$previewCommit = git rev-parse HEAD
$approval = @"
# Email Preview Approval

- Preview date: $previewDate
- Preview commit: $previewCommit
- Approved by: Yossi Weinberger
- Approved emails:
  - Tithe reminder, Hebrew outstanding
  - Tithe reminder, Hebrew credit
  - Tithe reminder, English outstanding
  - Desktop download, Hebrew
  - Contact halacha, Hebrew
  - Contact dev, English
  - Daily summary, English
  - Cron alert, Hebrew HTML / English plain text
  - Auth confirm signup, Hebrew
  - Auth reset password, Hebrew
  - Auth magic link, Hebrew
  - Auth invite, Hebrew
- Deferred emails: none
- Content changed: no
- Approved for push to PR #347: yes
"@
Set-Content -Path "docs/email-preview-approval.md" -Value $approval -Encoding utf8
```

- [ ] **Step 2: Update maintenance documentation**

Add the final renderer inventory, preview command, and manual Auth deployment boundary.

- [ ] **Step 3: Verify no semantic content drift**

Run every renderer contract test and include the exact count in the report.

- [ ] **Step 4: Run final verification**

```powershell
npm test
npm run build
npm run check-supabase-imports
npx eslint `
  "supabase/functions/_shared/email-*.ts" `
  "supabase/functions/process-email-request/email-template*.ts" `
  "supabase/functions/send-contact-email/email-template*.ts" `
  "supabase/functions/send-new-user-email/email-template*.ts" `
  "supabase/functions/send-cron-alerts/email-template*.ts" `
  "supabase/functions/_tests/*.ts"
git diff --check
git status --short
```

- [ ] **Step 5: Review intended push**

Confirm:

- No `tmp/email-previews` files are tracked.
- No `.superpowers` files are tracked.
- No synthetic PII appears in production code.
- No subject or content changes appear in semantic contracts.
- No SES transport changes occurred.
- No Supabase Dashboard change occurred.

- [ ] **Step 6: Stop for explicit push authorization**

Do not push until the user explicitly approves the complete preview set.

---

## Plan Self-Review

- Spec coverage: all user-facing and admin/internal emails, content preservation, shared visual tokens, gradual migration, previews, Auth manual deployment, security, and push gate are mapped to tasks.
- Completeness: every task includes exact files, interfaces, focused tests, commands, and stop conditions.
- Type consistency:
  - Shared layouts consume `EmailShellInput`.
  - Email-specific renderers return subject, HTML, and plain text without changing transport.
  - Preview generation imports production renderers rather than duplicating content.
- Scope:
  - Rendering changes only.
  - No transport consolidation.
  - No workflow, migration, cron, recipient, or sender changes.
  - No push before preview approval.
