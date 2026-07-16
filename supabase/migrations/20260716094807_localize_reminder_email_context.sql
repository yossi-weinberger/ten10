begin;

drop function if exists public.get_reminder_users_with_emails(integer);

create function public.get_reminder_users_with_emails(reminder_day integer)
returns table (
  id uuid,
  email varchar,
  reminder_enabled boolean,
  reminder_day_of_month integer,
  full_name text,
  language text
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
    end::text as language
  from public.profiles p
  join auth.users u on p.id = u.id
  where p.reminder_enabled = true
    and p.reminder_day_of_month = reminder_day
    and coalesce(p.mailing_list_consent, false) = true
    and u.email is not null;
end;
$function$;

comment on function public.get_reminder_users_with_emails(integer) is
  'Returns consented reminder recipients with normalized language and profile name; callable by service_role only.';

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

commit;
