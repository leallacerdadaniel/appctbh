-- App CTBH: contrato que CONTINUA outro para os mesmos alunos (caso da Chada e do Jorge em 2027/1).
-- O contrato com a Tiana (jan–abr) é o que o app usa; o contrato só dos dois (maio) fica fora do app
-- (app_settings.excluded_rental_ids), mas os dados dele entram na visão dos alunos que estão nos dois:
-- caução aberta (não a "devolvida" do primeiro), aluguel de jan a mai, saída em 31/05 e todas as faxinas.
-- Colegas, despesas, aluguel mostrado e PDF continuam sendo os do contrato principal.
-- Pode rodar de novo sem problema.

create table if not exists public.app_rental_continuations (
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  continues_rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  note text,
  primary key (rental_id, continues_rental_id),
  check (rental_id <> continues_rental_id)
);
alter table public.app_rental_continuations enable row level security;

insert into public.app_rental_continuations (rental_id, continues_rental_id, note)
values ('06765874-ecb2-4afe-b125-1bb3d0201cd4', 'a0fc408d-7cc5-4f69-b9cc-3148bc2e9f83',
        'Apto Caio 2027/1: Chada, Tiana e Jorge (jan–abr) → Chada e Jorge (maio)')
on conflict do nothing;

-- Contratos que valem para o aluno: o principal + as continuações em que ele também é inquilino ativo.
create or replace function public.app_rentals_for(p_cp uuid)
returns uuid[]
language sql stable security definer set search_path = public
as $$
  select case when public.app_rental_for(p_cp) is null then null else
    array[public.app_rental_for(p_cp)] || coalesce(array(
      select c.continues_rental_id
      from public.app_rental_continuations c
      join public.rental_tenants t on t.rental_id = c.continues_rental_id
                                  and t.counterparty_id = p_cp and t.is_active
      where c.rental_id = public.app_rental_for(p_cp)), '{}')
  end;
$$;
revoke all on function public.app_rentals_for(uuid) from public, anon, authenticated;
grant execute on function public.app_rentals_for(uuid) to service_role;

-- app_home_for: igual a 20261029_app_payments.sql, mas saída, faxinas, aluguel e caução olham
-- todos os contratos do aluno (app_rentals_for).
create or replace function public.app_home_for(p_cp uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_rental uuid := public.app_rental_for(p_cp);
  v_rentals uuid[] := public.app_rentals_for(p_cp);
  result jsonb;
begin
  if v_rental is null then
    return null;
  end if;

  select jsonb_build_object(
    'student', (select jsonb_build_object('name', coalesce(nullif(trim(s.display_name), ''), c.name), 'email', c.email)
                from public.finance_counterparties c
                left join public.app_students s on s.counterparty_id = c.id
                where c.id = p_cp),
    'must_change_password', (select must_change_password from public.app_students where counterparty_id = p_cp),
    'apartment', jsonb_build_object(
      'title', a.title, 'location', a.location, 'address_complement', a.address_complement,
      'latitude', a.latitude, 'longitude', a.longitude,
      'photo', a.card_image_url
    ),
    'rental', jsonb_build_object(
      'name', r.nickname,
      'semester', r.semester, 'start_date', r.start_date,
      -- fim do último contrato do aluno (com continuação, é o fim dela)
      'end_date', (select max(x.end_date) from public.apartment_rentals x where x.id = any(v_rentals)),
      'cleaning_day', r.cleaning_day, 'cleaning_frequency', r.cleaning_frequency,
      'cleaning_time', r.cleaning_time,
      'currency', case when r.contract_type = 'commission_eur' then 'EUR' else 'BRL' end,
      'contract_rent', case when r.contract_type = 'commission_eur' then r.contract_value_eur else r.monthly_rent end,
      'has_contract', exists (select 1 from public.rental_contracts k
                              where k.rental_id = r.id and k.file_path is not null)
    ),
    'tenant', (select jsonb_build_object('move_in_date', min(t.move_in_date), 'move_out_date', max(t.move_out_date),
                                         'rent', (array_agg(t.individual_rent) filter (where t.rental_id = r.id))[1])
               from public.rental_tenants t
               where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp and t.is_active
               having count(*) > 0),
    'info', (select to_jsonb(i) - 'updated_by' - 'updated_at'
             from public.app_apartment_info i where i.apartment_id = a.id),
    'roommates', coalesce((select jsonb_agg(coalesce(nullif(trim(s.display_name), ''), c.name)
                                            order by coalesce(nullif(trim(s.display_name), ''), c.name))
                           from public.rental_tenants t
                           join public.finance_counterparties c on c.id = t.counterparty_id
                           left join public.app_students s on s.counterparty_id = t.counterparty_id
                           where t.rental_id = r.id and t.is_active and t.counterparty_id <> p_cp), '[]'::jsonb),
    'cleanings', coalesce((select jsonb_agg(jsonb_build_object(
                              'id', k.id,
                              'date', k.scheduled_date, 'time', k.scheduled_time,
                              'completed', k.completed, 'completed_at', k.completed_at,
                              'feedback_until', greatest(k.scheduled_date, (k.completed_at at time zone 'America/Sao_Paulo')::date) + 7,
                              'feedback', (select jsonb_build_object('rating', f.rating, 'comment', f.comment)
                                           from public.app_cleaning_feedback f
                                           where f.cleaning_id = k.id and f.counterparty_id = p_cp))
                            order by k.scheduled_date)
                           from public.cleaning_records k where k.rental_id = any(v_rentals)), '[]'::jsonb),
    -- Aluguel do próprio aluno, um item por mês: só a situação (o valor não vai para o app).
    -- Se o mês tiver mais de uma linha, só conta como pago quando todas estiverem pagas.
    'payments', coalesce((select jsonb_agg(jsonb_build_object('month', m.month_year, 'paid', m.paid) order by m.month_year)
                          from (select p.month_year, bool_and(p.status = 'paid') as paid
                                from public.student_payments p
                                join public.rental_tenants t on t.id = p.tenant_id
                                where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp
                                  and coalesce(lower(p.payment_type), 'rent') = 'rent'
                                group by p.month_year) m), '[]'::jsonb),
    -- Caução do aluno (a do proprietário, deposit_type = 'owner', fica de fora).
    -- amount = Restante, como no site: valor − deduções (security_deposit_deductions).
    -- Com continuação, vale a caução ainda aberta (a do primeiro contrato aparece como devolvida no site).
    'deposit', (select jsonb_build_object('amount', d.amount - coalesce((select sum(x.amount)
                                                                          from public.security_deposit_deductions x
                                                                          where x.deposit_id = d.id), 0),
                                          'currency', d.currency,
                                          'status', d.status, 'returned_date', d.returned_date)
                from public.security_deposits d
                where d.rental_id = any(v_rentals) and d.counterparty_id = p_cp
                  and coalesce(d.deposit_type, 'student') <> 'owner'
                order by (d.status = 'returned'), d.created_at desc
                limit 1)
  )
  into result
  from public.apartment_rentals r
  join public.apartments a on a.id = r.apartment_id
  where r.id = v_rental;

  return result;
end;
$$;

revoke all on function public.app_home_for(uuid) from public, anon, authenticated;
grant execute on function public.app_home_for(uuid) to service_role;
