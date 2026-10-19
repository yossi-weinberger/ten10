begin;

-- (A) Decouple reminders from marketing consent
-- Remove mailing_list_consent filter from get_reminder_users_with_emails(integer)
-- to allow reminder emails regardless of marketing consent status.

drop function if exists public.get_reminder_users_with_emails(integer);

create function public.get_reminder_users_with_emails(reminder_day integer)
returns table (
  id uuid,
  email varchar,
  reminder_enabled boolean,
  reminder_day_of_month integer,
  full_name text,
  language text,
  default_currency text
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
  select
    p.id,
    u.email::varchar,
    p.reminder_enabled,
    p.reminder_day_of_month,
    p.full_name,
    case
      when p.client_preferences->>'language' = 'en' then 'en'
      else 'he'
    end::text as language,
    coalesce(nullif(upper(trim(p.default_currency)), ''), 'ILS')::text as default_currency
  from public.profiles p
  join auth.users u on p.id = u.id
  where p.reminder_enabled = true
    and p.reminder_day_of_month = reminder_day
    and u.email is not null;
end;
$function$;

comment on function public.get_reminder_users_with_emails(integer) is
  'Returns reminder recipients with language, name, and default currency; callable by service_role only. Marketing consent no longer required.';

revoke all on function public.get_reminder_users_with_emails(integer)
  from public, anon, authenticated;
grant execute on function public.get_reminder_users_with_emails(integer)
  to service_role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.get_reminder_users_with_emails(integer)',
    'execute'
  ) then
    raise exception 'anon still has EXECUTE on get_reminder_users_with_emails';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.get_reminder_users_with_emails(integer)',
    'execute'
  ) then
    raise exception 'authenticated still has EXECUTE on get_reminder_users_with_emails';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.get_reminder_users_with_emails(integer)',
    'execute'
  ) then
    raise exception 'service_role lacks EXECUTE on get_reminder_users_with_emails';
  end if;
end;
$$;

-- (B) Persist signup checkbox when email confirmation is required
-- Add mailing_list_consent to handle_new_user() trigger function
-- to capture consent during signup, even before email confirmation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  insert into public.profiles (id, full_name, avatar_url, mailing_list_consent)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    coalesce((NEW.raw_user_meta_data->>'mailing_list_consent') = 'true', false)
  );
  return NEW;
end;
$function$;

comment on function public.handle_new_user() is
  'Trigger function to create profile on user signup, capturing full_name, avatar_url, and mailing_list_consent from metadata.';

-- (C) Decouple annual maaser-year email from marketing consent
-- Remove mailing_list_consent filter from get_all_reminder_users_with_emails()
-- to allow yearly reminder emails regardless of marketing consent status.

create or replace function public.get_all_reminder_users_with_emails()
returns table (
  id uuid,
  email varchar,
  reminder_enabled boolean,
  reminder_day_of_month integer,
  full_name text,
  language text,
  default_currency text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    p.id,
    u.email::varchar,
    p.reminder_enabled,
    p.reminder_day_of_month,
    p.full_name,
    case
      when p.client_preferences->>'language' = 'en' then 'en'
      else 'he'
    end::text as language,
    coalesce(nullif(upper(trim(p.default_currency)), ''), 'ILS')::text as default_currency
  from public.profiles p
  join auth.users u on p.id = u.id
  where p.reminder_enabled = true
    and u.email is not null;
$function$;

comment on function public.get_all_reminder_users_with_emails() is
  'All reminder recipients for annual maaser-year email. Service role only. Marketing consent no longer required.';

revoke all on function public.get_all_reminder_users_with_emails()
  from public, anon, authenticated;
grant execute on function public.get_all_reminder_users_with_emails()
  to service_role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.get_all_reminder_users_with_emails()',
    'execute'
  ) then
    raise exception 'anon still has EXECUTE on get_all_reminder_users_with_emails';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.get_all_reminder_users_with_emails()',
    'execute'
  ) then
    raise exception 'authenticated still has EXECUTE on get_all_reminder_users_with_emails';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.get_all_reminder_users_with_emails()',
    'execute'
  ) then
    raise exception 'service_role lacks EXECUTE on get_all_reminder_users_with_emails';
  end if;
end;
$$;

commit;
