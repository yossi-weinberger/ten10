-- Record what the user did with a measured draft. Auto-save stays off.
-- An edit after save is visible on transactions.updated_at, not written here.

CREATE OR REPLACE FUNCTION ai.record_intake_outcome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF NEW.status = 'committed' AND OLD.status IS DISTINCT FROM 'committed' THEN
    NEW.quality_signals := coalesce(NEW.quality_signals, '{}'::jsonb)
      || jsonb_build_object('outcome', 'approved');
  ELSIF NEW.status = 'reverted' AND OLD.status IS DISTINCT FROM 'reverted' THEN
    NEW.quality_signals := coalesce(NEW.quality_signals, '{}'::jsonb)
      || jsonb_build_object('outcome', 'reverted');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS record_intake_outcome ON ai.intake_items;

CREATE TRIGGER record_intake_outcome
BEFORE UPDATE OF status ON ai.intake_items
FOR EACH ROW
EXECUTE FUNCTION ai.record_intake_outcome();

REVOKE ALL ON FUNCTION ai.record_intake_outcome() FROM PUBLIC, anon, authenticated;
