-- App CTBH, fase 1: tabelas e funções do app do estudante.
-- RASCUNHO PARA REVISÃO: ainda não foi aplicado.
-- Só acréscimos (prefixo app_). Nenhuma tabela existente é alterada ou apagada.

-- 1. Configuração: período liberado para o app -----------------------------
-- Entra no app toda locação ativa, com pelo menos 1 inquilino ativo, que tenha
-- qualquer dia dentro deste período (inclui contratos de 2026/2 que passam por 2027/1).
create table if not exists public.app_settings (
  id boolean primary key default true check (id),          -- garante uma única linha
  access_start date not null default date '2027-01-01',
  access_end date not null default date '2027-05-31',
  -- Locações deixadas de fora de propósito:
  --   Myriam (My Place - Myriam, termina 4/jan/2027)
  --   Apto Caio, maio/2027 (repete a Chada e o Jorge, que já estão na locação de jan–abr)
  excluded_rental_ids uuid[] not null default array[
    'c38ccf0f-4f9e-47d3-9842-807b0542becd',
    'a0fc408d-7cc5-4f69-b9cc-3148bc2e9f83'
  ]::uuid[],
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- 2. Infos do apartamento que só o app usa --------------------------------
create table if not exists public.app_apartment_info (
  apartment_id uuid primary key references public.apartments(id) on delete cascade,
  wifi_name text,
  wifi_password text,
  trash_info jsonb not null default '{}'::jsonb,      -- {pt, fr, en}
  house_rules jsonb not null default '{}'::jsonb,     -- {pt, fr, en}
  building_info jsonb not null default '{}'::jsonb,   -- portaria, interfone, chaves, entregas
  student_notes jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- 3. Conta do app de cada aluno --------------------------------------------
create table if not exists public.app_students (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'no_access'
    check (status in ('no_access', 'invited', 'active', 'disabled')),
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS ligada e SEM políticas: ninguém lê as tabelas direto (nem anon, nem aluno).
-- O app usa só as funções abaixo; o admin usa a chave secreta no servidor.
alter table public.app_settings        enable row level security;
alter table public.app_apartment_info  enable row level security;
alter table public.app_students        enable row level security;

-- 4. Funções do app (o aluno só recebe o que é dele) -----------------------

-- Locação do aluno logado dentro do período liberado: a que está em curso hoje,
-- senão a mais próxima (futura primeiro, depois a mais recente).
-- Aluno com duas locações (ex.: jan–abr e depois maio) vê a que estiver em curso.
create or replace function public.app_my_rental_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select r.id
  from public.app_students s
  join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
  join public.apartment_rentals r on r.id = t.rental_id
  cross join public.app_settings cfg
  where s.auth_user_id = auth.uid()
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
    'student', (select jsonb_build_object('name', c.name, 'email', c.email)
                from public.finance_counterparties c where c.id = v_cp),
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
    -- só o primeiro nome dos colegas
    'roommates', coalesce((select jsonb_agg(split_part(c.name, ' ', 1) order by c.name)
                           from public.rental_tenants t
                           join public.finance_counterparties c on c.id = t.counterparty_id
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

-- Registra o acesso do aluno (último login / última vez que abriu o app).
create or replace function public.app_touch(p_login boolean default false)
returns void
language sql security definer set search_path = public
as $$
  update public.app_students
     set last_seen_at = now(),
         last_login_at = case when p_login then now() else last_login_at end,
         updated_at = now()
   where auth_user_id = auth.uid() and status = 'active'
$$;

-- Depois da troca obrigatória de senha.
create or replace function public.app_password_changed()
returns void
language sql security definer set search_path = public
as $$
  update public.app_students
     set must_change_password = false, updated_at = now()
   where auth_user_id = auth.uid() and status = 'active'
$$;

-- Só alunos logados executam; anônimo não.
revoke all on function public.app_my_rental_id() from public, anon;
revoke all on function public.app_my_home()      from public, anon;
revoke all on function public.app_touch(boolean) from public, anon;
revoke all on function public.app_password_changed() from public, anon;
grant execute on function public.app_my_rental_id()      to authenticated;
grant execute on function public.app_my_home()           to authenticated;
grant execute on function public.app_touch(boolean)      to authenticated;
grant execute on function public.app_password_changed()  to authenticated;
