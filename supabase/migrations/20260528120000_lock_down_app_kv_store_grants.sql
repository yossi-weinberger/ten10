-- app_kv_store is internal edge-function storage (GitHub download snapshot).
-- Accessed only via service_role in send-new-user-email.
-- No client or anon access; explicit grants for Data API hardening (Oct 2026).

REVOKE ALL ON TABLE public.app_kv_store FROM PUBLIC;
REVOKE ALL ON TABLE public.app_kv_store FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_kv_store TO service_role;
