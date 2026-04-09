-- Normalize predefined category labels to stable English keys in both
-- transactions and recurring_transactions tables.
-- Hebrew and English known labels are remapped; all other values are left
-- unchanged (they are treated as custom categories).
--
-- Idempotent: running twice has no effect because the WHEN clauses only
-- match the old localized labels, not the already-normalized keys.
--
-- Note: donation transactions do not support categories (they use the
-- recipient field instead), so no donation keys are included here.

-- ─── transactions ───────────────────────────────────────────────────────────

UPDATE transactions
SET category = CASE
  -- income
  WHEN category IN ('Salary', 'משכורת')          THEN 'salary'
  WHEN category IN ('Business', 'עסק')             THEN 'business'
  WHEN category IN ('Freelance', 'עבודה עצמאית')  THEN 'freelance'
  WHEN category IN ('Investment', 'השקעות')        THEN 'investment'
  WHEN category IN ('Allowance', 'קצבאות')         THEN 'allowance'
  WHEN category IN ('Gift', 'מתנה')               THEN 'gift'
  -- expense
  WHEN category IN ('Food', 'מזון')               THEN 'food'
  WHEN category IN ('Transportation', 'תחבורה')   THEN 'transportation'
  WHEN category IN ('Housing', 'דיור')            THEN 'housing'
  WHEN category IN ('Utilities', 'שירותים')       THEN 'utilities'
  WHEN category IN ('Healthcare', 'בריאות')       THEN 'healthcare'
  WHEN category IN ('Education', 'חינוך')         THEN 'education'
  WHEN category IN ('Leisure', 'פנאי')            THEN 'leisure'
  WHEN category IN ('Shopping', 'קניות')          THEN 'shopping'
  -- shared
  WHEN category IN ('Other', 'אחר')               THEN 'other'
  ELSE category
END
WHERE category IS NOT NULL;

-- ─── recurring_transactions ─────────────────────────────────────────────────

UPDATE recurring_transactions
SET category = CASE
  -- income
  WHEN category IN ('Salary', 'משכורת')          THEN 'salary'
  WHEN category IN ('Business', 'עסק')             THEN 'business'
  WHEN category IN ('Freelance', 'עבודה עצמאית')  THEN 'freelance'
  WHEN category IN ('Investment', 'השקעות')        THEN 'investment'
  WHEN category IN ('Allowance', 'קצבאות')         THEN 'allowance'
  WHEN category IN ('Gift', 'מתנה')               THEN 'gift'
  -- expense
  WHEN category IN ('Food', 'מזון')               THEN 'food'
  WHEN category IN ('Transportation', 'תחבורה')   THEN 'transportation'
  WHEN category IN ('Housing', 'דיור')            THEN 'housing'
  WHEN category IN ('Utilities', 'שירותים')       THEN 'utilities'
  WHEN category IN ('Healthcare', 'בריאות')       THEN 'healthcare'
  WHEN category IN ('Education', 'חינוך')         THEN 'education'
  WHEN category IN ('Leisure', 'פנאי')            THEN 'leisure'
  WHEN category IN ('Shopping', 'קניות')          THEN 'shopping'
  -- shared
  WHEN category IN ('Other', 'אחר')               THEN 'other'
  ELSE category
END
WHERE category IS NOT NULL;
