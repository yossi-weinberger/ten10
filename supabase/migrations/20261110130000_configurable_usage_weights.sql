-- Configurable AI usage weights: move hardcoded weights to a table for runtime configuration.
-- The usage_weight function keeps its signature and falls back to the current hardcoded values if a row is missing.

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Table: public.ai_usage_weights
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_usage_weights (
  kind text PRIMARY KEY,
  units integer NOT NULL CHECK (units >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS enabled, no access for anon/authenticated, service_role only
ALTER TABLE public.ai_usage_weights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage_weights FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_usage_weights TO service_role;

-- Trigger for updated_at
CREATE TRIGGER handle_ai_usage_weights_updated_at
  BEFORE UPDATE ON public.ai_usage_weights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Seed with current hardcoded values
INSERT INTO public.ai_usage_weights (kind, units) VALUES
  ('receipt', 5),
  ('speech', 3),
  ('text', 1);

-- ---------------------------------------------------------------------------
-- Replace ai.usage_weight to read from the table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai.usage_weight(p_kind text) RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT COALESCE(
    (SELECT units FROM public.ai_usage_weights WHERE kind = p_kind),
    CASE p_kind WHEN 'receipt' THEN 5 WHEN 'speech' THEN 3 WHEN 'text' THEN 1 END
  );
$$;

-- Permissions unchanged: already REVOKE ALL in the base migration
