-- 011: quem faz a faxina em cada apartamento (pedido do dono em 08/11/2026: "o nome da faxineira que vai
-- no apto, o telefone dela"). O banco do site não guarda isso (cleaning_records só tem data, hora, custo e
-- observação), então fica do lado do app. Só no appctbh (gxhvhacqemdwwebsftcd); produção só com aprovação.
--
-- O telefone é dado pessoal da profissional (LGPD): só aparece para os alunos quando share_phone = true,
-- marcado pela equipe depois de ela concordar.

create table if not exists public.app_cleaners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{8,20}$'),
  photo_url text,
  share_phone boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_apartment_info
  add column if not exists cleaner_id uuid references public.app_cleaners(id) on delete set null;

alter table public.app_cleaners enable row level security;
create policy "Equipe le e edita faxineiras" on public.app_cleaners for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
revoke all on public.app_cleaners from anon;

-- app_home_for: igual à 002, com a chave 'cleaner' (nome, telefone se autorizado, foto).
create or replace function public.app_home_for(p_cp uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
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
    'info', (select to_jsonb(i) - 'updated_by' - 'updated_at' - 'cleaner_id'
             from public.app_apartment_info i where i.apartment_id = a.id),
    'cleaner', (select jsonb_build_object('name', cl.name,
                                          'phone', case when cl.share_phone then cl.phone end,
                                          'photo', cl.photo_url)
                from public.app_apartment_info i
                join public.app_cleaners cl on cl.id = i.cleaner_id
                where i.apartment_id = a.id and cl.active),
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
    'payments', coalesce((select jsonb_agg(jsonb_build_object('month', m.month_year, 'paid', m.paid) order by m.month_year)
                          from (select p.month_year, bool_and(p.status = 'paid') as paid
                                from public.student_payments p
                                join public.rental_tenants t on t.id = p.tenant_id
                                where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp
                                  and coalesce(lower(p.payment_type), 'rent') = 'rent'
                                group by p.month_year) m), '[]'::jsonb),
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
$function$;

revoke execute on function public.app_home_for(uuid) from public, anon, authenticated;

-- Dados de teste (só appctbh): uma faxineira fictícia no apartamento de teste, telefone de mentira.
insert into public.app_cleaners (id, name, phone, share_phone)
values ('00000000-0000-4000-a000-000000000201', 'Maria Aparecida', '+55 31 99999-0000', true)
on conflict (id) do nothing;
update public.app_apartment_info set cleaner_id = '00000000-0000-4000-a000-000000000201'
where apartment_id = '00000000-0000-4000-a000-000000000001';
