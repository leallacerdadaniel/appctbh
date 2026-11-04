-- App CTBH: mensagem de aniversário, mostrada UMA vez por ano ao aluno.
-- A data vem de finance_counterparties.date_of_birth (site) e nunca vai para o app.
-- "Hoje" é sempre o dia em Belo Horizonte. Nascidos em 29/02 recebem em 28/02 nos anos não bissextos.
-- A mesma chamada confere e marca: o UPDATE só altera a linha uma vez por ano, então nem dois
-- aparelhos abertos ao mesmo tempo conseguem receber "true" duas vezes.
-- Pode rodar de novo sem problema.

alter table public.app_students
  add column if not exists birthday_greeted_year integer;

create or replace function public.app_claim_birthday(p_cp uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_year integer := extract(year from v_today)::integer;
  v_birth text;
  v_day text := to_char(v_today, 'MM-DD');
  v_rows integer;
begin
  select to_char(c.date_of_birth, 'MM-DD') into v_birth
  from public.finance_counterparties c
  where c.id = p_cp;

  if v_birth is null then
    return false;
  end if;

  -- 28/02 seguido de 01/03 = ano não bissexto.
  if not (v_birth = v_day
          or (v_birth = '02-29' and v_day = '02-28' and to_char(v_today + 1, 'MM-DD') = '03-01')) then
    return false;
  end if;

  update public.app_students
  set birthday_greeted_year = v_year
  where counterparty_id = p_cp
    and birthday_greeted_year is distinct from v_year;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.app_claim_birthday(uuid) from public, anon, authenticated;
grant execute on function public.app_claim_birthday(uuid) to service_role;
