# Shared Email Design System

**Date:** 2026-07-16  
**Status:** Approved visual direction, pending written review  
**Scope:** Visual redesign of every Ten10 email using one brand family and two density variants

## Summary

Create a shared email design foundation for Ten10 with:

- A warm, spacious user-facing layout.
- A compact, operational admin/internal layout.
- Shared brand tokens for logo, teal, gold, cream, typography, borders, and spacing.
- Gradual migration of one email type at a time.
- Real previews generated from the existing email content before any additional push to PR #347.

This work changes presentation only. Existing subjects, visible copy, links, data fields, language behavior, senders, recipients, triggers, and email logic must remain unchanged.

## Non-Negotiable Content Preservation

The current email output is the source of truth.

The redesign must not:

- Add, remove, rewrite, translate, or reorder meaningfully any subject text.
- Add product options or links that do not exist today.
- Add references to MSI, organizational installation, offline installation, or any other download option unless that exact content already exists in the current email.
- Change CTA destinations.
- Change recipient, CC, reply-to, or sender behavior.
- Change user-facing language selection.
- Change admin channel language.
- Change unsubscribe text, URLs, scopes, or MIME headers.
- Change attachment behavior or signed URL lifetime.
- Change reminder, cron, webhook, rate-limit, or no-send behavior.
- Change data included in admin summaries or alerts.

The HTML structure may change only to improve visual hierarchy, spacing, accessibility, responsiveness, and email-client compatibility.

## Inventory and Variant Assignment

### User-facing variant

1. Tithe reminder
   - Existing localized reminder design remains the visual reference.
   - Existing Hebrew and English copy remains unchanged.
   - Existing monthly encouragement content remains unchanged.
2. Desktop download response
   - Hebrew RTL.
   - Existing subject, download links, warning content, and rate-limit behavior remain unchanged.
3. Supabase Auth templates
   - Signup confirmation.
   - Password reset.
   - Magic link.
   - Invite.
   - Existing Hebrew content remains unchanged in this scope.
   - Change Email and Reauthentication remain Supabase defaults and are not redesigned unless separately added to the repository and approved.

### Admin/internal variant

1. Contact email
   - Halacha channel remains Hebrew RTL.
   - Development channel remains English LTR.
   - Existing ticket identifiers, metadata, body, attachments, CC, and reply-to remain unchanged.
2. Daily new-user summary
   - Remains English LTR.
   - Existing users, downloads, GitHub, reminder-log, and no-send behavior remain unchanged.
3. Cron failure alerts
   - Existing subject and mixed language behavior remain unchanged.
   - Existing failure details and recipient lookup remain unchanged.

## Visual Relationship

Both variants belong to the same Ten10 brand family.

Shared identity comes from:

- Ten10 wide logo.
- Deep teal `#11676a`.
- Gold `#f0c000`.
- Warm cream `#f9f6eb`.
- Warm white surfaces.
- Assistant-first system font stack.
- Thin warm borders.
- Small gold rule or accent.
- Calm, precise hierarchy.

The variants differ only in density and information priority.

### User-facing layout

- Warm and spacious.
- Centered branded header.
- Soft teal and gold background treatment with solid cream fallback.
- One primary action.
- Generous vertical rhythm.
- Body copy optimized for reading.
- Footer optimized for trust, legal links, and transactional context.

### Admin/internal layout

- Compact and scan-friendly.
- Short horizontal branded header.
- Logo aligned with timestamp or operational metadata.
- Dense tables and metric strips.
- Clear status hierarchy.
- Reduced decorative spacing.
- No promotional tone.
- Footer clearly identifies automated internal email.

## Shared Architecture

Use a minimal tokens-plus-layouts architecture.

### Proposed shared modules

```text
supabase/functions/_shared/email-tokens.ts
supabase/functions/_shared/email-layout-user.ts
supabase/functions/_shared/email-layout-admin.ts
```

### `email-tokens.ts`

Owns only visual constants:

- Colors.
- Font stack.
- Logo URL and dimensions.
- Header background asset URL and fallback.
- Widths.
- Border colors.
- Spacing constants where reuse materially improves consistency.

It must not own:

- Subjects.
- Body copy.
- CTA text.
- URLs.
- Recipient behavior.
- Language detection.
- Email-specific business logic.

### `email-layout-user.ts`

Provides small, email-safe rendering primitives:

- Outer email shell.
- Branded header.
- Body section.
- Primary action.
- Informational callout.
- Transactional footer.

It accepts already-rendered content from each email type. It does not invent or translate copy.

### `email-layout-admin.ts`

Provides:

- Compact header.
- Operational title row.
- Metric strip.
- Metadata rows.
- Data table wrapper.
- Status treatment.
- Internal footer.

It accepts existing content and data. It does not rename labels or alter the information model.

## Transport Architecture

Do not merge the two SES services in the first redesign pass.

Current state:

- `_shared/simple-email-service.ts` sends generic Raw MIME.
- `send-reminder-emails/simple-email-service.ts` adds unsubscribe headers, tags, configuration-set support, localized content, and tested MIME folding.

The first phase changes rendering only. Transport consolidation is deferred until:

- Every email renderer has behavioral tests.
- Generic MIME folding is tested.
- Optional List-Unsubscribe behavior is designed.
- Sender-specific environment variables are covered.
- Existing reminder unsubscribe behavior cannot regress.

## Gradual Migration Order

Migrate one email type at a time and stop for review after each preview.

1. Desktop download response
   - Smallest user-facing transactional surface.
   - Establishes the shared user layout outside reminders.
2. Contact email
   - Establishes Hebrew RTL and English LTR admin layout.
3. Daily new-user summary
   - Exercises metrics and dense tables.
4. Cron failure alerts
   - Exercises alert severity and operational tables.
5. Supabase Auth templates
   - Regenerate repository templates from the approved user layout.
   - Preview every template.
   - Apply manually in Supabase Dashboard only after approval.
6. Tithe reminder alignment
   - Consume shared visual tokens only if output remains visually identical to the approved reminder design.

## Preview-First Gate

Local commits may be used as review checkpoints, but no additional push to PR #347 is allowed until the user approves real previews for every email.

### Preview requirements

Generate previews from the actual renderer and existing content, not mock copy.

Required preview files:

```text
tmp/email-previews/reminder-he-outstanding.html
tmp/email-previews/reminder-he-credit.html
tmp/email-previews/reminder-en-outstanding.html
tmp/email-previews/download-he.html
tmp/email-previews/contact-halacha-he.html
tmp/email-previews/contact-dev-en.html
tmp/email-previews/daily-summary-en.html
tmp/email-previews/cron-alert-he.html
tmp/email-previews/auth-confirm-signup-he.html
tmp/email-previews/auth-reset-password-he.html
tmp/email-previews/auth-magic-link-he.html
tmp/email-previews/auth-invite-he.html
```

Representative data may be synthetic, but all labels, paragraphs, links, subjects, and field names must come from the current production renderer or repository Auth templates.

### Preview page

Provide one local preview index that:

- Lists every email type.
- Displays subject, audience, language, and variant.
- Opens the full email preview.
- Supports desktop and narrow mobile widths.
- Allows remote images to be disabled for fallback inspection.
- Clearly labels previews as local synthetic-data output.

### Approval record

Before push, record:

- Preview version.
- User approval date.
- Approved email list.
- Any intentionally deferred email.

## Content Regression Protection

Before changing a renderer, capture a baseline contract from the current output.

For each email type, tests must protect:

- Subject.
- Visible text sequence.
- Link text and destinations.
- Data labels.
- Language and direction.
- Sender/reply-to/CC contract where applicable.
- Plain-text content.
- Unsubscribe/legal content where applicable.

Dynamic values should use deterministic fixtures.

After redesign, compare semantic content rather than raw HTML:

- Normalize whitespace.
- Strip presentation-only tags.
- Extract ordered visible text.
- Extract all links.
- Compare subjects separately.

The redesign passes only when the semantic baseline is unchanged.

## Rendering Requirements

- Presentation tables and inline CSS for delivered email.
- Maximum content width of 600px for user-facing email.
- Admin tables may use up to 800px where current content requires it.
- Explicit `lang`, `dir`, and text alignment.
- Solid-color fallbacks for every background image.
- No CSS filter, backdrop blur, animation, transitions, or JavaScript.
- Base64 MIME parts remain folded at 76 characters.
- Every physical MIME line remains under 998 characters.
- Remote image blocking must leave a complete readable email.

## Security Requirements

- Escape all user-controlled content before inserting it into HTML.
- Preserve reply-to behavior without rendering raw values unsafely.
- Preserve attachment URL signing and lifetime.
- Preserve Cloudflare worker secret verification.
- Preserve contact and download rate limiting.
- Preserve service-role-only cron and RPC boundaries.
- Preserve reminder unsubscribe JWT and one-click headers.
- Do not expose service-role keys, sender credentials, or recipient PII in preview artifacts.
- Synthetic preview fixtures must not use real user data.

## Deployment Boundaries

### Edge Functions

Changing `_shared` files can redeploy multiple functions. Migration must therefore be incremental and test-gated.

### Cloudflare Worker

The worker only forwards the download request. Its ingress behavior is not redesigned unless a renderer contract requires a separately approved change.

### Supabase Auth

Auth templates are not deployed through Edge Function CI. They require:

1. Approved repository preview.
2. Manual paste into Supabase Dashboard.
3. Controlled Auth email send.
4. Verification in Gmail and Outlook.

## Testing Strategy

### Renderer tests

Add pure tests for every migrated renderer:

- Existing semantic content preserved.
- Expected variant tokens present.
- RTL/LTR correct.
- Fallback colors present.
- Links preserved.
- Unsafe fixture content escaped.

### Transport tests

Do not duplicate reminder MIME tests. Add generic transport tests only when generic transport changes.

### Manual client checks

After all previews are approved and before production rollout:

- Gmail web.
- Gmail mobile.
- Outlook web.
- Outlook desktop where available.
- Apple Mail where available.
- Images enabled and disabled.
- Narrow mobile viewport.

## Documentation

Update the inventory and maintenance guide with:

- Email type.
- Variant.
- Audience.
- Language source.
- Renderer location.
- Transport location.
- Sender variable.
- Deployment path.
- Preview command.

Keep `supabase/auth-email-templates.md` synchronized with the approved Dashboard templates.

## Acceptance Criteria

- Every existing Ten10 email has an approved real-content preview.
- User and admin variants visibly belong to one brand family.
- Existing email content and behavior remain unchanged.
- No unapproved product option or link is added.
- All semantic-content regression tests pass.
- Every migrated renderer has RTL/LTR and escaping coverage.
- Remote-image fallback is readable.
- Reminder unsubscribe behavior remains unchanged.
- No additional redesign commit is pushed before preview approval.
- Auth templates are not changed in Dashboard before preview approval.
