# Email System Future Improvements

This document tracks genuine follow-up work for reminder emails and the
unsubscribe system. Completed foundations are retained only where they clarify
the remaining backlog.

## Implemented on Branch (Deployment Pending)

- [x] Localized reminder subject, HTML, and plain-text bodies in Hebrew and
  English (locally verified)
- [x] Language selection from `profiles.client_preferences.language`, with
  Hebrew fallback (locally verified)
- [x] Dynamic RTL/LTR rendering (locally verified)
- [x] Twelve monthly encouragement entries per locale, selected using the
  current month in `Asia/Jerusalem` (locally verified)
- [x] Optional first-name greeting from `full_name` (locally verified)
- [x] Branded header asset with cream fallback (implemented locally)
- [x] Basic responsive, table-based reminder template (implemented locally)
- [x] Signed unsubscribe links
- [x] `List-Unsubscribe` and `List-Unsubscribe-Post` headers via SES Raw MIME

The legacy reminder pipeline remains operational in production. The localized
redesign items above are not production claims: the RPC migration, Edge
Function deployment, static asset deployment, and manual email/client
verification are still pending.

No separate profile language column is planned. The existing
`client_preferences.language` value is the source of truth.

## Localized Reminder Go/No-Go Gate

- Product approver: **pending**
- Rabbinic approver: **pending**
- Approval date: **pending**
- Production rollout is **forbidden until both approvers approve all 24
  localized encouragement items**.

The required safe order is: deploy the static header asset, apply the recipient
RPC migration, verify its return shape and privileges, deploy the Edge
Function, perform controlled sends, then consider production only after both
editorial approvals. Migration privilege verification and Gmail, Outlook, and
Apple Mail checks remain **pending**, so readiness remains conditional.

## Design and User Experience

### Email Client Compatibility

- [ ] Test reminder rendering in Gmail, Outlook, Apple Mail, and major mobile
  clients
- [ ] Verify accessibility, contrast, image blocking, and plain-text fallback
- [ ] Evaluate dark-mode behavior without compromising unsupported clients

### Unsubscribe Pages

- [ ] Improve brand alignment and responsive layout
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

- [ ] Localize other transactional emails, including contact and new-user
  summary emails
- [ ] Reuse the reminder copy approach where appropriate without coupling Edge
  Functions to frontend translation hooks
- [ ] Keep sender-specific templates and environment variables isolated

## Testing

### Automated

- [ ] Expand unit coverage for JWT creation and verification
- [ ] Expand template tests for escaping, locale direction, and fallbacks
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
