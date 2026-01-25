-- Add currency conversion columns to recurring_transactions table
ALTER TABLE recurring_transactions
ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
ADD COLUMN IF NOT EXISTS original_currency TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC,
ADD COLUMN IF NOT EXISTS conversion_date DATE,
ADD COLUMN IF NOT EXISTS rate_source TEXT;
