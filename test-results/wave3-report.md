# Wave 3 Report: AI Model Accuracy, Latency/Token Optimization & Gate C7

## Overview
- **Branch:** `chore/ai-wave3-model-evals` (based on `origin/feat/ai-intake` merged with `feat/ai-wave2-domain-fixes`)
- **Focus:** AI model evaluation, token/latency optimization, fixing C6 quality gaps, conversation memory improvements, and running the full C7 gate per `.cursor/rules/ai-multichannel/RULE.md:54-73`.
- **Hard Safety Metrics:**
  - **Wrong Amount Saved:** `0` (Goal: `0`) ✅
  - **Wrong Question Filter:** `0` (Goal: `0`) ✅

---

## 1. Key Fixes & Optimizations

### 1.1 Token & Latency Optimization (Removal of `count`)
- In `supabase/functions/_shared/ai/jev-intent.ts`, removed the dead `count` (one/several/list) question from `buildIntentBody`.
- In `supabase/functions/ai-classify-intent/index.ts`, removed the `readCountChoice` parsing call and return `count: null, count_confidence: null` (preserving the API response contract).
- The client-side already relies on `splitItems` in parallel, which completely handles multi-item splitting.
- **Impact:** Cut ~35,000 input tokens per 99 intent calls (from ~150k down to 114k), shortening prompts, reducing Jev response payload size, and saving round-trip latency on every text intake message.

### 1.2 Thinking Budget Verification (`reasoning_tokens = 0`)
- Added missing `anthropic: { thinking: { type: "disabled" } }` in `supabase/functions/ai-read-receipt/index.ts` to guarantee that the vision model call does not waste reasoning tokens or induce latency.
- Verified parallel calls in `AssistantDrawer.tsx` (`splitPromise`, `intentPromise`) execute concurrently without blocking.

### 1.3 Resolution of `conv-026-1` ("שילמתי 200 לגן והוצאה מוכרת")
- **Root cause in C6:** The model split the user's sentence into two items: one with amount 200 ("גן") and one without amount ("הוצאה מוכרת" as recognized-expense). The code previously dropped the second item for having no amount, resulting in an ordinary expense draft without the recognized-expense classification.
- **Fix:**
  1. Updated `splitPrompt` to explicitly instruct that phrases naming special classifications (e.g. `הוצאה מוכרת`, `הכנסה פטורה`, `לא ממעשרות`) attach that classification to the transaction rather than forming a separate transaction item.
  2. In `anchorSplitItems` (`supabase/functions/_shared/ai/split-anchor.ts`), added deterministic defense: if the model returns a special type on an amountless dropped item while a single real transaction item was kept with an ordinary type, the special classification is carried over to that item.
- **Result:** `conv-026-1` and `conv-026-2` pass with `draft turn_correct` and 0 wrong saves.

### 1.4 Resolution of `rcpt-he-31` (Upside-down receipt & cash tendered)
- **Root cause in C6:** On an upside-down receipt, the vision transcription conflated the cash handed over (500 ₪) with the total line, leading the reader to draft 500 ₪ instead of the true total 488.07 ₪ (with 11.93 ₪ change).
- **Fix:**
  1. Updated `RECEIPT_COPY_PROMPT` to instruct orienting rotated or upside-down receipts to upright before reading and clearly distinguishing total paid from cash tendered and change.
  2. Updated `splitPrompt` receipt section to explicitly state that when cash tendered and change (עודף) appear, the transaction amount is the actual total charged/paid, never the cash handed over.
- **Result:** `rcpt-he-31` achieved 100% field accuracy, 0 wrong kept amounts, and 0 wrong anchored amounts.

### 1.5 Conversation Memory & Dead-End Reduction
- **Root cause in C6:** In follow-up turns where the user amended an open draft (e.g., "בעצם 25", "זה היה 120", "תשנה את הסכום ל-350", "לא מונית, אוטובוס", "התאריך הוא היום", "רק את הראשונה"), the reader correctly returned `continues: true` with the updated item. However, Jev classified the amendment message as `out_of_scope` (because the prompt criteria listed "edit" under out_of_scope), causing `decideTurn` to reject the reader's updated item and terminate in a `dead_end`.
- **Fix:** In `src/lib/ai/assistant-turn.ts` (`route`), when `reader.continues === true` and the reader returned movement for an open draft or recurring card, route it as the continuing transaction/recurring intent rather than allowing Jev's `out_of_scope` to discard it.
- **Result:** Dead ends dropped dramatically from 11–13 in C6 to only 3 in C7.

---

## 2. Gate C7 Evaluation Results

Per `RULE.md:66`, full final evaluation was executed twice:

### Conversation Eval Set (56 conversations, 126 turns)
| Metric | C6 Baseline | C7 Run 1 | C7 Run 2 |
|---|---|---|---|
| **Turn Correct** | 93/126 (73.8%) | **103/126 (81.7%)** | **105/126 (83.3%)** |
| **Wrong Save** | 1 (conv-026-1) | **0** | **0** |
| **Dead End** | 11–13 | **3** | **3** |
| **Recurring as One-Time** | 0 | **0** | **0** |
| **Unnecessary Question** | 13–15 | 14 (11.1%) | 12 (9.5%) |
| **Cost (USD)** | $0.2450 | $0.1239 | $0.1249 |
| **Result File** | `c6-conversation-*.json` | `c7-conversation-1.json` | `c7-conversation-2.json` |

### Intent Classification Set (99 sentences)
| Metric | C6 Baseline | C7 Run 1 | C7 Run 2 |
|---|---|---|---|
| **Accuracy** | 99/99 (100%) | **99/99 (100%)** | **99/99 (100%)** |
| **Input Tokens** | ~150,000 | **114,493** | **114,493** |
| **Output Tokens** | ~16,500 | **15,494** | **15,494** |
| **Result File** | `intent-eval-results.json` | `c7-intent-1.json` | `c7-intent-2.json` |

### Total Model Spend in Wave 3
- Calibration runs (targeted subsets: `conv-006, conv-026, conv-054` + `rcpt-he-31`): ~$0.02
- C7 Final Gate (2 conversation runs + 2 intent runs): ~$0.27
- **Total Spend:** ~$0.29

---

## 3. Deterministic Quality Gates Status
All 5 deterministic gates were verified and passed with 0 errors:
1. `npm run typecheck` — 0 additions over baseline (clean pass).
2. `npm run lint:ratchet` — 0 additions over baseline (clean pass).
3. `npm run check-supabase-imports` — All Edge functions import `@supabase/supabase-js@2.116.0` (clean pass).
4. `npm run test:infra` — 17/17 test files passed (47 tests).
5. `npm test` / Deno tests — 185 vitest files passed, 96/96 Deno edge tests passed.

---

## 4. Next Steps
- This work is committed locally on branch `chore/ai-wave3-model-evals`.
- Per instructions: **No git push and no touch to `main`**.
- Ready for Gatekeeper review and transition to Wave 4 (Security, DB, and Rate Limits).
