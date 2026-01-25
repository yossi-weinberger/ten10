-- הוספת עמודות ל-transactions (בטוח: הכל nullable)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC,
ADD COLUMN IF NOT EXISTS conversion_date DATE,
ADD COLUMN IF NOT EXISTS rate_source VARCHAR(10);

-- הוספת עמודה ל-profiles (בטוח: עם DEFAULT)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'ILS';
