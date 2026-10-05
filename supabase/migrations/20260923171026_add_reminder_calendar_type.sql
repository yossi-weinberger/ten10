begin;

alter table public.profiles
  add column if not exists reminder_calendar_type text not null default 'gregorian';

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_reminder_calendar_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_reminder_calendar_type_check
      check (reminder_calendar_type in ('gregorian', 'hebrew'));
  end if;
end;
$constraints$;

create or replace function public.get_reminder_users_with_emails(
  reminder_day integer,
  reminder_calendar text
)
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
security invoker
set search_path = ''
as $function$
  select
    recipients.id,
    recipients.email,
    recipients.reminder_enabled,
    recipients.reminder_day_of_month,
    recipients.full_name,
    recipients.language,
    recipients.default_currency
  from public.get_reminder_users_with_emails($1) as recipients
  join public.profiles as profile
    on profile.id = recipients.id
  where profile.reminder_calendar_type = $2
    and $2 in ('gregorian', 'hebrew');
$function$;

comment on function public.get_reminder_users_with_emails(integer, text) is
  'Filters the existing service-role reminder recipient RPC by reminder calendar without changing its deployed one-argument signature.';

revoke all on function public.get_reminder_users_with_emails(integer, text)
  from public, anon, authenticated;
grant execute on function public.get_reminder_users_with_emails(integer, text)
  to service_role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.get_reminder_users_with_emails(integer, text)',
    'execute'
  ) then
    raise exception 'anon still has EXECUTE on the filtered reminder recipient RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.get_reminder_users_with_emails(integer, text)',
    'execute'
  ) then
    raise exception 'authenticated still has EXECUTE on the filtered reminder recipient RPC';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.get_reminder_users_with_emails(integer, text)',
    'execute'
  ) then
    raise exception 'service_role lacks EXECUTE on the filtered reminder recipient RPC';
  end if;
end;
$$;

commit;
