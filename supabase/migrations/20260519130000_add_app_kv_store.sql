-- Minimal key-value store for daily stat snapshots (e.g. GitHub download counts).
-- Each row is one named metric; upserted daily by edge functions.

CREATE TABLE IF NOT EXISTS public.app_kv_store (
  key        TEXT        PRIMARY KEY,
  value_int  BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_kv_store ENABLE ROW LEVEL SECURITY;
-- No user-facing policy — accessed only via service_role from edge functions.
