ALTER TABLE ai.model_calls DROP CONSTRAINT IF EXISTS model_calls_operation_check;
ALTER TABLE ai.model_calls ADD CONSTRAINT model_calls_operation_check CHECK (operation IN (
  'intent', 'question_slots', 'receipt', 'speech', 'duplicates', 'shadow'
));
