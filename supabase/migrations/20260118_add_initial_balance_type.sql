CREATE OR REPLACE FUNCTION calculate_user_tithe_balance(p_user_id UUID)
RETURNS double precision AS $$
DECLARE
    tithe_balance double precision := 0;
    rec RECORD;
BEGIN
    FOR rec IN SELECT type, amount, is_chomesh
               FROM transactions
               WHERE user_id = p_user_id
    LOOP
        IF rec.type = 'income' THEN
            tithe_balance := tithe_balance + (rec.amount * (CASE WHEN rec.is_chomesh THEN 0.2 ELSE 0.1 END));
        ELSIF rec.type = 'donation' THEN
            tithe_balance := tithe_balance - rec.amount;
        ELSIF rec.type = 'recognized-expense' THEN
            tithe_balance := tithe_balance - (rec.amount * 0.1);
        ELSIF rec.type = 'initial_balance' THEN
            tithe_balance := tithe_balance + rec.amount;
        END IF;
    END LOOP;
    RETURN tithe_balance;
END;
$$ LANGUAGE plpgsql;
