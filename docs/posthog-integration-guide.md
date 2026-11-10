# PostHog Integration Guide

This document describes how Ten10 integrates PostHog for session replay and analytics, with a focus on privacy and data masking.

## Configuration

PostHog is initialized in `src/lib/analytics/posthogClient.ts` with the following privacy settings:

- **Production only**: Analytics and session replay are enabled only on production hosts (ten10-app.com)
- **Preview mode**: On Vercel preview deployments, session replay is disabled and all events are dropped before reaching PostHog
- **Input masking**: All text inputs are masked by default (`maskAllInputs: true`)
- **Text selector masking**: Elements with `.ph-mask` class or `[data-ph-mask]` attribute have their text replaced with asterisks
- **Sensitive autocapture**: Elements with `.ph-sensitive` class suppress autocapture `$el_text`
- **No capture**: Elements with `.ph-no-capture` class are completely excluded from replay

## Masking Strategy

### Personal Content (Masked)

The following elements display personal user data and are masked in session replays:

| Element | Classes/Attributes | Location |
|---------|-------------------|----------|
| User message bubbles (text and voice transcript) | `ph-mask ph-sensitive data-ph-mask` | `AssistantThread.tsx` - `UserBubble` component |
| Greeting with user's name | `ph-mask ph-sensitive data-ph-mask` | `AssistantThread.tsx` - `EmptyTitle` (when `opening.name` is present) |
| Opening line with user data | `ph-mask ph-sensitive data-ph-mask` | `AssistantThread.tsx` - `EmptyDescription` (when `opening.line` is present) |
| Composer text input | `ph-mask ph-sensitive data-ph-mask` | `AssistantComposer.tsx` - `InputGroupTextarea` |
| Live voice transcript display | `ph-mask ph-sensitive data-ph-mask` | `AssistantComposer.tsx` - voice recording/transcribing container |
| Draft cards (all fields and values) | `ph-mask ph-sensitive data-ph-mask` | `DraftCard.tsx` - both read-only and editable Card components |
| Recurring draft cards | `ph-mask ph-sensitive data-ph-mask` | `RecurringDraftCard.tsx` - all Card instances |
| Multi-draft split lists | `ph-mask ph-sensitive data-ph-mask` | `MultiDraftList.tsx` - Card component |
| Data answers (totals, periods) | `ph-mask ph-sensitive data-ph-mask` | `DataAnswer.tsx` - `DataAnswer` Card |
| Balance answers | `ph-mask ph-sensitive data-ph-mask` | `DataAnswer.tsx` - `BalanceAnswerCard` |
| Standing orders list | `ph-mask ph-sensitive data-ph-mask` | `DataAnswer.tsx` - `StandingOrdersCard` |
| Clarification option buttons (user-derived names) | `ph-mask ph-sensitive data-ph-mask` | `DataAnswer.tsx` - `NameMissing` suggestion buttons |
| Receipt preview image | `ph-no-capture` | `AssistantThread.tsx` - receipt preview `<img>` |

### Static UI (Not Masked)

The following elements are static UI chrome and remain visible in session replays:

- Drawer header and assistant name/subtitle
- Static quick-action chips (when not derived from user data)
- Buttons, icons, and static labels
- Status messages and system notifications
- Empty state static descriptions

### Helper Constant

A shared constant `PH_SENSITIVE_PROPS` is defined in `src/lib/analytics/posthog-masking.ts`:

```typescript
export const PH_SENSITIVE_PROPS = {
  className: "ph-mask ph-sensitive",
  "data-ph-mask": "",
} as const;
```

This constant should be spread onto components that display personal content.

## Testing

Privacy masking behavior is tested in `src/components/ai-intake/AssistantShell.privacy.test.tsx`:

- Frame root is NOT masked
- Header and static elements are NOT masked
- User message bubbles ARE masked
- Draft cards ARE masked
- Receipt images have `ph-no-capture`
- Static quick-action chips are NOT masked

## URL Scrubbing

In addition to visual masking, all URL-valued properties are scrubbed to remove OAuth callback fragments and other sensitive data before events reach PostHog. This is handled by `scrubUrlProperties()` in `posthogClient.ts`.

## Error Filtering

Known benign browser errors (like ResizeObserver warnings) are filtered out before being sent to PostHog to reduce noise in error tracking.
