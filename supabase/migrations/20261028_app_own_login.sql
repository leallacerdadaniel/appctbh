-- App CTBH: login PRÓPRIO do app, totalmente separado do login do site.
-- As contas dos alunos não ficam em auth.users (o cadastro de usuários do site):
-- a senha fica só como hash em app_students, e o app fala com a Edge Function app-api,
-- que faz o login e devolve só os dados do aluno.
-- Só mexe em objetos do app (prefixo app_). Nenhuma tabela ou função do site é alterada.

-- 1. Senha (hash PBKDF2) e versão da sessão (muda ao trocar senha/desativar = derruba sessões antigas)
alter table public.app_students add column if not exists password_hash text;
alter table public.app_students add column if not exists session_version integer not null default 0;

-- 2. As funções antigas dependiam do login do site (auth.uid()); saem.
drop function if exists public.app_my_home();
drop function if exists public.app_my_rental_id();
drop function if exists public.app_touch(boolean);
drop function if exists public.app_password_changed();

-- 3. Locação do aluno dentro do período liberado: a que está em curso hoje,
--    senão a mais próxima (futura primeiro, depois a mais recente).
create or replace function public.app_rental_for(p_cp uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select r.id
  from public.app_students s
  join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
  join public.apartment_rentals r on r.id = t.rental_id
  cross join public.app_settings cfg
  where s.counterparty_id = p_cp
    and s.status = 'active'
    and r.status = 'active'
    and r.id <> all (cfg.excluded_rental_ids)
    and r.start_date <= cfg.access_end
    and r.end_date >= cfg.access_start
  order by (current_date between r.start_date and r.end_date) desc,
           (r.start_date >= current_date) desc,
           abs(r.start_date - current_date)
  limit 1
$$;

-- 4. Tudo o que o app mostra do aluno (só dele; colegas só pelo primeiro nome).
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
    'roommates', coalesce((select jsonb_agg(split_part(coalesce(nullif(trim(s.display_name), ''), c.name), ' ', 1)
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

-- 5. Login: conta do app pelo e-mail do cadastro (só contas com senha definida).
create or replace function public.app_login_lookup(p_email text)
returns table (counterparty_id uuid, password_hash text, status text, must_change_password boolean, session_version integer)
language sql stable security definer set search_path = public
as $$
  select s.counterparty_id, s.password_hash, s.status, s.must_change_password, s.session_version
  from public.app_students s
  join public.finance_counterparties c on c.id = s.counterparty_id
  where lower(trim(c.email)) = lower(trim(p_email))
    and s.password_hash is not null
$$;

-- Só o servidor (chave secreta / Edge Function) executa; o celular e o navegador não.
revoke all on function public.app_rental_for(uuid)   from public, anon, authenticated;
revoke all on function public.app_home_for(uuid)     from public, anon, authenticated;
revoke all on function public.app_login_lookup(text) from public, anon, authenticated;
grant execute on function public.app_rental_for(uuid)   to service_role;
grant execute on function public.app_home_for(uuid)     to service_role;
grant execute on function public.app_login_lookup(text) to service_role;
