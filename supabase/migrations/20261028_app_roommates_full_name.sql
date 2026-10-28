-- App CTBH: a lista de colegas passa a devolver o nome completo (antes só o primeiro nome).
-- Só recria app_home_for; o resto da função é igual à versão anterior (20261028_app_contract_rent.sql).

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
                              'date', k.scheduled_date, 'completed', k.completed, 'completed_at', k.completed_at)
                            order by k.scheduled_date)
                           from public.cleaning_records k where k.rental_id = r.id), '[]'::jsonb)
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
