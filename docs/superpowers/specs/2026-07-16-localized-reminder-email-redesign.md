# Localized Reminder Email Redesign

**Date:** 2026-07-16  
**Status:** Approved visual direction, pending written review  
**Scope:** User-facing tithe reminder email sent by `send-reminder-emails`

## Summary

Redesign the tithe reminder email so it looks distinctly like Ten10, communicates the current balance clearly, supports Hebrew and English according to the user's existing language preference, optionally greets the user by first name, and includes one sourced encouragement item per calendar month.

The approved visual direction is "Ten10 Ledger" with:

- A centered Ten10 logo.
- A soft teal and gold blurred header background.
- The existing Hebrew or English slogan beneath the logo.
- A centered balance label above the amount.
- A concise reminder sentence and a single emphasized verification sentence.
- An Excel import hint.
- One primary call-to-action.
- A monthly "Encouragement Corner" below the call-to-action.
- The existing reminder-only and all-email unsubscribe links.

## Goals

1. Make the email feel calm, trustworthy, modern, and recognizably Ten10.
2. Avoid generic SaaS and AI-generated visual patterns.
3. Send Hebrew or English content from the user's existing app language preference.
4. Keep Hebrew as the safe fallback for missing or invalid language data.
5. Preserve all existing delivery, consent, unsubscribe, and security behavior.
6. Render acceptably in Gmail, Apple Mail, mobile clients, and Outlook.
7. Keep email copy and monthly content small, local, typed, and easy to review.

## Non-goals

- Do not redesign other transactional or administrative emails.
- Do not add a new `preferred_language` column.
- Do not add i18next to the Deno Edge Function.
- Do not change reminder scheduling, consent rules, or Shabbat handling.
- Do not change tithe calculations or currency behavior.
- Do not add open or click tracking.
- Do not add dark-mode-specific email rendering in this change.

## Current State

The reminder pipeline is:

1. `send-reminder-emails/index.ts` runs from the existing cron schedule.
2. `UserService` calls `get_reminder_users_with_emails(reminder_day)`.
3. `UserService` calculates each user's tithe balance.
4. `SimpleEmailService` generates unsubscribe links.
5. `email-templates.ts` generates a Hebrew-only subject and HTML body.
6. `simple-email-service.ts` generates a minimal English-only plain-text body.
7. AWS SES sends a multipart Raw MIME message.

Production profile data currently contains:

- 255 profiles with `client_preferences.language = "he"`.
- 30 profiles with `client_preferences.language = "en"`.
- 312 profiles with `client_preferences IS NULL`.
- No profiles with an invalid or missing language key inside a non-null preferences object.

The null values are expected because `client_preferences` is nullable and has no database default. It is populated after an authenticated app session completes preference synchronization. Users who have not completed that flow remain null.

## Approved Visual Design

### Physical scene

The recipient reads a financial and religious reminder in an email client during the evening. The email should feel reassuring and precise, not promotional or urgent.

### Color strategy

Use a restrained brand palette:

- Deep Ten10 teal: `#11676a`
- Ten10 gold: `#f0c000`
- Warm page background: approximately `#f7f3e7`
- Warm white surface: approximately `#fffdf8`
- Warm neutral borders and secondary text

The status balance may use semantic green or amber variations, but the primary structure remains teal, gold, and warm neutral.

### Header

The header contains:

1. A warm cream fallback background.
2. A soft, pre-rendered teal and gold blurred background image.
3. The centered wide Ten10 logo.
4. A gold rule matching the logo width.
5. The localized slogan.
6. A subtle bottom border separating the header from the body.

The blurred effect must not rely on CSS `filter`, CSS gradients, or backdrop blur in the delivered email. Those features are inconsistent in Outlook. The production design uses a small optimized raster image hosted on `ten10-app.com`, with the cream color as a complete fallback when remote images are blocked.

### Typography

Use one consistent font stack throughout the email:

```text
Assistant, Arial Hebrew, Segoe UI, Arial, sans-serif
```

Do not assume that remote web fonts will load. Assistant is the preferred brand font where available. Common system fonts provide the expected fallback in email clients.

Use weight and size for hierarchy:

- Greeting: medium, teal.
- Short reminder: strong body text.
- Balance label: medium emphasis.
- Balance amount: largest and strongest element.
- Supporting text: regular body weight.
- Footer: smaller neutral text.

### Layout

- Maximum content width: 600px.
- Hebrew uses `dir="rtl"` and right-to-left copy.
- English uses `dir="ltr"` and left-to-right copy.
- Header and balance remain centered in both languages.
- Body copy follows the language direction.
- Use email-safe table layout and inline styles.
- Avoid side accent borders, nested cards, decorative emoji, glass effects, and CSS transitions.

## Localized Copy Structure

### Greeting

Hebrew:

- With name: `ערב טוב, {firstName}`
- Without name: `ערב טוב`

English:

- With name: `Good evening, {firstName}`
- Without name: `Good evening`

The first name is derived from `profiles.full_name`. Trim the value, split on whitespace, use the first non-empty segment, and HTML-escape it before inserting it into HTML.

### Reminder sentence

Hebrew:

`תזכורת קצרה לעדכון המעשרות, כדי לשמור על יתרה מדויקת.`

English:

`A quick reminder to update your tithes and keep your balance accurate.`

### Balance states

#### Outstanding balance, `balance > 0`

Hebrew label:

`יתרת המעשר שלך לתרומה היא`

English label:

`Your remaining tithe balance is`

#### Credit balance, `balance < 0`

Hebrew label:

`הינך נמצא בזכות של`

English label:

`You currently have a credit of`

Display the absolute value so the amount is not shown with a minus sign.

#### Balanced, `balance === 0`

Hebrew label:

`יתרת המעשר שלך מאוזנת`

English label:

`Your tithe balance is settled`

Display `0.00 ₪`.

### Verification sentence

Hebrew:

`כדאי לוודא שהוספת את ההכנסות, ההוצאות והתרומות האחרונות.`

English:

`Make sure you have added your latest income, expenses, and donations.`

The sentence is centered and visually emphasized. It is not a checklist and must not imply that the system knows which items are missing.

### Excel import hint

Hebrew:

`יש לך כמה פעולות לעדכן? אפשר לייבא אותן בקלות מקובץ Excel.`

English:

`Several transactions to update? You can easily import them from an Excel file.`

This claim is supported by the existing CSV and XLSX transaction import flow.

### Call to action

Hebrew:

`לעדכון המעשרות ב־Ten10`

English:

`Update your tithes in Ten10`

The link remains `https://ten10-app.com`.

### Footer

Preserve the two separate unsubscribe actions.

Hebrew:

- `הפסקת תזכורות חודשיות`
- `ביטול הרשמה מכל המיילים`

English:

- `Stop monthly reminders`
- `Unsubscribe from all emails`

The existing one-click MIME unsubscribe headers remain unchanged.

## Encouragement Corner

### Label

Approved Hebrew label:

`פינת החיזוק`

Approved English label:

`Encouragement Corner`

### Placement

Place the section below the primary call-to-action and above the footer. It should feel like a closing thought, not a competing action.

Use:

- A small localized label.
- A short quotation or story.
- A source line when applicable.
- A single gold rule as the section divider.
- Centered text.

### Content model

Maintain exactly 12 entries per supported language:

```ts
interface MonthlyEncouragement {
  body: string;
  source?: string;
}
```

The Hebrew and English arrays must have the same length and semantic month mapping.

Content requirements:

- Quotations from Chazal must include an accurate source.
- Stories must be short enough for email and must not make unsupported halachic claims.
- English entries should be translated and edited, not mechanically transliterated.
- All 24 localized entries require human editorial and source review before production rollout.

The approved preview example is:

- Body: `עשר בשביל שתתעשר`
- Source: `תענית ט׳ ע״א`

### Monthly selection

Select the entry deterministically by the Gregorian month in `Asia/Jerusalem`:

- January uses index 0.
- February uses index 1.
- Continue through December at index 11.

All reminder emails sent during the same Israeli calendar month use the same entry. Do not select randomly per send or per user.

## Localization Architecture

### Source of truth

Continue using:

```text
profiles.client_preferences.language
```

Normalize it at the database boundary:

- Exact `en` becomes English.
- Exact `he` becomes Hebrew.
- Missing, null, empty, or unknown values become Hebrew.

Do not add or dual-write a dedicated language column.

### Email locale resources

Create one small typed module local to the reminder function, for example:

```text
supabase/functions/send-reminder-emails/email-copy.ts
```

It contains:

- Supported language type.
- Direction and locale metadata.
- Subject copy.
- Greeting copy.
- Balance-state copy.
- Verification sentence.
- Import hint.
- CTA and footer copy.
- Slogan.
- Encouragement label.
- Twelve monthly encouragement entries per language.

Use a `satisfies` constraint so missing fields or languages fail at compile time.

Do not import browser i18next, React translation namespaces, or `public/locales` into the Edge Function. The email copy has different runtime and review requirements.

## Database Contract

Create a new migration that establishes the full canonical definition of:

```text
public.get_reminder_users_with_emails(integer)
```

The current production definition is not fully represented in repository migrations. The new migration becomes the versioned source of truth.

The function continues to:

- Join `profiles` to `auth.users`.
- Require `reminder_enabled = true`.
- Require the selected reminder day.
- Require `mailing_list_consent = true`.
- Require a non-null email.
- Run as `SECURITY DEFINER`.
- Set a safe `search_path`.
- Permit execution only by `service_role`.

It additionally returns:

- `full_name`
- Normalized `language`

Because PostgreSQL cannot change a function's return table shape with `CREATE OR REPLACE`, the migration must drop and recreate the function inside one transaction, then restore comments, revokes, grants, and privilege assertions.

No profile backfill is required. Hebrew fallback covers null preferences without mutating unrelated user data.

## Edge Function Data Flow

1. Cron invokes `send-reminder-emails`.
2. The service-role RPC returns recipient identity, email, reminder settings, `full_name`, and normalized language.
3. `UserService` calculates balance values as it does today.
4. The email service derives an optional first name.
5. The email service selects the locale resource.
6. The email service selects the monthly encouragement using the Israeli month.
7. The same template data generates:
   - Subject
   - HTML body
   - Plain-text body
8. Raw MIME and unsubscribe headers are generated as they are today.
9. SES sends the message.

## Template Rendering

Refactor the template module into small pure helpers without introducing a template framework:

- Normalize language.
- Escape user-controlled HTML.
- Extract first name.
- Format the absolute amount.
- Select balance-state copy.
- Select monthly encouragement.
- Generate subject.
- Generate HTML.
- Generate plain text.

Keep imports at the top of each module.

The HTML should use:

- A presentation table for the outer 600px layout.
- Nested tables only where required for Outlook alignment.
- Inline styles.
- HTML `lang` and `dir`.
- Explicit text alignment.
- Solid color fallbacks.
- A standard linked `<img>` for the logo.
- A hosted linked background asset for the blurred header.

## Error Handling and Fallbacks

- Unknown language: use Hebrew.
- Missing name: omit the name and punctuation cleanly.
- Invalid name: trim, escape, and omit if empty.
- Missing header image: cream background still provides a complete header.
- Missing encouragement source: render the body without an empty source element.
- Invalid encouragement configuration: fail tests and deployment checks, not individual production sends.
- Unsubscribe URL generation behavior remains unchanged in this scope.

## Testing Strategy

### Unit tests

Add tests for:

- Hebrew and English subjects.
- Hebrew RTL and English LTR HTML.
- Localized slogans and footer links.
- Positive, negative, and zero balances.
- Negative values displayed as absolute amounts.
- Greeting with Hebrew and English names.
- Greeting without a name.
- HTML escaping of a malicious or malformed name.
- Missing and invalid language fallback to Hebrew.
- All 12 month indexes in `Asia/Jerusalem`.
- Exactly 12 encouragement entries per language.
- Matching semantic month indexes across languages.
- Plain-text output in both languages.

### Rendering checks

Generate local HTML fixtures for:

- Hebrew outstanding balance.
- Hebrew credit balance.
- Hebrew zero balance.
- English outstanding balance.
- Long English name.
- Missing remote images.
- Narrow mobile width.

Manually inspect at minimum:

- Gmail web
- Gmail mobile
- Apple Mail if available
- Outlook web
- Outlook desktop if available

### Database verification

After applying the migration in a non-production environment:

- Confirm the RPC returns normalized `he` or `en`.
- Confirm null preferences return `he`.
- Confirm `full_name` is returned.
- Confirm only `service_role` can execute.
- Confirm reminder-day and consent filtering are unchanged.

## Rollout

After implementation and local verification, use this exact safe order:

1. Deploy the static reminder header asset.
2. Apply the recipient RPC migration in staging.
3. Verify the RPC return shape, language fallback, unchanged filters, and
   function privileges.
4. Deploy the `send-reminder-emails` Edge Function.
5. Perform controlled Hebrew and English sends, then verify unsubscribe
   behavior, MIME headers, image fallback, and supported email clients.
6. Approve and perform production rollout only after the product and rabbinic
   editorial gates, staging checks, and manual client checks are complete.

After production rollout, monitor SES failures and `reminder_run_logs` during
the first scheduled run.

No A/B test or feature flag is required for this focused redesign.

## Documentation Updates

Update:

- `llm-instructions/features/email/email-reminders-feature-complete-guide.md`
- `llm-instructions/features/email/email-system-future-improvements.md`
- `llm-instructions/backend/supabase-integration-status.md`

Correct stale statements about:

- Reminder days.
- The old `EmailService` filename.
- List-Unsubscribe status.
- The obsolete proposal for a dedicated language column.
- The canonical reminder RPC return contract.

## Acceptance Criteria

- The production email matches the approved Ten10 Ledger design.
- The header uses the approved soft teal and gold blurred treatment with a cream fallback.
- The encouragement section label is `פינת החיזוק` in Hebrew.
- The encouragement content rotates deterministically across 12 Israeli calendar months.
- Hebrew and English recipients receive fully localized subject, HTML, and plain text.
- Missing language values receive Hebrew.
- Optional first names are safely rendered.
- Balance state copy matches the approved Hebrew wording.
- The Excel import hint is present.
- Both unsubscribe links and one-click unsubscribe headers still work.
- The email remains readable when remote images are blocked.
- Automated tests and manual rendering checks pass.
