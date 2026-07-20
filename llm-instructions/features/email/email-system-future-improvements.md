# Email System Future Improvements

This document tracks genuine follow-up work for reminder emails and the
unsubscribe system. Completed foundations are retained only where they clarify
the remaining backlog.

## Deployed on Production (PR #347)

- [x] Localized reminder subject, HTML, and plain-text bodies in Hebrew and
  English
- [x] Language selection from `profiles.client_preferences.language`, with
  Hebrew fallback
- [x] Dynamic RTL/LTR rendering
- [x] Twelve monthly encouragement entries per locale, selected using the
  current month in `Asia/Jerusalem`
- [x] Optional first-name greeting from `full_name`
- [x] Branded header asset with cream fallback
  (`/email/reminder-header-blur.png`)
- [x] Shared user/admin email shells + tokens (`email-tokens`,
  `email-layout-user`, `email-layout-admin`, `email-admin-primitives`)
- [x] Dynamic tithe balance currency from `profiles.default_currency`
- [x] Admin restyle for contact, daily summary, and cron alerts
- [x] Signed unsubscribe links
- [x] `List-Unsubscribe` and `List-Unsubscribe-Post` headers via SES Raw MIME

No separate profile language column is planned. The existing
`client_preferences.language` value is the source of truth.

## Architecture invariants (do not regress)

Verified against current code — keep these true unless an intentional migration
lands with tests:

1. **Two SES classes**: reminder
   (`send-reminder-emails/simple-email-service.ts`) vs shared
   (`_shared/simple-email-service.ts`). Reminder has List-Unsubscribe +
   `foldBase64` (76 / line ≤ 998). Shared has neither today — do not claim
   shared MIME is folded.
2. **Reminder copy is Edge-local** (`locales/email-*.json`). Never pull
   `public/locales` / i18next into the reminder Edge Function.
3. **`_shared/email-*` changes redeploy impact** multiple functions
   (reminders, contact, cron, new-user, download).
4. **Unsubscribe `type` resolution**: JWT → body → default `"all"`
   (`verify-unsubscribe-token`).
5. **RPC return-shape changes** for `get_reminder_users_with_emails`: DROP +
   CREATE + restore grants/assertions (not `CREATE OR REPLACE`).

Full narrative: `email-reminders-feature-complete-guide.md` § Architecture
invariants and `email-unsubscribe-system-guide.md`.

## Remaining Manual / Editorial

- [ ] Controlled visual checks in Gmail, Outlook, Apple Mail (and image-blocked)
- [ ] Copy Auth templates from `supabase/auth-email-templates.md` into the
  Supabase Dashboard (not CI-deployed)
- [ ] Formal product/rabbinic sign-off on the 24 encouragement strings, if
  still required by process (code is already live)

## Design and User Experience

### Email Client Compatibility

- [ ] Test reminder rendering in Gmail, Outlook, Apple Mail, and major mobile
  clients
- [ ] Verify accessibility, contrast, image blocking, and plain-text fallback
- [ ] Evaluate dark-mode behavior without compromising unsupported clients

### Unsubscribe Pages

- [ ] Offer preference changes or reduced frequency before full unsubscribe
- [ ] Add an optional cancellation feedback form
- [ ] Improve success and error messages

### Unsubscribe Localization

- [ ] Include language in the unsubscribe token or derive it safely
- [ ] Localize response pages, errors, and controls in Hebrew and English
- [ ] Apply RTL/LTR direction automatically

## Analytics and Monitoring

### Delivery and Engagement

- [ ] Track delivery, bounce, and complaint rates
- [ ] Track unsubscribe rates
- [ ] Evaluate privacy-conscious open and click tracking
- [ ] Measure return-to-application conversions from reminder emails
- [ ] Add dashboards and alerts for meaningful changes

### Operational Monitoring

- [ ] Alert on Edge Function failures and sustained SES delivery issues
- [ ] Monitor reminder run logs and database performance
- [ ] Define retention for email and unsubscribe audit data

## Security and Compliance

- [ ] Add rate limiting for unsubscribe requests where needed
- [ ] Add audit logging without retaining unnecessary personal data
- [ ] Detect suspicious automated unsubscribe activity
- [ ] Review GDPR and CAN-SPAM documentation and retention requirements

## Email Content and Scheduling

### Content Experiments

- [ ] Add A/B testing only after analytics can measure outcomes
- [ ] Evaluate activity-based recommendations and relevant educational content
- [ ] Keep personalized content deterministic and reviewable

### Scheduling

- [ ] Support user-specific send times and time zones
- [ ] Evaluate weekly, biweekly, and snooze options
- [ ] Preserve explicit opt-in and opt-out behavior for every frequency

## Broader Email Localization

- [x] Shared admin/user design system applied to contact, daily summary, cron,
  and download emails (English ops copy for admin; contact already HE/EN by
  channel)
- [ ] Further localize remaining admin/ops copy where product wants Hebrew
- [ ] Keep sender-specific templates and environment variables isolated

## Testing

### Automated

- [x] Shared layout/token contracts + reminder/contact/cron/download/daily
  summary template tests and local HTML preview harness
- [ ] Expand unit coverage for JWT creation and verification
- [ ] Add integration coverage for recipient RPC, MIME generation, and
  unsubscribe behavior

### Manual

- [ ] Test the full reminder-to-unsubscribe flow in both locales
- [ ] Test invalid, expired, and replayed unsubscribe tokens
- [ ] Verify email client rendering and accessibility

## Longer-Term Ideas

- [ ] SMS reminders with explicit consent management
- [ ] PWA or native push notifications
- [ ] AI-assisted content only with editorial controls and measurable value
- [ ] Educational email series based on reviewed halachic sources

## Priorities

### High

1. Unsubscribe page improvements and localization
2. Analytics and operational alerting
3. Cross-client rendering and accessibility testing

### Medium

4. Broader transactional-email localization
5. Security audit logging and rate limiting
6. A/B testing after measurement infrastructure exists

### Low

7. Flexible scheduling and additional channels
8. Advanced personalization and educational series
