-- rollback_20260121.sql
ALTER TABLE transactions 
DROP COLUMN IF EXISTS original_amount,
DROP COLUMN IF EXISTS original_currency,
DROP COLUMN IF EXISTS conversion_rate,
DROP COLUMN IF EXISTS conversion_date,
DROP COLUMN IF EXISTS rate_source;

ALTER TABLE profiles 
DROP COLUMN IF EXISTS default_currency;
