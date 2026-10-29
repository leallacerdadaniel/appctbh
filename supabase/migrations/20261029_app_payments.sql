-- App CTBH: Mon appart › Paiements. O aluno vê a situação de cada mês do aluguel (pago / pendente,
-- SEM valor) e a sua caução (valor e situação). Os dados vêm do site: student_payments e
-- security_deposits. Nada do site é alterado; só recria app_home_for.
-- O resto da função é igual a 20261029_app_cleaning_feedback.sql. Pode rodar de novo sem problema.

create or replace function public.app_home_for(p_cp uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_rental uuid := public.app_rental_for(p_cp);
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
      'semester', r.semester, 'start_date', r.start_date, 'end_date', r.end_date,
      'cleaning_day', r.cleaning_day, 'cleaning_frequency', r.cleaning_frequency,
      'cleaning_time', r.cleaning_time,
      'currency', case when r.contract_type = 'commission_eur' then 'EUR' else 'BRL' end,
      'contract_rent', case when r.contract_type = 'commission_eur' then r.contract_value_eur else r.monthly_rent end,
      'has_contract', exists (select 1 from public.rental_contracts k
                              where k.rental_id = r.id and k.file_path is not null)
    ),
    'tenant', (select jsonb_build_object('move_in_date', t.move_in_date, 'move_out_date', t.move_out_date,
                                         'rent', t.individual_rent)
               from public.rental_tenants t
               where t.rental_id = r.id and t.counterparty_id = p_cp and t.is_active
               limit 1),
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
                           from public.cleaning_records k where k.rental_id = r.id), '[]'::jsonb),
    -- Aluguel do próprio aluno, um item por mês: só a situação (o valor não vai para o app).
    -- Se o mês tiver mais de uma linha, só conta como pago quando todas estiverem pagas.
    'payments', coalesce((select jsonb_agg(jsonb_build_object('month', m.month_year, 'paid', m.paid) order by m.month_year)
                          from (select p.month_year, bool_and(p.status = 'paid') as paid
                                from public.student_payments p
                                join public.rental_tenants t on t.id = p.tenant_id
                                where t.rental_id = r.id and t.counterparty_id = p_cp
                                  and coalesce(lower(p.payment_type), 'rent') = 'rent'
                                group by p.month_year) m), '[]'::jsonb),
    -- Caução do aluno (a do proprietário, deposit_type = 'owner', fica de fora).
    -- amount = Restante, como no site: valor − deduções (security_deposit_deductions).
    'deposit', (select jsonb_build_object('amount', d.amount - coalesce((select sum(x.amount)
                                                                          from public.security_deposit_deductions x
                                                                          where x.deposit_id = d.id), 0),
                                          'currency', d.currency,
                                          'status', d.status, 'returned_date', d.returned_date)
                from public.security_deposits d
                where d.rental_id = r.id and d.counterparty_id = p_cp
                  and coalesce(d.deposit_type, 'student') <> 'owner'
                order by d.created_at desc
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
