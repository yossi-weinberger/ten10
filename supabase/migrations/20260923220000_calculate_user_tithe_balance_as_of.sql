begin;

create or replace function public.calculate_user_tithe_balance(
  p_user_id uuid,
  p_as_of_date date
)
returns table(
  total_balance double precision,
  maaser_balance double precision,
  chomesh_balance double precision
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_total double precision := 0;
  v_maaser double precision := 0;
  v_chomesh double precision := 0;
  rec record;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'Access denied';
  end if;

  if p_as_of_date is null then
    raise exception 'p_as_of_date is required';
  end if;

  for rec in
    select type, amount, is_chomesh
    from transactions
    where user_id = p_user_id
      and date <= p_as_of_date
  loop
    if rec.type = 'income' then
      v_maaser := v_maaser + (rec.amount * 0.1);
      if rec.is_chomesh then
        v_chomesh := v_chomesh + (rec.amount * 0.1);
      end if;
    elsif rec.type = 'donation' then
      if rec.is_chomesh then
        v_chomesh := v_chomesh - rec.amount;
      else
        v_maaser := v_maaser - rec.amount;
      end if;
    elsif rec.type = 'recognized-expense' then
      v_maaser := v_maaser - (rec.amount * 0.1);
      if rec.is_chomesh then
        v_chomesh := v_chomesh - (rec.amount * 0.1);
      end if;
    elsif rec.type = 'initial_balance' then
      if rec.is_chomesh then
        v_chomesh := v_chomesh + rec.amount;
      else
        v_maaser := v_maaser + rec.amount;
      end if;
    end if;
  end loop;

  v_total := v_maaser + v_chomesh;
  return query select v_total, v_maaser, v_chomesh;
end;
$function$;

comment on function public.calculate_user_tithe_balance(uuid, date) is
  'Tithe balance as of an inclusive civil date. Leaves the all-time one-argument signature unchanged.';

revoke execute on function public.calculate_user_tithe_balance(uuid, date)
  from public, anon, authenticated, service_role;

grant execute on function public.calculate_user_tithe_balance(uuid, date)
  to authenticated, service_role;

do $postconditions$
declare
  one_arg_oid oid;
  two_arg_oid oid;
begin
  one_arg_oid := to_regprocedure('public.calculate_user_tithe_balance(uuid)');
  two_arg_oid := to_regprocedure('public.calculate_user_tithe_balance(uuid, date)');

  if one_arg_oid is null then
    raise exception 'All-time tithe balance function is missing';
  end if;

  if two_arg_oid is null then
    raise exception 'As-of tithe balance function is missing';
  end if;

  if has_function_privilege('anon', two_arg_oid, 'EXECUTE') then
    raise exception 'anon can execute as-of tithe balance';
  end if;

  if not has_function_privilege('authenticated', two_arg_oid, 'EXECUTE') then
    raise exception 'authenticated cannot execute as-of tithe balance';
  end if;

  if not has_function_privilege('service_role', two_arg_oid, 'EXECUTE') then
    raise exception 'service_role cannot execute as-of tithe balance';
  end if;
end;
$postconditions$;

commit;
