-- First-touch growth attribution captured at signup (web).
-- Nullable; a missing or invalid code must never block account creation.
-- Does not change RLS or auth settings. Does not replace handle_new_user().

begin;

alter table public.profiles
  add column if not exists arrival_code text,
  add column if not exists signup_utm jsonb,
  add column if not exists arrival_code_set_at timestamptz;

comment on column public.profiles.arrival_code is
  'First-touch growth attribution code (e.g. MACHON). Set once at signup when present.';

comment on column public.profiles.signup_utm is
  'First-touch UTM bag captured at signup: {utm_source, utm_medium, utm_campaign}.';

comment on column public.profiles.arrival_code_set_at is
  'When arrival_code was first persisted on the profile.';

commit;
