begin;

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
    and coalesce(p.mailing_list_consent, false) = true
    and u.email is not null;
$function$;

comment on function public.get_all_reminder_users_with_emails() is
  'All consented reminder recipients, used for the annual maaser-year close email. Service role only.';

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
