-- 005 (produção) / 028 (appctbh): lembretes automáticos (27/11/2026, pedido do Daniel: "conferir que tem uma
-- notificação push pros clientes [da faxina], e a mesma coisa do pagamento, 5, 3 e 1 dia antes").
-- Viram avisos em app_notices: caem no sino e, para quem tem o app instalado com notificações, viram push pelo
-- gatilho da 022 (app-push). Cada lembrete sai uma vez só (app_reminders_sent). Só para contas ativas, com senha e
-- com locação na janela do app.
--   aluguel: 5, 3 e 1 dia antes do dia 5, se a mensalidade do mês ainda não está paga — todo dia às 10h de BH;
--   faxina:  na véspera, com o horário — todo dia às 18h de BH.

begin;

create table if not exists public.app_reminders_sent (
  kind text not null check (kind in ('rent', 'cleaning')),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (kind, counterparty_id, ref)
);
alter table public.app_reminders_sent enable row level security;
revoke all on public.app_reminders_sent from public, anon, authenticated;

-- p_today: só para testar outro dia; o agendamento usa hoje em BH.
create or replace function public.app_send_reminders(p_kind text, p_today date default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Sao_Paulo')::date);
  v_count integer := 0;
  v_fr text;
  v_en text;
  v_month_fr text[] := array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  v_month_en text[] := array['January','February','March','April','May','June','July','August','September','October','November','December'];
  r record;
begin
  if p_kind = 'rent' then
    for r in
      select s.counterparty_id as cp, n.days, (v_today + n.days) as due
      from public.app_students s
      cross join (values (5), (3), (1)) as n(days)
      where s.status = 'active' and s.deleted_at is null and s.password_hash is not null
        and extract(day from v_today + n.days) = 5
        and public.app_rental_for(s.counterparty_id) is not null
        and exists (
          select 1
          from public.student_payments p
          join public.rental_tenants t on t.id = p.tenant_id
          where t.counterparty_id = s.counterparty_id and t.is_active
            and t.rental_id = any (public.app_rentals_for(s.counterparty_id))
            and p.month_year = date_trunc('month', v_today + n.days)::date
            and coalesce(p.status, '') <> 'paid'
            and coalesce(lower(p.payment_type), 'rent') = 'rent')
    loop
      insert into public.app_reminders_sent (kind, counterparty_id, ref)
      values ('rent', r.cp, to_char(r.due, 'YYYY-MM') || ':' || r.days)
      on conflict do nothing;
      continue when not found;
      v_fr := case when extract(month from r.due)::int in (4, 8, 10) then 'd’' else 'de ' end
              || v_month_fr[extract(month from r.due)::int];
      v_en := v_month_en[extract(month from r.due)::int];
      insert into public.app_notices (audience, counterparty_id, title, body, href)
      values ('student', r.cp,
        jsonb_build_object(
          'fr', 'Loyer ' || v_fr || ' : ' || case when r.days = 1 then 'demain' else 'dans ' || r.days || ' jours' end,
          'en', v_en || ' rent: due ' || case when r.days = 1 then 'tomorrow' else 'in ' || r.days || ' days' end),
        jsonb_build_object(
          'fr', 'À payer avant le 5 ' || v_month_fr[extract(month from r.due)::int] || '. Pix et virement dans Séjour › Paiements.',
          'en', 'Due by ' || v_en || ' 5. Pix and bank details in My stay › Payments.'),
        '/apartment/payments');
      v_count := v_count + 1;
    end loop;

  elsif p_kind = 'cleaning' then
    for r in
      select distinct s.counterparty_id as cp, k.id as cleaning_id,
        coalesce(k.scheduled_time,
                 case when ar.cleaning_time ~ '^\d{1,2}:\d{2}$' then ar.cleaning_time::time end) as at_time
      from public.app_students s
      join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
      join public.cleaning_records k on k.rental_id = t.rental_id
      join public.apartment_rentals ar on ar.id = k.rental_id
      where s.status = 'active' and s.deleted_at is null and s.password_hash is not null
        and k.scheduled_date = v_today + 1 and not coalesce(k.completed, false)
        and t.rental_id = any (public.app_rentals_for(s.counterparty_id))
    loop
      insert into public.app_reminders_sent (kind, counterparty_id, ref)
      values ('cleaning', r.cp, r.cleaning_id::text)
      on conflict do nothing;
      continue when not found;
      insert into public.app_notices (audience, counterparty_id, title, body, href)
      values ('student', r.cp,
        jsonb_build_object(
          'fr', 'Ménage demain' || coalesce(' à ' || extract(hour from r.at_time)::int || 'h' || to_char(r.at_time, 'MI'), ''),
          'en', 'Cleaning tomorrow' || coalesce(' at ' || ((extract(hour from r.at_time)::int + 11) % 12 + 1) || ':'
                || to_char(r.at_time, 'MI') || case when extract(hour from r.at_time) < 12 then ' AM' else ' PM' end, '')),
        jsonb_build_object(
          'fr', 'Pensez à laisser l’accès libre aux pièces à nettoyer.',
          'en', 'Remember to leave the rooms to clean accessible.'),
        '/apartment/cleaning');
      v_count := v_count + 1;
    end loop;
  end if;
  return v_count;
end;
$$;
revoke all on function public.app_send_reminders(text, date) from public, anon, authenticated;

-- 10h e 18h de BH (13h e 21h UTC).
select cron.unschedule(jobid) from cron.job where jobname in ('app-reminders-rent', 'app-reminders-cleaning');
select cron.schedule('app-reminders-rent', '0 13 * * *', 'select public.app_send_reminders(''rent'')');
select cron.schedule('app-reminders-cleaning', '0 21 * * *', 'select public.app_send_reminders(''cleaning'')');

commit;
