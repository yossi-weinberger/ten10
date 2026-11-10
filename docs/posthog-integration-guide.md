# PostHog Integration Guide

PostHog session replay masks personal content while keeping static UI visible. Configuration is in `src/lib/analytics/posthogClient.ts`.

## Masking Strategy

### Personal Content (Masked with `ph-mask ph-sensitive` + `data-ph-mask`)

| Element | Location |
|---------|----------|
| User message bubbles (text and voice) | `AssistantThread.tsx` |
| Greeting/opening line with user's name or data | `AssistantThread.tsx` |
| Composer text input and live voice transcript | `AssistantComposer.tsx` |
| Draft cards (all fields: amount, description, date) | `DraftCard.tsx`, `RecurringDraftCard.tsx`, `MultiDraftList.tsx` |
| Data answers (totals, periods, balance, standing orders) | `DataAnswer.tsx` |
| User questions and text | `RabbiCard.tsx`, `HalachaCard.tsx` (when shows user question) |
| Duplicate transaction rows (amounts, dates, descriptions) | `DuplicateScanCard.tsx` |
| Parsed rule names | `RuleCard.tsx` |
| User-derived clarification options and receipt details | `DataAnswer.tsx`, `TypeChoice.tsx` |
| Receipt preview image | `AssistantThread.tsx` (`ph-no-capture`) |

### Static UI (Not Masked)

Static UI remains visible: header, assistant name, static chips, buttons, icons, labels, and status messages.

### Helper

Use `PH_SENSITIVE_PROPS` from `src/lib/analytics/posthog-masking.ts` or apply `ph-mask ph-sensitive` + `data-ph-mask` directly. Merge with existing `className` via `cn()`.

## Configuration

- **Production only**: Analytics enabled only on ten10-app.com
- **Input masking**: All inputs masked by default (`maskAllInputs: true`)
- **URL scrubbing**: OAuth tokens removed from URLs before events reach PostHog
