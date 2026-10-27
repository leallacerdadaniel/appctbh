-- App CTBH: nome que o aluno vê no app, editável no admin.
-- O cadastro do site (finance_counterparties.name) não muda; se o campo ficar vazio, o app usa o nome do cadastro.
-- Só acréscimo numa tabela do app (app_students). Nenhuma tabela do site é alterada.

alter table public.app_students add column if not exists display_name text;

create or replace function public.app_my_home()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_rental uuid := public.app_my_rental_id();
  v_cp uuid;
  result jsonb;
begin
  if v_rental is null then
    return null;
  end if;

  select counterparty_id into v_cp
  from public.app_students where auth_user_id = auth.uid();

  select jsonb_build_object(
    'student', (select jsonb_build_object('name', coalesce(nullif(trim(s.display_name), ''), c.name), 'email', c.email)
                from public.finance_counterparties c
                left join public.app_students s on s.counterparty_id = c.id
                where c.id = v_cp),
    'must_change_password', (select must_change_password from public.app_students where counterparty_id = v_cp),
    'apartment', jsonb_build_object(
      'title', a.title, 'location', a.location, 'address_complement', a.address_complement,
      'latitude', a.latitude, 'longitude', a.longitude,
      'photo', a.card_image_url
    ),
    'rental', jsonb_build_object(
      'semester', r.semester, 'start_date', r.start_date, 'end_date', r.end_date,
      'cleaning_day', r.cleaning_day, 'cleaning_frequency', r.cleaning_frequency,
      'cleaning_time', r.cleaning_time,
      'has_contract', exists (select 1 from public.rental_contracts k
                              where k.rental_id = r.id and k.file_path is not null)
    ),
    'tenant', (select jsonb_build_object('move_in_date', t.move_in_date, 'move_out_date', t.move_out_date)
               from public.rental_tenants t
               where t.rental_id = r.id and t.counterparty_id = v_cp and t.is_active
               limit 1),
    'info', (select to_jsonb(i) - 'updated_by' - 'updated_at'
             from public.app_apartment_info i where i.apartment_id = a.id),
    -- só o primeiro nome dos colegas (o "nome no app", se houver)
    'roommates', coalesce((select jsonb_agg(split_part(coalesce(nullif(trim(s.display_name), ''), c.name), ' ', 1)
                                            order by coalesce(nullif(trim(s.display_name), ''), c.name))
                           from public.rental_tenants t
                           join public.finance_counterparties c on c.id = t.counterparty_id
                           left join public.app_students s on s.counterparty_id = t.counterparty_id
                           where t.rental_id = r.id and t.is_active and t.counterparty_id <> v_cp), '[]'::jsonb),
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
