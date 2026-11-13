-- PRODUÇÃO (miucfiiporxhvvbefonh): o app do aluno no banco do site.
-- Montado em 12/11/2026 a partir dos SQL do banco de desenvolvimento (002, 004, 006, 007, 008, 010 a 017, 019 a 025),
-- na ordem, uma seção por arquivo.
-- NÃO APLICAR sem backup, homologação e aprovação do Daniel. Passo a passo: supabase/producao/README.md.
--
-- Só objetos app_*, mais: extensão pg_net, bucket privado app-request-photos e a política dele em storage.objects,
-- agendamento diário da agenda (pg_cron). Nenhuma tabela, função ou política do site muda.
-- Fora: 001, 003, 005, 009, 018, os dados fictícios do fim da 011, 012 e 020, a parte 1 da 006 e o bloco 6 da 021.
-- Segredos do Vault: passos manuais comentados (marcadores <<...>>), nunca o valor aqui.
-- Pode rodar de novo: if not exists, drop ... if exists antes de create, create or replace, do $$ com checagem.
-- Uma transação só: se qualquer comando falhar, nada fica.

begin;

-- Trava ocupada (ex.: storage.objects, que o site usa) faz o arquivo falhar em 10 s, em vez de deixar o site em fila.
set local lock_timeout = '10s';

-- ===== extensões =====
-- A produção já tem pg_cron, pgcrypto e supabase_vault. Falta pg_net: o push (022) e o robô da agenda (013) usam.
-- pg_cron fica fora: a produção já tem, e o "create extension" dispara o gatilho do Supabase que regrava as
-- permissões do esquema cron (achado da homologação de 12/11/2026).
create extension if not exists pg_net with schema extensions;

-- ===== 002_tabelas_e_funcoes_do_app.sql =====

-- As 11 tabelas app_* que a produção JÁ TEM e as funções da app-api, copiadas da produção em 08/11/2026.
-- Na produção: as tabelas ficam como estão (if not exists, nenhuma linha muda); as funções são as mesmas.

create table if not exists public.app_students (
  counterparty_id uuid not null primary key references public.finance_counterparties(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'no_access' check (status = any (array['no_access','invited','active','disabled'])),
  must_change_password boolean not null default true,
  last_login_at timestamptz, last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text,
  login_count integer not null default 0,
  password_hash text,
  session_version integer not null default 0,
  birthday_greeted_year integer,
  usage_excluded boolean not null default false
);

create table if not exists public.app_settings (
  id boolean not null default true primary key check (id),
  access_start date not null default '2027-01-01',
  access_end date not null default '2027-05-31',
  excluded_rental_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.app_apartment_info (
  apartment_id uuid not null primary key references public.apartments(id) on delete cascade,
  wifi_name text, wifi_password text,
  trash_info jsonb not null default '{}'::jsonb,
  house_rules jsonb not null default '{}'::jsonb,
  building_info jsonb not null default '{}'::jsonb,
  student_notes jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unit_number text
);

create table if not exists public.app_apartment_places (
  apartment_id uuid not null primary key references public.apartments(id) on delete cascade,
  nearby jsonb not null,
  times jsonb not null,
  computed_at timestamptz not null default now()
);

create table if not exists public.app_rental_continuations (
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  continues_rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  note text,
  primary key (rental_id, continues_rental_id),
  check (rental_id <> continues_rental_id)
);

create table if not exists public.app_cleaning_feedback (
  cleaning_id uuid not null references public.cleaning_records(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id),
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cleaning_id, counterparty_id)
);
create index if not exists app_cleaning_feedback_rental_idx on public.app_cleaning_feedback (rental_id);

create table if not exists public.app_expenses (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_by uuid not null references public.finance_counterparties(id),
  spent_on date not null default current_date,
  split_mode text not null default 'equal' check (split_mode = any (array['equal','exact'])),
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR']))
);
create index if not exists app_expenses_rental_idx on public.app_expenses (rental_id, spent_on desc);

create table if not exists public.app_expense_shares (
  expense_id uuid not null references public.app_expenses(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, counterparty_id)
);

create table if not exists public.app_settlements (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  from_cp uuid not null references public.finance_counterparties(id),
  to_cp uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_on date not null default current_date,
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR'])),
  check (from_cp <> to_cp)
);
create index if not exists app_settlements_rental_idx on public.app_settlements (rental_id, paid_on desc);

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  kind text not null check (kind = any (array['screen','action'])),
  name text not null,
  item text,
  occurred_at timestamptz not null default now()
);
create index if not exists app_events_occurred_idx on public.app_events (occurred_at);
create index if not exists app_events_student_idx on public.app_events (counterparty_id, occurred_at);

create table if not exists public.app_searches (
  id bigint generated always as identity primary key,
  query text not null,
  results integer not null default 0,
  occurred_at timestamptz not null default now()
);
create index if not exists app_searches_occurred_idx on public.app_searches (occurred_at);

alter table public.app_students enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_apartment_info enable row level security;
alter table public.app_apartment_places enable row level security;
alter table public.app_rental_continuations enable row level security;
alter table public.app_cleaning_feedback enable row level security;
alter table public.app_expenses enable row level security;
alter table public.app_expense_shares enable row level security;
alter table public.app_settlements enable row level security;
alter table public.app_events enable row level security;
alter table public.app_searches enable row level security;

-- ---------- funções (iguais às do site em 08/11/2026) ----------

create or replace function public.app_login_lookup(p_email text)
returns table(counterparty_id uuid, password_hash text, status text, must_change_password boolean, session_version integer)
language sql stable security definer set search_path to 'public' as $$
  select s.counterparty_id, s.password_hash, s.status, s.must_change_password, s.session_version
  from public.app_students s
  join public.finance_counterparties c on c.id = s.counterparty_id
  where lower(trim(c.email)) = lower(trim(p_email))
    and s.password_hash is not null
$$;

create or replace function public.app_rental_for(p_cp uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
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

create or replace function public.app_rentals_for(p_cp uuid)
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select case when public.app_rental_for(p_cp) is null then null else
    array[public.app_rental_for(p_cp)] || coalesce(array(
      select c.continues_rental_id
      from public.app_rental_continuations c
      join public.rental_tenants t on t.rental_id = c.continues_rental_id
                                  and t.counterparty_id = p_cp and t.is_active
      where c.rental_id = public.app_rental_for(p_cp)), '{}')
  end;
$$;

create or replace function public.app_home_for(p_cp uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
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
$$;

create or replace function public.app_claim_birthday(p_cp uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
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

-- Só a app-api (service_role) chama estas funções.
revoke execute on function public.app_login_lookup(text), public.app_rental_for(uuid), public.app_rentals_for(uuid),
  public.app_home_for(uuid), public.app_claim_birthday(uuid) from public, anon, authenticated;

-- ===== 004_pedidos.sql =====

-- Onda 6: pedidos e extras.
-- Tudo novo, com prefixo app_: nenhuma tabela do site é alterada.
--
-- app_service_catalog  catálogo de extras (a equipe edita no painel, onda 4)
-- app_requests         um formato só para extra, manutenção, late checkout, early check-in e espaço gourmet
-- app_request_events   linha do tempo; preenchida por gatilho a cada mudança de status
--
-- Cobrança (decisão de 06/11/2026): extra acumula e é faturado com o aluguel, a Chez Toi adianta.
-- billing_month = 1º dia do mês do aluguel que recebe a cobrança (mês seguinte ao do serviço).
-- Quando a equipe concluir o pedido, o painel lança em student_payments (payment_type 'service'): onda 4.

create table if not exists public.app_service_catalog (
  id uuid not null default gen_random_uuid() primary key,
  category text not null check (category = any (array['cleaning','laundry','chef','transfer','other'])),
  emoji text not null default '✨',
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  unit jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents >= 0 and price_cents <= 10000000),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR'])),
  lead_time_hours integer not null default 24 check (lead_time_hours between 0 and 720),
  allows_quantity boolean not null default false,
  max_quantity integer not null default 1 check (max_quantity between 1 and 20),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_requests (
  id uuid not null default gen_random_uuid() primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  kind text not null check (kind = any (array['service','maintenance','late_checkout','early_checkin','gourmet'])),
  status text not null default 'received'
    check (status = any (array['received','scheduled','in_progress','done','cancelled','declined'])),
  -- extra
  service_id uuid references public.app_service_catalog(id) on delete set null,
  service_name jsonb,
  quantity integer not null default 1 check (quantity between 1 and 20),
  unit_price_cents integer check (unit_price_cents >= 0),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR'])),
  -- taxa definida pela equipe (late checkout, early check-in)
  fee_cents integer check (fee_cents >= 0),
  billing_month date,
  -- quando
  scheduled_date date,
  start_time time,
  end_time time,
  guests integer check (guests between 1 and 100),
  -- manutenção
  room text check (char_length(room) <= 40),
  category text check (category = any (array['plumbing','electrical','appliance','furniture','internet','other'])),
  urgency text check (urgency = any (array['low','normal','urgent'])),
  description text check (char_length(description) <= 1000),
  photo_paths text[] not null default '{}',
  -- conversa
  note text check (char_length(note) <= 500),
  team_note text check (char_length(team_note) <= 500),
  -- avaliação depois de concluído
  rating smallint check (rating between 1 and 5),
  rating_comment text check (char_length(rating_comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'service' or (service_id is not null and unit_price_cents is not null and scheduled_date is not null)),
  check (kind <> 'maintenance' or (description is not null and urgency is not null)),
  check (kind <> 'gourmet' or (scheduled_date is not null and start_time is not null and end_time is not null and end_time > start_time))
);
create index if not exists app_requests_rental_idx on public.app_requests (rental_id, created_at desc);
create index if not exists app_requests_student_idx on public.app_requests (counterparty_id, created_at desc);
create index if not exists app_requests_open_idx on public.app_requests (status, created_at) where status in ('received','scheduled','in_progress');

create table if not exists public.app_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.app_requests(id) on delete cascade,
  status text not null,
  by_team boolean not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists app_request_events_request_idx on public.app_request_events (request_id, created_at);

-- Linha do tempo automática: o aluno cria e cancela; qualquer outra mudança é da equipe.
-- O painel só precisa mudar status (e team_note, se quiser deixar recado).
-- BEFORE para poder carimbar updated_at; o evento do INSERT precisa da linha já gravada, então vai num AFTER.
create or replace function public.app_requests_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.app_requests_log_after()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.app_request_events (request_id, status, by_team) values (new.id, new.status, false);
  elsif new.status is distinct from old.status then
    insert into public.app_request_events (request_id, status, by_team, note)
    values (new.id, new.status, new.status <> 'cancelled', case when new.status <> 'cancelled' then new.team_note end);
  elsif new.team_note is distinct from old.team_note and new.team_note is not null then
    insert into public.app_request_events (request_id, status, by_team, note)
    values (new.id, new.status, true, new.team_note);
  end if;
  return null;
end;
$$;

drop trigger if exists app_requests_touch on public.app_requests;
create trigger app_requests_touch before update on public.app_requests
  for each row execute function public.app_requests_touch();
drop trigger if exists app_requests_log on public.app_requests;
create trigger app_requests_log after insert or update on public.app_requests
  for each row execute function public.app_requests_log_after();

alter table public.app_service_catalog enable row level security;
alter table public.app_requests enable row level security;
alter table public.app_request_events enable row level security;

revoke execute on function public.app_requests_log_after() from public, anon, authenticated;

-- Bucket PRIVADO das fotos dos chamados (só do app; não mexe em outros buckets).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-request-photos', 'app-request-photos', false, 10485760,
        array['image/jpeg','image/png','image/heic','image/heif','image/webp'])
on conflict (id) do nothing;

-- ===== 006_papeis_e_catalogo_no_painel.sql =====

-- O painel do site edita o catálogo de extras (papéis admin e equipe).
-- FORA: a parte 1 da 006 (tipo, tabela e função de papéis da equipe), que no site já existem.

drop policy if exists "Equipe le o catalogo de extras" on public.app_service_catalog;
create policy "Equipe le o catalogo de extras" on public.app_service_catalog
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

drop policy if exists "Equipe edita o catalogo de extras" on public.app_service_catalog;
create policy "Equipe edita o catalogo de extras" on public.app_service_catalog
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

grant select, insert, update, delete on public.app_service_catalog to authenticated;

-- ===== 007_assistente.sql =====

-- Assistente de IA do app (onda 16, pedido de 08/11/2026): responde sobre o contrato do aluno, regras,
-- cartilha, guia de BH e os dados dele. Esta tabela guarda só o uso (tokens e custo), nunca as perguntas,
-- para medir o custo por aluno e aplicar o limite diário.

create table if not exists public.app_assistant_usage (
  id bigint generated always as identity primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  model text not null,
  input_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  output_tokens integer not null default 0,
  with_contract boolean not null default false,
  refused boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists app_assistant_usage_student_idx on public.app_assistant_usage (counterparty_id, created_at desc);
alter table public.app_assistant_usage enable row level security;

-- ===== 008_casa_avisos_pagamento.sql =====

-- Ondas 5, 7 e 9: tarefas da casa, avisos (o sino), dados de pagamento da Chez Toi e
-- aparelhos para notificação. Tudo novo, prefixo app_; nada do site é alterado.

-- ---------- tarefas da casa (os moradores criam e cuidam; a Chez Toi não gerencia) ----------
create table if not exists public.app_chores (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  emoji text not null default '🧹',
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- moradores (finance_counterparties.id) na ordem do rodízio; semana 0 = start_week
  rotation uuid[] not null check (cardinality(rotation) between 1 and 12),
  start_week date not null,
  active boolean not null default true,
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(isodow from start_week) = 1)
);
create index if not exists app_chores_rental_idx on public.app_chores (rental_id) where active;

-- "Esta semana eu faço no seu lugar": vale para uma tarefa e uma semana.
create table if not exists public.app_chore_swaps (
  chore_id uuid not null references public.app_chores(id) on delete cascade,
  week_start date not null,
  counterparty_id uuid not null references public.finance_counterparties(id),
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  primary key (chore_id, week_start)
);

create table if not exists public.app_chore_completions (
  chore_id uuid not null references public.app_chores(id) on delete cascade,
  week_start date not null,
  done_by uuid not null references public.finance_counterparties(id),
  done_at timestamptz not null default now(),
  primary key (chore_id, week_start)
);

-- ---------- avisos (o sino) ----------
-- audience: 'all' = todos os alunos com acesso; 'rental' = um apartamento (rental_id); 'student' = um aluno.
-- O painel escreve comunicados (onda 4); o gatilho abaixo avisa o aluno quando a equipe mexe num pedido.
create table if not exists public.app_notices (
  id uuid not null default gen_random_uuid() primary key,
  audience text not null check (audience = any (array['all','rental','student'])),
  rental_id uuid references public.apartment_rentals(id) on delete cascade,
  counterparty_id uuid references public.finance_counterparties(id) on delete cascade,
  title jsonb not null,
  body jsonb not null default '{}'::jsonb,
  href text check (href is null or href ~ '^/[a-z0-9/_\-\[\]?=&]*$'),
  created_by uuid,
  created_at timestamptz not null default now(),
  check ((audience = 'rental') = (rental_id is not null)),
  check ((audience = 'student') = (counterparty_id is not null))
);
create index if not exists app_notices_created_idx on public.app_notices (created_at desc);

create table if not exists public.app_notice_reads (
  notice_id uuid not null references public.app_notices(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, counterparty_id)
);

create or replace function public.app_requests_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_title jsonb;
begin
  if new.status is not distinct from old.status or new.status = 'cancelled' then
    return null;
  end if;
  v_title := case new.status
    when 'scheduled' then '{"fr":"Demande confirmée","en":"Request confirmed","pt":"Pedido confirmado"}'
    when 'in_progress' then '{"fr":"Demande en cours","en":"Request in progress","pt":"Pedido em andamento"}'
    when 'done' then '{"fr":"Demande terminée","en":"Request done","pt":"Pedido concluído"}'
    when 'declined' then '{"fr":"Demande refusée","en":"Request declined","pt":"Pedido recusado"}'
    else null end;
  if v_title is null then return null; end if;
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  values ('student', new.counterparty_id, v_title,
          case when new.team_note is not null
               then jsonb_build_object('fr', new.team_note, 'en', new.team_note, 'pt', new.team_note)
               else '{}'::jsonb end,
          '/requests/' || new.id);
  return null;
end;
$$;
drop trigger if exists app_requests_notify on public.app_requests;
create trigger app_requests_notify after update on public.app_requests
  for each row execute function public.app_requests_notify();
revoke execute on function public.app_requests_notify() from public, anon, authenticated;

-- ---------- como pagar a Chez Toi (uma linha; a equipe edita no painel) ----------
create table if not exists public.app_payment_info (
  id boolean not null default true primary key check (id),
  beneficiary text,
  document text,            -- CNPJ
  pix_key text,
  pix_key_type text check (pix_key_type = any (array['cnpj','email','phone','random'])),
  bank text,
  agency text,
  account text,
  -- contratos em euro (Wise): hoje fixos no código do site, em StudentPayments.tsx
  eur_account_holder text,
  eur_iban text,
  eur_swift text,
  notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_payment_info (id) values (true) on conflict do nothing;

-- ---------- aparelhos para notificação (onda 9, como no Café com Crédito) ----------
create table if not exists public.app_devices (
  expo_token text not null primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  platform text not null check (platform = any (array['ios','android'])),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists app_devices_student_idx on public.app_devices (counterparty_id) where enabled;

alter table public.app_chores enable row level security;
alter table public.app_chore_swaps enable row level security;
alter table public.app_chore_completions enable row level security;
alter table public.app_notices enable row level security;
alter table public.app_notice_reads enable row level security;
alter table public.app_payment_info enable row level security;
alter table public.app_devices enable row level security;

-- A equipe edita os dados de pagamento e escreve comunicados pelo painel (login do site).
drop policy if exists "Equipe le e edita pagamento" on public.app_payment_info;
create policy "Equipe le e edita pagamento" on public.app_payment_info for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Equipe le e escreve avisos" on public.app_notices;
create policy "Equipe le e escreve avisos" on public.app_notices for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select, insert, update, delete on public.app_payment_info, public.app_notices to authenticated;

-- ===== 010_regras_aceitas.sql =====

-- 010: aceite das regras da casa (introdução obrigatória no primeiro acesso, pedido do dono em 08/11/2026).
--
-- O app mostra as regras em telas curtas e o aluno segura o botão "Je m'engage". Cada aceite fica aqui,
-- por pessoa, locação e versão das regras (mudou a regra, sobe a versão e o app pede de novo).

create table if not exists public.app_rules_acceptances (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null,
  rental_id uuid not null,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}$'),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  accepted_at timestamptz not null default now(),
  unique (counterparty_id, rental_id, version)
);

create index if not exists app_rules_acceptances_rental on public.app_rules_acceptances (rental_id);

alter table public.app_rules_acceptances enable row level security;

-- O app grava pela função app-house (chave de serviço). A equipe só lê, pelo painel.
drop policy if exists "Equipe le aceites das regras" on public.app_rules_acceptances;
create policy "Equipe le aceites das regras" on public.app_rules_acceptances for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

revoke all on public.app_rules_acceptances from anon;

-- ===== 011_faxineira_do_apartamento.sql =====

-- 011: quem faz a faxina em cada apartamento (pedido do dono em 08/11/2026: "o nome da faxineira que vai
-- no apto, o telefone dela"). O banco do site não guarda isso (cleaning_records só tem data, hora, custo e
-- observação), então fica do lado do app.
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
drop policy if exists "Equipe le e edita faxineiras" on public.app_cleaners;
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

-- (FORA: a faxineira fictícia e o apartamento de teste do fim da 011.)

-- ===== 012_visitas_encomendas_perfis.sql =====

-- 012: a vida no prédio (pedido do dono em 08/11/2026): visitas avisadas à portaria, encomendas e o perfil
-- de cada aluno para os colegas de apartamento.
--
-- O app grava tudo pela função app-house (chave de serviço, token próprio do app). A equipe lê pelo painel
-- (login do site) e, nas encomendas, registra a chegada na portaria: o gatilho avisa o aluno pelo sino.
-- O número da portaria fica em app_apartment_info.building_info ->> 'portaria_whatsapp' (a equipe preenche).

-- ---------- visitas: o aluno diz quem vem; o app prepara a mensagem em português para o porteiro ----------
create table if not exists public.app_visitors (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  visit_date date not null,
  visit_time time,
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  -- quando o aluno abriu o WhatsApp para avisar a portaria (some se ele mudar nome, dia ou hora)
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_visitors_student_idx on public.app_visitors (counterparty_id, visit_date);
create index if not exists app_visitors_rental_idx on public.app_visitors (rental_id, visit_date) where status = 'planned';

-- ---------- encomendas: attendu (expected) → arrivé (arrived, a equipe marca) → récupéré (picked_up) ----------
create table if not exists public.app_packages (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 80),
  carrier text check (carrier is null or char_length(carrier) <= 60),
  expected_date date,
  status text not null default 'expected' check (status in ('expected', 'arrived', 'picked_up', 'cancelled')),
  -- recado da equipe ao marcar a chegada ("caixa grande, com o porteiro da noite")
  team_note text check (team_note is null or char_length(team_note) <= 200),
  arrived_at timestamptz,
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_packages_student_idx on public.app_packages (counterparty_id, created_at desc);
create index if not exists app_packages_open_idx on public.app_packages (rental_id) where status in ('expected', 'arrived');

-- Carimbos de hora: a equipe só muda o status (update ... set status = 'arrived').
create or replace function public.app_packages_stamp()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.status = 'expected' then
    new.arrived_at := null;
    new.picked_up_at := null;
  end if;
  if new.status = 'arrived' and new.arrived_at is null then
    new.arrived_at := now();
  end if;
  if new.status = 'picked_up' and new.picked_up_at is null then
    new.picked_up_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists app_packages_stamp on public.app_packages;
create trigger app_packages_stamp before insert or update on public.app_packages
  for each row execute function public.app_packages_stamp();
revoke execute on function public.app_packages_stamp() from public, anon, authenticated;

-- Chegou na portaria → aviso para o aluno (o sino; o push da onda 9 lê a mesma tabela).
-- Vale também quando a equipe cadastra direto como 'arrived' uma encomenda que o aluno não tinha avisado.
create or replace function public.app_packages_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_what text;
  v_note text;
begin
  if new.status <> 'arrived' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'arrived' then
    return null;
  end if;
  v_what := trim(new.description) || coalesce(' · ' || nullif(trim(new.carrier), ''), '');
  v_note := coalesce(' ' || nullif(trim(new.team_note), ''), '');
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  values (
    'student', new.counterparty_id,
    '{"fr":"Votre colis est arrivé à la portaria","en":"Your package has arrived at the portaria","pt":"Sua encomenda chegou na portaria"}'::jsonb,
    jsonb_build_object(
      'fr', v_what || '. Passez le chercher à la portaria, puis marquez-le comme récupéré dans l’app.' || v_note,
      'en', v_what || '. Pick it up at the portaria, then mark it as picked up in the app.' || v_note,
      'pt', v_what || '. Retire na portaria e depois marque como retirada no app.' || v_note),
    '/house/packages');
  return null;
end;
$$;
drop trigger if exists app_packages_notify on public.app_packages;
create trigger app_packages_notify after insert or update of status on public.app_packages
  for each row execute function public.app_packages_notify();
revoke execute on function public.app_packages_notify() from public, anon, authenticated;

-- ---------- perfil para os colegas: um por aluno, invisível até o aluno ligar "Visible par mes colocataires" ----------
create table if not exists public.app_profiles (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  -- locação em que o aluno salvou por último (para o painel); quem vê é decidido na hora, pelos colegas ativos
  rental_id uuid references public.apartment_rentals(id) on delete set null,
  school text check (school is null or char_length(school) <= 80),
  hometown text check (hometown is null or char_length(hometown) <= 80),
  -- códigos ISO 639-1 ("fr", "en", "pt")
  languages text[] not null default '{}'
    check (cardinality(languages) <= 8 and array_to_string(languages, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  about text check (about is null or char_length(about) <= 140),
  -- consentimento (LGPD): desligado por padrão
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_profiles_rental_idx on public.app_profiles (rental_id);

-- ---------- acesso: o app passa pela app-house (chave de serviço); a equipe lê pelo painel ----------
alter table public.app_visitors enable row level security;
alter table public.app_packages enable row level security;
alter table public.app_profiles enable row level security;

revoke all on public.app_visitors, public.app_packages, public.app_profiles from anon, authenticated;
grant select on public.app_visitors, public.app_profiles to authenticated;
grant select, insert, update on public.app_packages to authenticated;

drop policy if exists "Equipe le visitas" on public.app_visitors;
create policy "Equipe le visitas" on public.app_visitors for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le perfis" on public.app_profiles;
create policy "Equipe le perfis" on public.app_profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le encomendas" on public.app_packages;
create policy "Equipe le encomendas" on public.app_packages for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
-- A equipe registra a chegada na portaria (update do status) ou cadastra uma encomenda que chegou sem aviso.
drop policy if exists "Equipe registra encomendas" on public.app_packages;
create policy "Equipe registra encomendas" on public.app_packages for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe marca chegada das encomendas" on public.app_packages;
create policy "Equipe marca chegada das encomendas" on public.app_packages for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

-- (FORA: portaria, visitas, encomendas e perfis fictícios do fim da 012.)

-- ===== 013_agenda_bh.sql =====

-- 013: agenda automática "o que rola em BH" (pedido do dono em 09/11/2026: CCBB, Palácio das Artes, shows,
-- festas, 2LIV, Raro, Sympla, prefeitura).
--
-- Fontes e o que cada uma permite: docs/pesquisa/agenda-bh.md, seção 7.
--   * leitura automática (função app-events-sync, 1x por dia pelo pg_cron): dados abertos da PBH (CKAN, CC-BY),
--     CCBB BH (sitemap + OpenGraph) e Palácio das Artes (agenda da página inicial + API WordPress);
--   * curadoria por link: a equipe cola o link (Sympla, 2LIV, Raro, Belotur, Instagram...) em app_bh_event_links e
--     o robô lê só os metadados públicos daquela página, como uma prévia de link.
-- O app lê pela função app-events (token do app); a equipe vê, corrige e esconde pelo painel (login do site).

-- (pg_cron e pg_net: na seção de extensões, no começo do arquivo.)

-- ---------- links colados pela equipe ----------
create table if not exists public.app_bh_event_links (
  id uuid primary key default gen_random_uuid(),
  url text not null check (url ~ '^https?://' and char_length(url) <= 600),
  -- nome de quem colou (texto livre do painel)
  added_by text check (added_by is null or char_length(added_by) <= 80),
  -- pending: ainda não lido · ok: virou evento · needs_info: a página não trouxe título ou data (a equipe completa)
  -- error: não deu para abrir · not_allowed: o robots.txt do site não deixa
  status text not null default 'pending' check (status in ('pending', 'ok', 'needs_info', 'error', 'not_allowed')),
  status_detail text,
  -- Opcionais: a equipe preenche quando a página não traz (Instagram, site sem data). Valem mais que a página.
  title text check (title is null or char_length(trim(title)) between 1 and 160),
  starts_at timestamptz,
  ends_at timestamptz,
  venue text check (venue is null or char_length(venue) <= 120),
  category text check (category is null or category in ('show', 'party', 'exhibition', 'theatre', 'festival', 'other')),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create unique index if not exists app_bh_event_links_url_idx on public.app_bh_event_links (url);

-- ---------- os eventos (um por fonte + id na fonte) ----------
create table if not exists public.app_bh_events (
  id uuid primary key default gen_random_uuid(),
  -- ccbb_bh · palacio_das_artes · pbh_dados_abertos · link (curadoria)
  source text not null check (source in ('ccbb_bh', 'palacio_das_artes', 'pbh_dados_abertos', 'link')),
  -- o nome mostrado no app ("CCBB BH", "Palácio das Artes", "Sympla", "2LIV"...)
  source_name text not null,
  -- slug, id do WordPress, id do licenciamento ou o id do link
  external_id text not null,
  link_id uuid references public.app_bh_event_links(id) on delete cascade,
  -- como publicado na fonte (nome próprio, em geral em português)
  title text not null check (char_length(trim(title)) between 1 and 200),
  venue text,
  neighborhood text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- false = só o dia é conhecido (temporada, exposição): o app não mostra hora
  time_known boolean not null default true,
  url text,
  image_url text,
  category text not null default 'other' check (category in ('show', 'party', 'exhibition', 'theatre', 'festival', 'other')),
  -- texto original do preço (para a equipe); o app mostra price_min/price_max/is_free
  price_text text,
  price_min numeric(10, 2),
  price_max numeric(10, 2),
  is_free boolean,
  -- TODO(IA): resumo de uma linha em FR/EN gerado pelo Claude quando houver ANTHROPIC_API_KEY;
  -- até lá o app mostra só os fatos (título, local, data, preço, categoria).
  fetched_at timestamptz not null default now(),
  -- a equipe esconde o que não serve; o robô nunca mexe nesta coluna
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists app_bh_events_upcoming_idx on public.app_bh_events (starts_at) where not hidden;

-- ---------- páginas lidas pelo robô: no máximo uma leitura por página por dia ----------
create table if not exists public.app_bh_source_pages (
  url text primary key,
  source text not null,
  -- lastmod do sitemap (CCBB): a página só é lida de novo quando muda
  last_modified text,
  http_status int,
  fetched_at timestamptz not null default now()
);

-- ---------- histórico das execuções (para a equipe ver se a agenda está viva) ----------
create table if not exists public.app_bh_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb
);

-- ---------- updated_at ----------
create or replace function public.app_bh_touch()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.app_bh_touch() from public, anon, authenticated;
drop trigger if exists app_bh_events_touch on public.app_bh_events;
create trigger app_bh_events_touch before update on public.app_bh_events
  for each row execute function public.app_bh_touch();
drop trigger if exists app_bh_event_links_touch on public.app_bh_event_links;
create trigger app_bh_event_links_touch before update on public.app_bh_event_links
  for each row execute function public.app_bh_touch();

-- ---------- os próximos dias, sem os escondidos ----------
-- Sem fim conhecido: evento com hora some 4 h depois do início; evento só com o dia, no fim do dia.
-- Exposição sem data de fim (Palácio das Artes) continua enquanto a fonte ainda a lista (lida há menos de 36 h).
create or replace function public.app_bh_events_next(p_days int default 30, p_category text default null)
returns setof public.app_bh_events
language sql stable set search_path to 'public' as $$
  select e.*
  from public.app_bh_events e
  where not e.hidden
    and (p_category is null or e.category = p_category)
    and e.starts_at < now() + make_interval(days => least(greatest(coalesce(p_days, 30), 1), 60))
    and (
      coalesce(e.ends_at, e.starts_at + case when e.time_known then interval '4 hours' else interval '1 day' end) > now()
      or (e.ends_at is null and e.category = 'exhibition' and e.source <> 'link' and e.fetched_at > now() - interval '36 hours')
    )
  order by e.starts_at, e.title
  limit 200;
$$;
revoke execute on function public.app_bh_events_next(int, text) from public, anon;
grant execute on function public.app_bh_events_next(int, text) to authenticated, service_role;

-- ---------- quem pode chamar a app-events-sync: só quem tem o segredo do Vault ----------
-- PASSO MANUAL (README, passo 4): o segredo NÃO vai neste arquivo. Rodar à parte, trocando o marcador:
-- do $$
-- begin
--   if not exists (select 1 from vault.secrets where name = 'app_events_sync_secret') then
--     perform vault.create_secret(
--       '<<SEGREDO_DA_AGENDA>>',
--       'app_events_sync_secret',
--       'Enviado pelo pg_cron no cabeçalho x-sync-secret da função app-events-sync (013_agenda_bh.sql).'
--     );
--   end if;
-- end;
-- $$;

create or replace function public.app_bh_events_sync_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'app_events_sync_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.app_bh_events_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.app_bh_events_sync_secret_ok(text) to service_role;

-- Chama a função (assíncrono, pelo pg_net). Sem argumento: tudo; com p_link: só aquele link colado.
-- Endereço da produção.
create or replace function public.app_bh_events_run_sync(p_link uuid default null)
returns bigint language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint;
begin
  select net.http_post(
    url := 'https://miucfiiporxhvvbefonh.supabase.co/functions/v1/app-events-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'app_events_sync_secret')
    ),
    body := case when p_link is null then '{}'::jsonb else jsonb_build_object('linkId', p_link) end,
    timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;
revoke execute on function public.app_bh_events_run_sync(uuid) from public, anon, authenticated;

-- A equipe colou ou corrigiu um link: o robô lê aquela página na hora (não espera o dia seguinte).
create or replace function public.app_bh_event_links_changed()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.app_bh_events_run_sync(new.id);
  return null;
end;
$$;
revoke execute on function public.app_bh_event_links_changed() from public, anon, authenticated;
drop trigger if exists app_bh_event_links_changed on public.app_bh_event_links;
create trigger app_bh_event_links_changed
  after insert or update of url, title, starts_at, ends_at, venue, category on public.app_bh_event_links
  for each row execute function public.app_bh_event_links_changed();

-- Todo dia às 06:15 de BH (09:15 UTC).
select cron.schedule('app-events-sync-daily', '15 9 * * *', 'select public.app_bh_events_run_sync()');

-- ---------- acesso: o app passa pela app-events (chave de serviço); a equipe pelo painel ----------
alter table public.app_bh_events enable row level security;
alter table public.app_bh_event_links enable row level security;
alter table public.app_bh_source_pages enable row level security;
alter table public.app_bh_sync_runs enable row level security;

revoke all on public.app_bh_events, public.app_bh_event_links, public.app_bh_source_pages, public.app_bh_sync_runs
  from anon, authenticated;
grant select, update, delete on public.app_bh_events to authenticated;
grant select, insert, update, delete on public.app_bh_event_links to authenticated;
grant select on public.app_bh_source_pages, public.app_bh_sync_runs to authenticated;

drop policy if exists "Equipe le e corrige eventos" on public.app_bh_events;
create policy "Equipe le e corrige eventos" on public.app_bh_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe cola links de eventos" on public.app_bh_event_links;
create policy "Equipe cola links de eventos" on public.app_bh_event_links for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe ve as paginas lidas" on public.app_bh_source_pages;
create policy "Equipe ve as paginas lidas" on public.app_bh_source_pages for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe ve as execucoes" on public.app_bh_sync_runs;
create policy "Equipe ve as execucoes" on public.app_bh_sync_runs for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

-- ===== 014_acesso_e_conta.sql =====

-- Onda 3, o resto do login (09/11/2026).
--   - convite pelo painel: a equipe gera a senha provisória (função app-admin) e manda por WhatsApp ou e-mail;
--   - "esqueci a senha": código de 6 dígitos por e-mail (se houver RESEND_API_KEY) ou pedido na fila do painel;
--   - acesso que termina sozinho 30 dias depois da saída;
--   - excluir a conta pelo próprio app (exigência das lojas).
-- Só acrescenta: colunas novas em app_students e tabelas app_*. Nada do site muda.

alter table public.app_students add column if not exists invited_at timestamptz;
alter table public.app_students add column if not exists invited_by uuid;
alter table public.app_students add column if not exists deleted_at timestamptz;

-- Pedido de nova senha. code_hash só existe quando o código saiu por e-mail; sem e-mail, a equipe resolve
-- pelo painel (gera outra senha provisória) e marca handled_at.
create table if not exists public.app_password_resets (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  channel text not null check (channel in ('email', 'team')),
  code_hash text,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  handled_at timestamptz,
  handled_by uuid,
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  created_at timestamptz not null default now(),
  check ((channel = 'email') = (code_hash is not null))
);
create index if not exists app_password_resets_cp on public.app_password_resets (counterparty_id, created_at desc);

-- Quem apagou a conta pelo app, para a equipe saber (o contrato e o financeiro ficam com a Chez Toi).
create table if not exists public.app_account_deletions (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  deleted_at timestamptz not null default now()
);

alter table public.app_password_resets enable row level security;
alter table public.app_account_deletions enable row level security;

-- Até quando o aluno ainda entra: a maior data de saída das locações ativas dele, mais 30 dias
-- (prazo para baixar contrato, recibos e o laudo). Null quando não há locação: quem decide é a app_rental_for.
create or replace function public.app_access_until(p_cp uuid)
returns date language sql stable security definer set search_path to 'public' as $$
  select max(r.end_date) + 30
  from public.rental_tenants t
  join public.apartment_rentals r on r.id = t.rental_id
  where t.counterparty_id = p_cp and t.is_active and r.status = 'active'
$$;
revoke all on function public.app_access_until(uuid) from public, anon, authenticated;

-- ---------- painel (login do site, papéis admin e equipe) ----------
drop policy if exists "Equipe le acesso dos alunos" on public.app_students;
create policy "Equipe le acesso dos alunos" on public.app_students for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le pedidos de nova senha" on public.app_password_resets;
create policy "Equipe le pedidos de nova senha" on public.app_password_resets for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le contas apagadas" on public.app_account_deletions;
create policy "Equipe le contas apagadas" on public.app_account_deletions for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_students, public.app_password_resets, public.app_account_deletions to authenticated;
-- Convidar, gerar senha, desligar e religar: só pela função app-admin (o hash nunca passa pelo navegador).

-- ===== 015_comunidade.sql =====

-- Onda 15, comunidade (09/11/2026). Pedido do Daniel: mural, eventos da Chez Toi e viagens em grupo,
-- "vamos usar a IA pra moderar também e a gente participa dessa moderação".
--
-- Quem participa: só alunos com acesso ativo e locação no período (a função app-community confere).
-- Moderação, em três camadas:
--   1. IA antes de publicar (função app-community): ok → publica; review → espera a equipe; block → não publica
--      e explica ao aluno. Sem a chave da IA, publica e marca 'unchecked' para a equipe conferir.
--   2. Denúncia dos alunos: 3 pessoas diferentes escondem o conteúdo até a equipe decidir.
--   3. Equipe no painel: app_team_moderate (publicar ou retirar) e app_team_suspend (tirar alguém da comunidade).
-- Bloquear: o aluno deixa de ver o que a pessoa publica, e ela deixa de ver o dele.

-- ---------- mural ----------
create table if not exists public.app_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  -- locação do autor quando publicou: define quem vê um post 'apartment'
  rental_id uuid references public.apartment_rentals(id) on delete cascade,
  scope text not null check (scope in ('apartment', 'all')),
  kind text not null default 'post' check (kind in ('post', 'question', 'giveaway')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,          -- { pt, fr, en }: pt para a equipe, fr/en para o aluno
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,         -- código do motivo (ver app_team_moderate)
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scope <> 'apartment' or rental_id is not null)
);
create index if not exists app_community_posts_feed on public.app_community_posts (status, scope, created_at desc);

create table if not exists public.app_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.app_community_posts(id) on delete cascade,
  author_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_community_comments_post on public.app_community_comments (post_id, created_at);

-- ---------- viagens em grupo ----------
create table if not exists public.app_trips (
  id uuid primary key default gen_random_uuid(),
  creator_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  destination text not null check (char_length(trim(destination)) between 2 and 80),
  -- destino da aba Voyages (src/lib/travel), quando o aluno escolhe um de lá
  destination_id text check (destination_id is null or destination_id ~ '^[a-z0-9-]{1,60}$'),
  starts_on date not null,
  ends_on date not null,
  seats integer check (seats is null or seats between 2 and 30),
  description text check (description is null or char_length(description) <= 600),
  -- (whatsapp_link: a 019b tirou a coluna no dev; aqui ela nem é criada)
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed', 'cancelled')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists app_trips_open on public.app_trips (status, starts_on);

create table if not exists public.app_trip_members (
  trip_id uuid not null references public.app_trips(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trip_id, counterparty_id)
);

-- ---------- eventos da Chez Toi (a equipe cria no painel; o aluno confirma presença) ----------
create table if not exists public.app_community_events (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,                       -- { fr, en }
  description jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null check (char_length(trim(venue)) between 1 and 120),
  address text check (address is null or char_length(address) <= 200),
  capacity integer check (capacity is null or capacity between 1 and 1000),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (title ? 'fr' and title ? 'en')
);

create table if not exists public.app_community_event_rsvps (
  event_id uuid not null references public.app_community_events(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  going boolean not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, counterparty_id)
);

-- ---------- denúncia, bloqueio, suspensão, carta da comunidade, histórico ----------
create table if not exists public.app_community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'trip')),
  target_id uuid not null,
  reporter_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'danger', 'personal_data', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text check (resolution in ('kept', 'removed')),
  unique (target_type, target_id, reporter_cp)
);
create index if not exists app_community_reports_open on public.app_community_reports (created_at) where resolved_at is null;

create table if not exists public.app_community_blocks (
  blocker_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  blocked_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_cp, blocked_cp),
  check (blocker_cp <> blocked_cp)
);

create table if not exists public.app_community_suspensions (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  until timestamptz not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Carta da comunidade aceita antes de publicar (exigência das lojas para conteúdo de usuário).
create table if not exists public.app_community_terms (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}$'),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  accepted_at timestamptz not null default now()
);

create table if not exists public.app_moderation_log (
  id bigint generated always as identity primary key,
  target_type text not null,
  target_id uuid not null,
  actor text not null check (actor in ('ai', 'reports', 'team', 'author')),
  actor_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists app_moderation_log_target on public.app_moderation_log (target_type, target_id, created_at);

alter table public.app_community_posts enable row level security;
alter table public.app_community_comments enable row level security;
alter table public.app_trips enable row level security;
alter table public.app_trip_members enable row level security;
alter table public.app_community_events enable row level security;
alter table public.app_community_event_rsvps enable row level security;
alter table public.app_community_reports enable row level security;
alter table public.app_community_blocks enable row level security;
alter table public.app_community_suspensions enable row level security;
alter table public.app_community_terms enable row level security;
alter table public.app_moderation_log enable row level security;

-- ---------- evento publicado vira aviso no sino de todos ----------
create or replace function public.app_community_events_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_when text := to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement Chez Toi : ' || (new.title->>'fr'), 'en', 'Chez Toi event: ' || (new.title->>'en')),
      jsonb_build_object('fr', v_when || ' · ' || new.venue, 'en', v_when || ' · ' || new.venue),
      '/community/events/' || new.id, new.created_by);
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'published' then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement annulé : ' || (new.title->>'fr'), 'en', 'Event cancelled: ' || (new.title->>'en')),
      jsonb_build_object('fr', v_when || ' · ' || new.venue, 'en', v_when || ' · ' || new.venue),
      '/community/events/' || new.id, new.created_by);
  end if;
  return null;
end;
$$;
revoke execute on function public.app_community_events_notify() from public, anon, authenticated;

create or replace function public.app_community_events_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_community_events_touch on public.app_community_events;
create trigger app_community_events_touch before update on public.app_community_events
  for each row execute function public.app_community_events_touch();
drop trigger if exists app_community_events_notify on public.app_community_events;
create trigger app_community_events_notify after insert or update of status on public.app_community_events
  for each row execute function public.app_community_events_notify();

-- ---------- decisões da equipe (painel) ----------
-- Motivos que o aluno vê, nas duas línguas. A equipe escolhe um código; o texto livre fica só no histórico.
create or replace function public.app_moderation_reason(p_code text)
returns jsonb language sql immutable as $$
  select case p_code
    when 'spam' then '{"fr":"Publicité ou message répété.","en":"Advertising or repeated message."}'
    when 'harassment' then '{"fr":"Propos blessants envers une personne.","en":"Hurtful words towards someone."}'
    when 'inappropriate' then '{"fr":"Contenu inapproprié.","en":"Inappropriate content."}'
    when 'danger' then '{"fr":"Contenu qui peut mettre quelqu''un en danger.","en":"Content that may put someone at risk."}'
    when 'personal_data' then '{"fr":"Données personnelles de quelqu''un.","en":"Someone''s personal data."}'
    when 'off_topic' then '{"fr":"Hors sujet pour la communauté.","en":"Off topic for the community."}'
    else '{"fr":"Ne respecte pas la charte de la communauté.","en":"Does not follow the community guidelines."}'
  end::jsonb
$$;

-- p_action: 'publish' (manter ou devolver ao ar) ou 'remove' (retirar e avisar o autor).
create or replace function public.app_team_moderate(p_type text, p_id uuid, p_action text, p_reason text default null, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_author uuid;
  v_status text;
  v_decision text;
  v_reason jsonb;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('publish', 'remove') then raise exception 'bad action'; end if;
  v_status := case p_action when 'publish' then 'published' else 'removed' end;
  v_decision := case p_action when 'publish' then 'kept' else 'removed' end;

  if p_type = 'post' then
    update public.app_community_posts
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id returning author_cp into v_author;
  elsif p_type = 'comment' then
    update public.app_community_comments
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now()
      where id = p_id returning author_cp into v_author;
  elsif p_type = 'trip' then
    update public.app_trips
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id and status <> 'cancelled' returning creator_cp into v_author;
  else
    raise exception 'bad type';
  end if;
  if v_author is null then raise exception 'not found'; end if;

  update public.app_community_reports
    set resolved_at = now(), resolved_by = auth.uid(), resolution = v_decision
    where target_type = p_type and target_id = p_id and resolved_at is null;
  insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action, reason)
    values (p_type, p_id, 'team', auth.uid(), v_status, concat_ws(' · ', p_reason, nullif(trim(p_note), '')));

  if p_action = 'remove' then
    v_reason := public.app_moderation_reason(p_reason);
    insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
    values ('student', v_author,
      jsonb_build_object('fr', 'Votre publication a été retirée', 'en', 'Your post was removed'),
      jsonb_build_object('fr', 'Motif : ' || (v_reason->>'fr'), 'en', 'Reason: ' || (v_reason->>'en')),
      '/community/charter', auth.uid());
  end if;
end;
$$;

-- Tira alguém da comunidade por p_days (0 = devolve). O aluno continua usando o resto do app.
create or replace function public.app_team_suspend(p_cp uuid, p_days integer, p_reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_reason jsonb := public.app_moderation_reason(p_reason);
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_days is null or p_days < 0 or p_days > 365 then raise exception 'bad days'; end if;
  if p_days = 0 then
    delete from public.app_community_suspensions where counterparty_id = p_cp;
    insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action)
      values ('student', p_cp, 'team', auth.uid(), 'unsuspended');
    return;
  end if;
  insert into public.app_community_suspensions (counterparty_id, until, reason, created_by)
    values (p_cp, now() + make_interval(days => p_days), coalesce(p_reason, 'other'), auth.uid())
    on conflict (counterparty_id) do update set until = excluded.until, reason = excluded.reason, created_by = excluded.created_by, created_at = now();
  insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action, reason)
    values ('student', p_cp, 'team', auth.uid(), 'suspended', p_days || ' dias · ' || coalesce(p_reason, 'other'));
  insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
  values ('student', p_cp,
    jsonb_build_object('fr', 'Accès à la communauté suspendu', 'en', 'Community access suspended'),
    jsonb_build_object('fr', p_days || ' jours. Motif : ' || (v_reason->>'fr'), 'en', p_days || ' days. Reason: ' || (v_reason->>'en')),
    '/community/charter', auth.uid());
end;
$$;
revoke execute on function public.app_team_moderate(text, uuid, text, text, text) from public, anon;
revoke execute on function public.app_team_suspend(uuid, integer, text) from public, anon;
grant execute on function public.app_team_moderate(text, uuid, text, text, text) to authenticated;
grant execute on function public.app_team_suspend(uuid, integer, text) to authenticated;

-- ---------- painel: a equipe lê tudo, cria eventos; decide só pelas funções acima ----------
drop policy if exists "Equipe le posts" on public.app_community_posts;
create policy "Equipe le posts" on public.app_community_posts for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le comentarios" on public.app_community_comments;
create policy "Equipe le comentarios" on public.app_community_comments for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le viagens" on public.app_trips;
create policy "Equipe le viagens" on public.app_trips for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le participantes" on public.app_trip_members;
create policy "Equipe le participantes" on public.app_trip_members for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le denuncias" on public.app_community_reports;
create policy "Equipe le denuncias" on public.app_community_reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le suspensoes" on public.app_community_suspensions;
create policy "Equipe le suspensoes" on public.app_community_suspensions for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le historico de moderacao" on public.app_moderation_log;
create policy "Equipe le historico de moderacao" on public.app_moderation_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le presencas" on public.app_community_event_rsvps;
create policy "Equipe le presencas" on public.app_community_event_rsvps for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe cria e edita eventos" on public.app_community_events;
create policy "Equipe cria e edita eventos" on public.app_community_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_community_posts, public.app_community_comments, public.app_trips, public.app_trip_members,
  public.app_community_reports, public.app_community_suspensions, public.app_moderation_log,
  public.app_community_event_rsvps to authenticated;
grant select, insert, update, delete on public.app_community_events to authenticated;

-- ===== 016_avaliacao_e_indicacao.sql =====

-- Onda 14, avaliação, feedback e indicação (09/11/2026).
-- A nota de cada serviço concluído já existe (app_requests.rating, onda 6). Aqui:
--   - feedback geral para a Chez Toi a qualquer momento, com resposta da equipe que volta ao app (sino);
--   - pesquisa de satisfação no meio e no fim da estadia (nota 0 a 10 + 4 notas de 1 a 5), com a opção de
--     autorizar o comentário como depoimento;
--   - indique um amigo: código pessoal do aluno; a equipe registra no painel os amigos que chegaram com o código.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid references public.apartment_rentals(id) on delete set null,
  topic text not null default 'general' check (topic in ('general', 'apartment', 'cleaning', 'team', 'app', 'idea')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply text check (reply is null or char_length(reply) <= 2000),
  replied_at timestamptz,
  replied_by uuid,
  reply_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_feedback_student on public.app_feedback (counterparty_id, created_at desc);
create index if not exists app_feedback_open on public.app_feedback (created_at) where status = 'open';

create table if not exists public.app_surveys (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  kind text not null check (kind in ('mid', 'end')),
  nps smallint not null check (nps between 0 and 10),
  -- { apartment, cleaning, team, app }: 1 a 5 cada, todas opcionais
  scores jsonb not null default '{}'::jsonb,
  comment text check (comment is null or char_length(comment) <= 2000),
  testimonial_ok boolean not null default false,
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  created_at timestamptz not null default now(),
  unique (counterparty_id, rental_id, kind)
);

create table if not exists public.app_referral_codes (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.app_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  friend_name text not null check (char_length(trim(friend_name)) between 1 and 80),
  friend_contact text check (friend_contact is null or char_length(friend_contact) <= 120),
  status text not null default 'lead' check (status in ('lead', 'visit', 'signed', 'rewarded', 'lost')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_referrals_referrer on public.app_referrals (referrer_cp, created_at desc);

-- Regras do programa, editáveis no painel. reward vazio = o app não promete recompensa.
create table if not exists public.app_referral_program (
  id boolean primary key default true check (id),
  active boolean not null default true,
  reward jsonb not null default '{}'::jsonb,   -- { fr, en }
  terms jsonb not null default '{}'::jsonb,    -- { fr, en }
  updated_at timestamptz not null default now()
);
insert into public.app_referral_program (id) values (true) on conflict (id) do nothing;

alter table public.app_feedback enable row level security;
alter table public.app_surveys enable row level security;
alter table public.app_referral_codes enable row level security;
alter table public.app_referrals enable row level security;
alter table public.app_referral_program enable row level security;

-- ---------- resposta da equipe e indicação que avançou viram aviso no sino ----------
create or replace function public.app_feedback_stamp()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.reply is distinct from old.reply and new.reply is not null and trim(new.reply) <> '' then
    new.status := 'answered';
    new.replied_at := now();
    new.replied_by := coalesce(auth.uid(), new.replied_by);
    new.reply_read_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.app_feedback_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.reply is distinct from old.reply and new.reply is not null and trim(new.reply) <> '' then
    insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
    values ('student', new.counterparty_id,
      jsonb_build_object('fr', 'La Chez Toi a répondu à votre avis', 'en', 'Chez Toi replied to your feedback'),
      jsonb_build_object('fr', left(new.reply, 140), 'en', left(new.reply, 140)),
      '/feedback', new.replied_by);
  end if;
  return null;
end;
$$;

create or replace function public.app_referrals_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.app_referrals_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status is distinct from old.status and new.status in ('signed', 'rewarded') then
    insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
    values ('student', new.referrer_cp,
      case new.status
        when 'signed' then jsonb_build_object('fr', new.friend_name || ' a rejoint la Chez Toi', 'en', new.friend_name || ' joined Chez Toi')
        else jsonb_build_object('fr', 'Votre récompense de parrainage est prête', 'en', 'Your referral reward is ready')
      end,
      case new.status
        when 'signed' then jsonb_build_object('fr', 'Merci pour votre recommandation !', 'en', 'Thank you for the recommendation!')
        else jsonb_build_object('fr', 'La Chez Toi vous contacte pour la remettre.', 'en', 'Chez Toi will contact you to hand it over.')
      end,
      '/referral', auth.uid());
  end if;
  return null;
end;
$$;
revoke execute on function public.app_feedback_notify() from public, anon, authenticated;
revoke execute on function public.app_referrals_notify() from public, anon, authenticated;

drop trigger if exists app_feedback_stamp on public.app_feedback;
create trigger app_feedback_stamp before update on public.app_feedback
  for each row execute function public.app_feedback_stamp();
drop trigger if exists app_feedback_notify on public.app_feedback;
create trigger app_feedback_notify after update of reply on public.app_feedback
  for each row execute function public.app_feedback_notify();
drop trigger if exists app_referrals_touch on public.app_referrals;
create trigger app_referrals_touch before update on public.app_referrals
  for each row execute function public.app_referrals_touch();
drop trigger if exists app_referrals_notify on public.app_referrals;
create trigger app_referrals_notify after update of status on public.app_referrals
  for each row execute function public.app_referrals_notify();

-- ---------- painel ----------
drop policy if exists "Equipe le feedback" on public.app_feedback;
create policy "Equipe le feedback" on public.app_feedback for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe responde feedback" on public.app_feedback;
create policy "Equipe responde feedback" on public.app_feedback for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le pesquisas" on public.app_surveys;
create policy "Equipe le pesquisas" on public.app_surveys for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le codigos de indicacao" on public.app_referral_codes;
create policy "Equipe le codigos de indicacao" on public.app_referral_codes for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe registra indicacoes" on public.app_referrals;
create policy "Equipe registra indicacoes" on public.app_referrals for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe edita o programa de indicacao" on public.app_referral_program;
create policy "Equipe edita o programa de indicacao" on public.app_referral_program for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_feedback, public.app_surveys, public.app_referral_codes to authenticated;
grant update (reply, status) on public.app_feedback to authenticated;
grant select, insert, update, delete on public.app_referrals to authenticated;
grant select, insert, update on public.app_referral_program to authenticated;

-- ===== 017_painel_da_equipe.sql =====

-- O que faltava para as telas do painel (09/11/2026) lerem e mexerem nas tabelas do app que já
-- existiam: fila de pedidos (onda 6), faxineira de cada apartamento (011) e fotos dos chamados.
-- Encomendas, links da agenda, avisos e faxineiras já tinham política (008, 011, 012, 013).

-- Fila de pedidos: a equipe lê tudo e muda só o andamento, o recado, a taxa e a data.
-- A linha do tempo (app_request_events) é escrita pelo gatilho app_requests_log, não pelo painel.
drop policy if exists "Equipe le pedidos" on public.app_requests;
create policy "Equipe le pedidos" on public.app_requests for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe atende pedidos" on public.app_requests;
create policy "Equipe atende pedidos" on public.app_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le linha do tempo dos pedidos" on public.app_request_events;
create policy "Equipe le linha do tempo dos pedidos" on public.app_request_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_requests, public.app_request_events to authenticated;
grant update (status, team_note, fee_cents, billing_month, scheduled_date, start_time, end_time) on public.app_requests to authenticated;

-- Fotos dos chamados de manutenção (bucket privado): a equipe abre por link temporário.
-- Política em storage.objects, mas só para o bucket app-request-photos.
drop policy if exists "Equipe ve fotos dos chamados" on storage.objects;
create policy "Equipe ve fotos dos chamados" on storage.objects for select to authenticated
  using (bucket_id = 'app-request-photos'
         and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')));

-- Ficha do apartamento no app: a equipe lê e escolhe a faxineira (o resto da ficha fica para a onda 4).
drop policy if exists "Equipe le ficha do apartamento" on public.app_apartment_info;
create policy "Equipe le ficha do apartamento" on public.app_apartment_info for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe escolhe a faxineira" on public.app_apartment_info;
create policy "Equipe escolhe a faxineira" on public.app_apartment_info for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_apartment_info to authenticated;
grant update (cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- Apartamento que ainda não tem ficha no app: a equipe cria a linha ao escolher a faxineira.
drop policy if exists "Equipe cria ficha do apartamento" on public.app_apartment_info;
create policy "Equipe cria ficha do apartamento" on public.app_apartment_info for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant insert (apartment_id, cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- Quantos alunos leram cada aviso (tela de avisos do painel).
drop policy if exists "Equipe ve quem leu os avisos" on public.app_notice_reads;
create policy "Equipe ve quem leu os avisos" on public.app_notice_reads for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_notice_reads to authenticated;

-- ===== 019_sem_links_e_conversa_da_viagem.sql =====

-- (09/11/2026) Pedido do Daniel: "eles não devem poder colocar um link aí, porque se for malicioso nos
-- complicamos. Em nenhum lugar, na verdade". Duas mudanças:
--
-- 1) Nenhum texto escrito pelo aluno aceita link. app_has_link reconhece http(s)://, www. e nome de domínio
--    (exemplo.com, bit.ly/x, wa.me/…, e-mail). As regras valem para linhas novas e editadas (NOT VALID: o que já
--    existe não é conferido). As funções e o app avisam antes, com mensagem clara; o banco é a última barreira.
--    O Instagram do perfil continua: aceita só o nome de usuário (012), e o app monta o endereço do Instagram.
-- 2) A viagem em grupo perde o link do grupo do WhatsApp; no lugar, uma conversa da viagem dentro do app, só para
--    quem vai, moderada como os comentários do mural (app_community_comments.trip_id).

create or replace function public.app_has_link(t text)
returns boolean language sql immutable as $$
  select coalesce(t, '') ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|br|fr|io|me|ly|gl|co|app|link|info|xyz|site|online|shop|store|tv|gg|to|be|us|eu|es|it|de|uk|ai|dev|page|club|live|click|top|vip|lat|pro|biz|cc|ws|tk|gov|edu)\M)'
$$;

-- As mesmas regras da 019, uma a uma; cada uma só entra se ainda não existir.
-- app_expenses e app_cleaning_feedback já existem na produção com linhas: NOT VALID não confere as antigas.
do $$
declare r record;
begin
  for r in select * from (values
    ('app_community_posts', 'app_community_posts_no_links', 'check (not public.app_has_link(body)) not valid'),
    ('app_community_comments', 'app_community_comments_no_links', 'check (not public.app_has_link(body)) not valid'),
    ('app_trips', 'app_trips_no_links',
     'check (not public.app_has_link(destination) and not public.app_has_link(description)) not valid'),
    ('app_community_reports', 'app_community_reports_no_links', 'check (not public.app_has_link(note)) not valid'),
    ('app_feedback', 'app_feedback_no_links', 'check (not public.app_has_link(body)) not valid'),
    ('app_surveys', 'app_surveys_no_links', 'check (not public.app_has_link(comment)) not valid'),
    ('app_visitors', 'app_visitors_no_links',
     'check (not public.app_has_link(name) and not public.app_has_link(note)) not valid'),
    ('app_packages', 'app_packages_no_links',
     'check (not public.app_has_link(description) and not public.app_has_link(carrier)) not valid'),
    ('app_profiles', 'app_profiles_no_links',
     'check (not public.app_has_link(school) and not public.app_has_link(hometown) and not public.app_has_link(about)) not valid'),
    ('app_expenses', 'app_expenses_no_links', 'check (not public.app_has_link(description)) not valid'),
    ('app_chores', 'app_chores_no_links', 'check (not public.app_has_link(name)) not valid'),
    ('app_cleaning_feedback', 'app_cleaning_feedback_no_links', 'check (not public.app_has_link(comment)) not valid'),
    ('app_requests', 'app_requests_no_links',
     'check (not public.app_has_link(description) and not public.app_has_link(note) and not public.app_has_link(room) and not public.app_has_link(rating_comment)) not valid')
  ) as v(tbl, con, def) loop
    if not exists (select 1 from pg_constraint
                   where conname = r.con and conrelid = format('public.%I', r.tbl)::regclass) then
      execute format('alter table public.%I add constraint %I %s', r.tbl, r.con, r.def);
    end if;
  end loop;
end;
$$;

-- 2) conversa da viagem
alter table public.app_community_comments alter column post_id drop not null;
alter table public.app_community_comments add column if not exists trip_id uuid references public.app_trips(id) on delete cascade;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_community_comments_one_parent'
                 and conrelid = 'public.app_community_comments'::regclass) then
    alter table public.app_community_comments add constraint app_community_comments_one_parent
      check ((post_id is null) <> (trip_id is null));
  end if;
end;
$$;
create index if not exists app_community_comments_trip on public.app_community_comments (trip_id, created_at) where trip_id is not null;

-- 019b (tirar app_trips.whatsapp_link): resolvida na seção 015, onde a coluna não é criada.

-- ===== 020_primeiro_acesso.sql =====

-- Primeiro acesso ligado à ficha do site (09/11/2026). Pedido do Daniel: "tem que ter a tela de primeiro
-- acesso, ligada à ficha de estudante do site"; a prova de identidade é data de nascimento + número do passaporte,
-- os dois vindos da ficha (finance_counterparties). O aluno se ativa sozinho, sem a equipe gerar senha.
--
-- Fluxo (rotas first-access-* da app-api): e-mail do contrato + nascimento + passaporte → a ficha confere e tem
-- locação ativa (app_access_until) → o aluno vê o resumo da ficha (pode pedir correção) → escolhe a senha → entra.
-- O app nunca escreve na ficha do site: correções vão para app_profile_corrections, que a equipe vê no painel.
-- Ficha sem passaporte: o pedido cai na fila do painel (app_password_resets, canal 'team'), como o "esqueci a senha".

alter table public.app_students add column if not exists activated_at timestamptz;

-- Tentativas, para limitar quem tenta adivinhar (5 erradas por e-mail por hora). O e-mail fica só como hash.
create table if not exists public.app_first_access_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists app_first_access_attempts_email on public.app_first_access_attempts (email_hash, created_at desc);

-- "Corriger" na tela Vos informations: o aluno descreve, a equipe corrige a ficha no site e marca como resolvido.
create table if not exists public.app_profile_corrections (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 1000 and not public.app_has_link(message)),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid
);
create index if not exists app_profile_corrections_open on public.app_profile_corrections (created_at) where handled_at is null;

alter table public.app_first_access_attempts enable row level security;
alter table public.app_profile_corrections enable row level security;

drop policy if exists "Equipe le correcoes da ficha" on public.app_profile_corrections;
create policy "Equipe le correcoes da ficha" on public.app_profile_corrections for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe resolve correcoes da ficha" on public.app_profile_corrections;
create policy "Equipe resolve correcoes da ficha" on public.app_profile_corrections for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_profile_corrections to authenticated;
grant update (handled_at, handled_by) on public.app_profile_corrections to authenticated;

-- (FORA: os passaportes e telefones fictícios que o fim da 020 grava na ficha do site.)

-- ===== 021_seguranca.sql =====

-- Correções da revisão de segurança (09/11/2026).
-- FORA: o bloco 6 (EXECUTE de anon numa função de papéis do site); ela é do site e não muda aqui.
--
-- 1. app_session_state: o token só vale com a conta ativa, a versão da sessão certa e o acesso ainda aberto
--    (app_access_until, data de BH). Todas as Edge Functions chamam esta função no lugar de ler app_students.
-- 2. Contadores atômicos (antes era "conta e depois grava", dava para passar do limite com pedidos em paralelo):
--    app_rate_take / app_rate_refund (login, primeiro acesso, pedidos de nova senha, comunidade, denúncias da
--    Charlotte), app_reset_take_attempt (tentativas do código de 6 dígitos), app_assistant_reserve (cota da
--    Charlotte: a linha de uso é reservada antes de chamar o modelo).
-- 3. app_assistant_reports: "a resposta da Charlotte está errada" (rota report da app-assistant), lida pela equipe.
-- 4. app_account_delete: a exclusão da conta numa transação só (antes eram ~20 chamadas soltas).
-- 5. Grants: anon e authenticated perdem tudo nas tabelas app_*; authenticated recebe de volta só o que o painel do
--    site usa (src/hooks/app-panel/*.ts e useAppServiceCatalog.ts, branch app/painel-do-app). O hash da senha
--    (app_students.password_hash) e o do código (app_password_resets.code_hash) ficam fora do SELECT.
-- Funções: security definer, search_path vazio, EXECUTE só para service_role (as Edge Functions).

-- ---------- 1. sessão ----------
create or replace function public.app_session_state(p_cp uuid, p_version integer)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.counterparty_id is null or s.status <> 'active' or s.session_version is distinct from p_version then 'invalid'
    when public.app_access_until(p_cp) < (now() at time zone 'America/Sao_Paulo')::date then 'ended'
    else 'ok'
  end
  from (select 1) as one
  left join public.app_students s on s.counterparty_id = p_cp
$$;

-- ---------- 2. contadores atômicos ----------
-- Uma linha por tentativa, por balde ('login', 'first_access', 'reset_request', 'community_write',
-- 'assistant_report') e chave (hash do e-mail, hash do IP ou o id do aluno). Linhas com mais de 2 dias somem sozinhas.
create table if not exists public.app_rate_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists app_rate_events_lookup on public.app_rate_events (bucket, key, created_at desc);
create index if not exists app_rate_events_age on public.app_rate_events (created_at);
alter table public.app_rate_events enable row level security;

-- Reserva uma tentativa em cada chave, se nenhuma passou do limite na janela: devolve os ids reservados, ou null.
-- O trava-por-chave (advisory lock da transação) faz o "conta e grava" valer como um passo só.
create or replace function public.app_rate_take(p_bucket text, p_keys text[], p_limits integer[], p_window_seconds integer)
returns bigint[] language plpgsql security definer set search_path = '' as $$
declare
  k text;
  i integer;
  n integer;
  ids bigint[] := '{}';
  new_id bigint;
begin
  if p_keys is null or cardinality(p_keys) = 0 or cardinality(p_keys) <> cardinality(p_limits) then
    raise exception 'app_rate_take: keys and limits must have the same size';
  end if;
  -- sempre na mesma ordem, para dois pedidos com as mesmas chaves não se travarem um ao outro
  for k in select distinct x from unnest(p_keys) as x order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || k, 0));
  end loop;
  for i in 1 .. cardinality(p_keys) loop
    select count(*) into n from public.app_rate_events
      where bucket = p_bucket and key = p_keys[i] and created_at > now() - make_interval(secs => p_window_seconds);
    if n >= p_limits[i] then
      return null;
    end if;
  end loop;
  for i in 1 .. cardinality(p_keys) loop
    insert into public.app_rate_events (bucket, key) values (p_bucket, p_keys[i]) returning id into new_id;
    ids := ids || new_id;
  end loop;
  if random() < 0.02 then
    delete from public.app_rate_events where created_at < now() - interval '2 days';
  end if;
  return ids;
end;
$$;

-- Devolve tentativas reservadas (login certo, primeiro acesso que conferiu): só os erros contam.
create or replace function public.app_rate_refund(p_ids bigint[])
returns void language sql security definer set search_path = '' as $$
  delete from public.app_rate_events where id = any(p_ids)
$$;

-- Gasta uma tentativa do código de 6 dígitos antes de comparar; false quando acabou, venceu ou já foi usado.
create or replace function public.app_reset_take_attempt(p_id uuid, p_max integer)
returns boolean language sql security definer set search_path = '' as $$
  with taken as (
    update public.app_password_resets set attempts = attempts + 1
    where id = p_id and used_at is null and expires_at > now() and attempts < p_max
    returning 1
  )
  select exists (select 1 from taken)
$$;

-- Cota diária da Charlotte (24 h corridas): reserva a linha de uso antes de chamar o modelo; null quando acabou.
create or replace function public.app_assistant_reserve(p_cp uuid, p_limit integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('assistant:' || p_cp::text, 0));
  select count(*) into n from public.app_assistant_usage
    where counterparty_id = p_cp and created_at > now() - interval '24 hours';
  if n >= p_limit then
    return null;
  end if;
  insert into public.app_assistant_usage (counterparty_id, model) values (p_cp, 'pending') returning id into new_id;
  return new_id;
end;
$$;

-- ---------- 3. respostas da Charlotte marcadas como erradas ----------
create table if not exists public.app_assistant_reports (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 4000),
  question text check (question is null or char_length(question) <= 2000),
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid
);
create index if not exists app_assistant_reports_open on public.app_assistant_reports (created_at desc) where handled_at is null;
alter table public.app_assistant_reports enable row level security;
drop policy if exists "Equipe le respostas marcadas da Charlotte" on public.app_assistant_reports;
create policy "Equipe le respostas marcadas da Charlotte" on public.app_assistant_reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

-- ---------- 4. excluir a conta ----------
-- Chamada pela app-api (account-delete) depois de conferir a senha. p_version: a sessão que pediu ainda tem de ser a
-- atual (false se não for). Apaga o que é só do app e do aluno; ficam com a Chez Toi o contrato, os pagamentos, os
-- pedidos (faturados, sem as fotos), as despesas divididas com os colegas, as indicações e o aceite das regras.
-- Tarefas da casa: só o passado que fala só dele (faxina feita por ele, troca que ele fez para si mesmo); a semana
-- atual e as próximas ficam, porque mudariam a escala dos colegas. As fotos dos chamados saem do bucket na função.
create or replace function public.app_account_delete(p_cp uuid, p_version integer, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_posts uuid[];
  v_trips uuid[];
  v_comments uuid[];
  v_week date;
begin
  update public.app_students
     set status = 'disabled', password_hash = null, display_name = null, must_change_password = true,
         session_version = session_version + 1, deleted_at = now(), updated_at = now()
   where counterparty_id = p_cp and session_version = p_version and status = 'active';
  if not found then
    return false;
  end if;

  select coalesce(array_agg(id), '{}') into v_posts from public.app_community_posts where author_cp = p_cp;
  select coalesce(array_agg(id), '{}') into v_trips from public.app_trips where creator_cp = p_cp;
  -- os comentários dele e os que somem junto com os posts e as viagens dele (on delete cascade)
  select coalesce(array_agg(id), '{}') into v_comments from public.app_community_comments
   where author_cp = p_cp or post_id = any(v_posts) or trip_id = any(v_trips);

  delete from public.app_moderation_log
   where actor_id = p_cp or target_id = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));
  delete from public.app_community_reports
   where reporter_cp = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));

  delete from public.app_community_posts where author_cp = p_cp;
  delete from public.app_trips where creator_cp = p_cp;
  delete from public.app_community_comments where author_cp = p_cp;
  delete from public.app_trip_members where counterparty_id = p_cp;
  delete from public.app_community_event_rsvps where counterparty_id = p_cp;
  delete from public.app_community_blocks where blocker_cp = p_cp or blocked_cp = p_cp;
  delete from public.app_community_terms where counterparty_id = p_cp;
  delete from public.app_community_suspensions where counterparty_id = p_cp;

  delete from public.app_profiles where counterparty_id = p_cp;
  delete from public.app_devices where counterparty_id = p_cp;
  delete from public.app_feedback where counterparty_id = p_cp;
  delete from public.app_surveys where counterparty_id = p_cp;
  delete from public.app_referral_codes where counterparty_id = p_cp;
  delete from public.app_cleaning_feedback where counterparty_id = p_cp;
  delete from public.app_visitors where counterparty_id = p_cp;
  delete from public.app_packages where counterparty_id = p_cp;
  delete from public.app_notice_reads where counterparty_id = p_cp;
  delete from public.app_notices where counterparty_id = p_cp;
  delete from public.app_password_resets where counterparty_id = p_cp;
  delete from public.app_profile_corrections where counterparty_id = p_cp;
  delete from public.app_events where counterparty_id = p_cp;
  delete from public.app_assistant_usage where counterparty_id = p_cp;
  delete from public.app_assistant_reports where counterparty_id = p_cp;
  delete from public.app_rate_events where key = p_cp::text;

  v_week := (now() at time zone 'America/Sao_Paulo')::date;
  v_week := v_week - ((extract(isodow from v_week)::integer) - 1);
  delete from public.app_chore_completions where done_by = p_cp and week_start < v_week;
  delete from public.app_chore_swaps where counterparty_id = p_cp and created_by = p_cp and week_start < v_week;

  update public.app_requests set photo_paths = '{}' where counterparty_id = p_cp and photo_paths <> '{}';

  insert into public.app_account_deletions (counterparty_id, reason)
  values (p_cp, nullif(left(btrim(coalesce(p_reason, '')), 500), ''));
  return true;
end;
$$;

-- ---------- execução: só as Edge Functions (service_role) ----------
revoke all on function public.app_session_state(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_rate_take(text, text[], integer[], integer) from public, anon, authenticated;
revoke all on function public.app_rate_refund(bigint[]) from public, anon, authenticated;
revoke all on function public.app_reset_take_attempt(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_assistant_reserve(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_account_delete(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.app_session_state(uuid, integer), public.app_rate_take(text, text[], integer[], integer),
  public.app_rate_refund(bigint[]), public.app_reset_take_attempt(uuid, integer), public.app_assistant_reserve(uuid, integer),
  public.app_account_delete(uuid, integer, text) to service_role;

-- ---------- 5. grants das tabelas app_* ----------
-- No dev o laço pegava toda tabela "app_%". Aqui, só a lista das tabelas que este arquivo cria (e as 11 que a
-- produção já tem): outra tabela app_* que aparecer na produção não é tocada, só avisada.
do $$
declare
  t text;
  v_app text[] := array[
    'app_account_deletions', 'app_apartment_info', 'app_apartment_places', 'app_assistant_reports',
    'app_assistant_usage', 'app_bh_event_links', 'app_bh_events', 'app_bh_source_pages',
    'app_bh_sync_runs', 'app_chore_completions', 'app_chore_swaps', 'app_chores', 'app_cleaners',
    'app_cleaning_feedback', 'app_community_blocks', 'app_community_comments',
    'app_community_event_rsvps', 'app_community_events', 'app_community_posts',
    'app_community_reports', 'app_community_suspensions', 'app_community_terms', 'app_devices',
    'app_events', 'app_expense_shares', 'app_expenses', 'app_feedback', 'app_first_access_attempts',
    'app_moderation_log', 'app_notice_reads', 'app_notices', 'app_packages', 'app_password_resets',
    'app_payment_info', 'app_profile_corrections', 'app_profiles', 'app_rate_events',
    'app_referral_codes', 'app_referral_program', 'app_referrals', 'app_rental_continuations',
    'app_request_events', 'app_requests', 'app_rules_acceptances', 'app_searches',
    'app_service_catalog', 'app_settings', 'app_settlements', 'app_students', 'app_surveys',
    'app_trip_members', 'app_trips', 'app_visitors'
  ];
begin
  foreach t in array v_app loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'app\_%'
                                            and tablename::text <> all (v_app) loop
    raise warning 'tabela % não está na lista do app: grants mantidos', t;
  end loop;
end;
$$;

-- Só leitura no painel
grant select on
  public.app_service_catalog, public.app_packages, public.app_community_events, public.app_community_event_rsvps,
  public.app_cleaners, public.app_bh_event_links, public.app_bh_events, public.app_bh_sync_runs,
  public.app_requests, public.app_request_events, public.app_referrals, public.app_referral_program,
  public.app_referral_codes, public.app_notices, public.app_notice_reads, public.app_feedback,
  public.app_community_posts, public.app_community_comments, public.app_trips, public.app_trip_members,
  public.app_community_reports, public.app_community_suspensions, public.app_moderation_log,
  public.app_apartment_info, public.app_profile_corrections, public.app_surveys, public.app_account_deletions,
  public.app_assistant_reports
to authenticated;
-- Lidas só pela app-admin hoje; ficam legíveis para a equipe, menos os hashes.
grant select (counterparty_id, auth_user_id, status, must_change_password, last_login_at, last_seen_at, created_at,
  updated_at, display_name, login_count, session_version, birthday_greeted_year, usage_excluded, invited_at, invited_by,
  deleted_at, activated_at) on public.app_students to authenticated;
grant select (id, counterparty_id, channel, expires_at, attempts, used_at, handled_at, handled_by, lang, created_at)
  on public.app_password_resets to authenticated;

-- Escrita no painel (as políticas de cada tabela continuam decidindo quem: admin e equipe)
grant insert, update, delete on public.app_service_catalog, public.app_community_events, public.app_cleaners,
  public.app_bh_event_links to authenticated;
grant insert, delete on public.app_notices to authenticated;
grant insert, update on public.app_referral_program to authenticated;
grant insert on public.app_referrals, public.app_packages to authenticated;
grant update (status, notes, friend_contact) on public.app_referrals to authenticated;
grant update (status, team_note) on public.app_packages to authenticated;
grant update (status, team_note, fee_cents, billing_month, scheduled_date, start_time, end_time) on public.app_requests to authenticated;
grant update (reply, status) on public.app_feedback to authenticated;
grant update (handled_at, handled_by) on public.app_profile_corrections to authenticated;
grant update (hidden) on public.app_bh_events to authenticated;
grant update (cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;
grant insert (apartment_id, cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- ---------- 6. (FORA) ----------
-- O bloco 6 da 021 revogava o EXECUTE de anon numa função de papéis do site. É objeto do site: não entra.

-- ---------- 7. search_path fixo nas funções que o get_advisors apontou (gatilhos e ajudantes, não são definer) ----------
alter function public.app_requests_touch() set search_path = public;
alter function public.app_community_events_touch() set search_path = public;
alter function public.app_moderation_reason(text) set search_path = public;
alter function public.app_feedback_stamp() set search_path = public;
alter function public.app_referrals_touch() set search_path = public;
alter function public.app_has_link(text) set search_path = public;

-- ===== 022_push.sql =====

-- 022: notificações push (onda 9). Todo aviso novo em app_notices (escrito pela equipe no painel ou por um
-- gatilho: pedido mudou de estado, encomenda chegou) vira push nos telefones registrados.
--
-- Caminho: insert em app_notices → gatilho app_notices_push → pg_net chama a função app-push com o segredo do
-- Vault no cabeçalho x-push-secret (mesmo padrão da 013) → a função pede os destinatários a app_push_targets,
-- manda pela Expo Push API em lotes de 100 e desliga os aparelhos que voltam DeviceNotRegistered.
-- O app registra o aparelho em app-house/device (tabela app_devices, 008).

-- ---------- colunas ----------
-- Língua do app no aparelho (o push sai nela). Vazia: a língua do último aceite das regras, senão francês.
-- A rota app-house/device precisa gravar body.lang ('fr' | 'en') para preencher esta coluna.
alter table public.app_devices add column if not exists lang text check (lang is null or lang in ('fr', 'en'));
-- Quando o push daquele aviso saiu (a função marca antes de enviar: o mesmo aviso nunca sai duas vezes).
alter table public.app_notices add column if not exists pushed_at timestamptz;

-- ---------- destinatários de um aviso ----------
-- Mesma regra da rota app-house/notices: 'all' = todo aluno ativo com locação no período do app;
-- 'rental' = moradores daquela locação (inclusive quem continua nela, app_rentals_for);
-- 'student' = aquele aluno. Só aparelhos ligados de alunos com acesso ativo.
create or replace function public.app_push_targets(p_notice uuid)
returns table (expo_token text, counterparty_id uuid, lang text)
language sql stable security definer set search_path to 'public' as $$
  select d.expo_token,
         d.counterparty_id,
         coalesce(
           d.lang,
           (select a.lang from public.app_rules_acceptances a
             where a.counterparty_id = d.counterparty_id
             order by a.accepted_at desc limit 1),
           'fr'
         ) as lang
  from public.app_notices n
  join public.app_devices d on d.enabled
  join public.app_students s on s.counterparty_id = d.counterparty_id and s.status = 'active'
  where n.id = p_notice
    and case n.audience
      when 'all' then public.app_rental_for(d.counterparty_id) is not null
      when 'student' then d.counterparty_id = n.counterparty_id
      when 'rental' then n.rental_id = any (coalesce(public.app_rentals_for(d.counterparty_id), '{}'::uuid[]))
      else false
    end
$$;
revoke execute on function public.app_push_targets(uuid) from public, anon, authenticated;
grant execute on function public.app_push_targets(uuid) to service_role;

-- ---------- quem pode chamar a app-push: só quem tem o segredo do Vault ----------
-- PASSO MANUAL (README, passo 4): o segredo NÃO vai neste arquivo. Rodar à parte, trocando o marcador:
-- do $$
-- begin
--   if not exists (select 1 from vault.secrets where name = 'app_push_secret') then
--     perform vault.create_secret(
--       '<<SEGREDO_DO_PUSH>>',
--       'app_push_secret',
--       'Enviado pelo gatilho de app_notices no cabeçalho x-push-secret da função app-push (022_push.sql).'
--     );
--   end if;
-- end;
-- $$;

create or replace function public.app_push_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'app_push_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.app_push_secret_ok(text) from public, anon, authenticated;
grant execute on function public.app_push_secret_ok(text) to service_role;

-- Chama a função (assíncrono, pelo pg_net: o insert do aviso não espera o envio).
-- Endereço da produção.
create or replace function public.app_push_run(p_notice uuid)
returns bigint language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint;
begin
  select net.http_post(
    url := 'https://miucfiiporxhvvbefonh.supabase.co/functions/v1/app-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'app_push_secret')
    ),
    body := jsonb_build_object('noticeId', p_notice),
    timeout_milliseconds := 60000
  ) into v_id;
  return v_id;
end;
$$;
revoke execute on function public.app_push_run(uuid) from public, anon, authenticated;

create or replace function public.app_notices_push()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.app_push_run(new.id);
  return null;
end;
$$;
revoke execute on function public.app_notices_push() from public, anon, authenticated;
drop trigger if exists app_notices_push on public.app_notices;
create trigger app_notices_push after insert on public.app_notices
  for each row execute function public.app_notices_push();

-- ===== 023_data_dos_avisos.sql =====

-- 023: a data dos avisos, escrita na língua de quem lê (10/11/2026).
--
-- O gatilho dos eventos da Chez Toi (015, app_community_events_notify) escrevia a hora do evento como
-- 'DD/MM HH24:MI' nas duas línguas: o aluno de língua inglesa lia "19/11 19:00". Agora cada língua tem o
-- formato que o app já usa nas telas (src/lib/format.ts):
--   fr  "19/11 à 19h00"   (9h45 de manhã, sem zero à esquerda, como formatTime)
--   en  "Nov 19, 7:00 PM"
-- Sempre no horário de Belo Horizonte. O nome do mês em inglês vem de uma lista fixa e o resto são números,
-- então nada aqui depende do locale do servidor (lc_time).
--
-- Conferido em 10/11/2026 (grep nos SQL e nas funções, e pg_proc do banco de desenvolvimento): este é o único
-- lugar que põe data formatada em app_notices. Pedidos (008), encomendas (012), feedback e indicação (016),
-- moderação e suspensão (015) e os avisos da app-community não escrevem data.
--
-- Só troca funções: nenhuma tabela, nenhum dado. Os avisos já gravados ficam como estão.

-- A hora de um aviso nas duas línguas: { "fr": "19/11 à 19h00", "en": "Nov 19, 7:00 PM" }.
create or replace function public.app_notice_when(p_at timestamptz)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_build_object(
    'fr', to_char(l, 'DD/MM') || ' à ' || extract(hour from l)::int || 'h' || to_char(l, 'MI'),
    'en', (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from l)::int]
          || ' ' || extract(day from l)::int || ', '
          || ((extract(hour from l)::int + 11) % 12 + 1) || ':' || to_char(l, 'MI')
          || case when extract(hour from l) < 12 then ' AM' else ' PM' end)
  from (select p_at at time zone 'America/Sao_Paulo' as l) t;
$$;
revoke execute on function public.app_notice_when(timestamptz) from public, anon, authenticated;

-- O mesmo gatilho da 015, com a hora em cada língua.
create or replace function public.app_community_events_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_when jsonb := public.app_notice_when(new.starts_at);
  v_body jsonb := jsonb_build_object(
    'fr', (v_when->>'fr') || ' · ' || new.venue,
    'en', (v_when->>'en') || ' · ' || new.venue);
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement Chez Toi : ' || (new.title->>'fr'), 'en', 'Chez Toi event: ' || (new.title->>'en')),
      v_body,
      '/community/events/' || new.id, new.created_by);
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'published' then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement annulé : ' || (new.title->>'fr'), 'en', 'Event cancelled: ' || (new.title->>'en')),
      v_body,
      '/community/events/' || new.id, new.created_by);
  end if;
  return null;
end;
$$;
revoke execute on function public.app_community_events_notify() from public, anon, authenticated;

-- ===== 024_painel_respostas_da_charlotte.sql =====

-- A equipe marca como vista a resposta da Charlotte que o aluno sinalizou (10/11/2026).
-- Tela "Respostas da Charlotte" do painel (branch app/painel-do-app do site). A leitura já veio na 021
-- (política de SELECT e grant); aqui entra só marcar como vista: handled_at e handled_by, por admin e equipe.
-- "Signaler cette réponse" é exigência do Google Play para conteúdo gerado por IA: sem a tela, o aviso do
-- aluno não chegava a ninguém.

drop policy if exists "Equipe resolve respostas marcadas da Charlotte" on public.app_assistant_reports;
create policy "Equipe resolve respostas marcadas da Charlotte" on public.app_assistant_reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

grant update (handled_at, handled_by) on public.app_assistant_reports to authenticated;

-- ===== 025_revisao_do_servidor.sql =====

-- Correções da revisão independente do servidor (10/11/2026). As funções trocadas partem do que estava no ar no
-- banco de desenvolvimento (pg_get_functiondef), não dos arquivos
-- antigos; continuam security definer, com search_path fixo e os mesmos EXECUTE. Pode rodar de novo.
--
--  1. Contrato do aluno: app_home_for (has_contract) só olha rental_contracts.contract_type = 'tenant'. Cada locação
--     tem duas linhas ('owner' e 'tenant'); a do proprietário não é do aluno. A rota contract da app-api faz o mesmo.
--  2. Locação 'finished': o site marca apartment_rentals.status = 'finished' quando o check-out termina (e
--     rental_tenants.is_active continua true). app_rental_for passa a valer para 'active' ou para 'finished' até
--     30 dias depois do fim (data de BH, não a do servidor em UTC), preferindo a ativa; app_access_until =
--     maior fim + 30 entre 'active' e 'finished'. Quem não tem locação nenhuma dessas continua como antes
--     (sessão válida, rotas respondem noRental).
--  3. Aparelhos: quando a sessão do aluno cai (session_version muda) ou a conta deixa de estar 'active', os
--     aparelhos dele em app_devices ficam com enabled = false. O app registra de novo ao abrir (rota device).
--  4. app_notices_push: erro no push (banco sem pg_net, Vault, rede) vira aviso no log e nunca derruba o INSERT do
--     aviso nem o que vem antes dele (pedido, encomenda, resposta de feedback, moderação, evento).
--  5. app_account_delete: ficam a suspensão da comunidade, os bloqueios em que ele é o bloqueado e o histórico de
--     moderação sobre ele (não sobre o conteúdo). Quem ia numa viagem organizada por ele é avisado antes de a
--     viagem sumir; os avisos dos colegas que apontavam para posts e viagens apagados saem do sino.
--  6. app_assistant_reserve: linha 'pending' com mais de 10 minutos (função morta no meio do pedido) não conta na
--     cota diária da Charlotte.
--  7. app_has_link: regra nova, igual à das Edge Functions e à do app (quatro padrões, ver abaixo).
--  8. Espaço gourmet: app_gourmet_book confere o horário e grava a reserva num passo só (trava por espaço e dia),
--     olhando todos os apartamentos que dividem o espaço (app_gourmet_space).
--  9. Menor privilégio: authenticated perde o SELECT por coluna em app_students e app_password_resets (o painel só
--     chega a essas tabelas pela função app-admin).

-- ---------- 1. contrato do aluno ----------
create or replace function public.app_home_for(p_cp uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
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
                              where k.rental_id = r.id and k.contract_type = 'tenant' and k.file_path is not null)
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
$$;
revoke all on function public.app_home_for(uuid) from public, anon, authenticated;
grant execute on function public.app_home_for(uuid) to service_role;

-- ---------- 2. locação 'finished' e a data de BH ----------
-- A locação que vale para o aluno: 'active', ou 'finished' até 30 dias depois do fim (o prazo prometido para baixar
-- contrato, recibos e laudo). Entre uma ativa e uma encerrada, a ativa. "Hoje" é o dia de Belo Horizonte: o banco
-- roda em UTC e, das 21h à meia-noite de BH, current_date já era o dia seguinte.
create or replace function public.app_rental_for(p_cp uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select r.id
  from public.app_students s
  join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
  join public.apartment_rentals r on r.id = t.rental_id
  cross join public.app_settings cfg
  cross join (select (now() at time zone 'America/Sao_Paulo')::date as today) d
  where s.counterparty_id = p_cp
    and s.status = 'active'
    and (r.status = 'active' or (r.status = 'finished' and r.end_date + 30 >= d.today))
    and r.id <> all (cfg.excluded_rental_ids)
    and r.start_date <= cfg.access_end
    and r.end_date >= cfg.access_start
  order by (r.status = 'active') desc,
           (d.today between r.start_date and r.end_date) desc,
           (r.start_date >= d.today) desc,
           abs(r.start_date - d.today)
  limit 1
$$;
revoke all on function public.app_rental_for(uuid) from public, anon, authenticated;
grant execute on function public.app_rental_for(uuid) to service_role;

-- Até quando o aluno ainda entra: o maior fim entre as locações ativas e as encerradas dele, mais 30 dias.
-- Null só quando não há nenhuma locação 'active' ou 'finished' (aí quem decide é a app_rental_for: noRental).
-- Com a 'finished' na conta, o acesso de quem saiu termina de verdade (app_session_state responde 'ended').
create or replace function public.app_access_until(p_cp uuid)
returns date language sql stable security definer set search_path to 'public' as $$
  select max(r.end_date) + 30
  from public.rental_tenants t
  join public.apartment_rentals r on r.id = t.rental_id
  where t.counterparty_id = p_cp and t.is_active and r.status in ('active', 'finished')
$$;
revoke all on function public.app_access_until(uuid) from public, anon, authenticated;
grant execute on function public.app_access_until(uuid) to service_role;

-- ---------- 3. aparelho de quem perdeu a sessão não recebe push ----------
-- Sair, trocar a senha, nova senha por código, convite da equipe e desligar a conta mudam session_version ou status.
-- O telefone que ficou para trás (roubado, emprestado, vendido) deixa de receber os avisos pessoais na hora; o app
-- do aluno registra o aparelho de novo na próxima abertura (app-house/device volta a ligar).
create or replace function public.app_students_devices_off()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.app_devices set enabled = false where counterparty_id = new.counterparty_id and enabled;
  return null;
end;
$$;
revoke all on function public.app_students_devices_off() from public, anon, authenticated;
drop trigger if exists app_students_devices_off on public.app_students;
create trigger app_students_devices_off after update on public.app_students
  for each row
  when (new.session_version is distinct from old.session_version
        or (old.status = 'active' and new.status is distinct from 'active'))
  execute function public.app_students_devices_off();

-- ---------- 4. o aviso nunca falha por causa do push ----------
create or replace function public.app_notices_push()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform public.app_push_run(new.id);
  exception when others then
    raise warning 'app_notices_push: aviso % ficou sem push (%)', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke execute on function public.app_notices_push() from public, anon, authenticated;

-- ---------- 5. excluir a conta ----------
-- Igual à 021, com quatro diferenças:
--   - ficam a suspensão da comunidade, os bloqueios em que ele é o bloqueado e o histórico de moderação cujo alvo é
--     o aluno (suspensões): quem apaga a conta e volta pelo primeiro acesso não volta "limpo";
--   - quem ia numa viagem organizada por ele (ainda por acontecer) recebe um aviso antes de a viagem sumir;
--   - os avisos no sino dos colegas que apontavam para os posts e as viagens apagados saem junto;
--   - os contadores de limite com o id dele no fim da chave ('<viagem>:<aluno>') também saem.
-- As fotos dos chamados saem do bucket ANTES desta função (rota account-delete da app-api).
create or replace function public.app_account_delete(p_cp uuid, p_version integer, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_posts uuid[];
  v_trips uuid[];
  v_comments uuid[];
  v_week date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.app_students
     set status = 'disabled', password_hash = null, display_name = null, must_change_password = true,
         session_version = session_version + 1, deleted_at = now(), updated_at = now()
   where counterparty_id = p_cp and session_version = p_version and status = 'active';
  if not found then
    return false;
  end if;

  select coalesce(array_agg(id), '{}') into v_posts from public.app_community_posts where author_cp = p_cp;
  select coalesce(array_agg(id), '{}') into v_trips from public.app_trips where creator_cp = p_cp;
  -- os comentários dele e os que somem junto com os posts e as viagens dele (on delete cascade)
  select coalesce(array_agg(id), '{}') into v_comments from public.app_community_comments
   where author_cp = p_cp or post_id = any(v_posts) or trip_id = any(v_trips);

  -- quem ia numa viagem dele que ainda não acabou fica sabendo (a viagem some logo abaixo)
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  select 'student', m.counterparty_id,
         jsonb_build_object('fr', 'Voyage annulé : ' || t.destination, 'en', 'Trip cancelled: ' || t.destination),
         jsonb_build_object('fr', 'L’organisateur a quitté l’app : ce voyage n’existe plus.',
                            'en', 'The organiser left the app, so this trip no longer exists.'),
         '/community/trips'
    from public.app_trips t
    join public.app_trip_members m on m.trip_id = t.id and m.counterparty_id <> p_cp
   where t.creator_cp = p_cp and t.status in ('pending', 'published', 'hidden') and t.ends_on >= v_today;

  -- avisos no sino dos outros que levavam para um post ou uma viagem que deixa de existir
  delete from public.app_notices
   where href = any (array(select '/community/post/' || x::text from unnest(v_posts) as x)
                     || array(select '/community/trips/' || x::text from unnest(v_trips) as x));

  -- do histórico de moderação sai o que ele fez e o que fala do conteúdo dele; fica o que fala dele (suspensões)
  delete from public.app_moderation_log
   where (actor_id = p_cp and target_id <> p_cp)
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));
  delete from public.app_community_reports
   where reporter_cp = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));

  delete from public.app_community_posts where author_cp = p_cp;
  delete from public.app_trips where creator_cp = p_cp;
  delete from public.app_community_comments where author_cp = p_cp;
  delete from public.app_trip_members where counterparty_id = p_cp;
  delete from public.app_community_event_rsvps where counterparty_id = p_cp;
  -- só os bloqueios que ELE fez; quem o bloqueou continua protegido se ele voltar
  delete from public.app_community_blocks where blocker_cp = p_cp;
  delete from public.app_community_terms where counterparty_id = p_cp;
  -- app_community_suspensions fica: a suspensão vale também depois de um novo primeiro acesso

  delete from public.app_profiles where counterparty_id = p_cp;
  delete from public.app_devices where counterparty_id = p_cp;
  delete from public.app_feedback where counterparty_id = p_cp;
  delete from public.app_surveys where counterparty_id = p_cp;
  delete from public.app_referral_codes where counterparty_id = p_cp;
  delete from public.app_cleaning_feedback where counterparty_id = p_cp;
  delete from public.app_visitors where counterparty_id = p_cp;
  delete from public.app_packages where counterparty_id = p_cp;
  delete from public.app_notice_reads where counterparty_id = p_cp;
  delete from public.app_notices where counterparty_id = p_cp;
  delete from public.app_password_resets where counterparty_id = p_cp;
  delete from public.app_profile_corrections where counterparty_id = p_cp;
  delete from public.app_events where counterparty_id = p_cp;
  delete from public.app_assistant_usage where counterparty_id = p_cp;
  delete from public.app_assistant_reports where counterparty_id = p_cp;
  delete from public.app_rate_events where key = p_cp::text or key like '%:' || p_cp::text;

  v_week := v_today - ((extract(isodow from v_today)::integer) - 1);
  delete from public.app_chore_completions where done_by = p_cp and week_start < v_week;
  delete from public.app_chore_swaps where counterparty_id = p_cp and created_by = p_cp and week_start < v_week;

  update public.app_requests set photo_paths = '{}' where counterparty_id = p_cp and photo_paths <> '{}';

  insert into public.app_account_deletions (counterparty_id, reason)
  values (p_cp, nullif(left(btrim(coalesce(p_reason, '')), 500), ''));
  return true;
end;
$$;
revoke all on function public.app_account_delete(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.app_account_delete(uuid, integer, text) to service_role;

-- ---------- 6. cota da Charlotte ----------
-- A linha de uso nasce 'pending' e a função troca pelo modelo quando a resposta chega. Função morta no meio
-- (tempo esgotado, reinício) deixava a 'pending' contando por 24 h; agora ela só conta por 10 minutos.
create or replace function public.app_assistant_reserve(p_cp uuid, p_limit integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('assistant:' || p_cp::text, 0));
  select count(*) into n from public.app_assistant_usage
    where counterparty_id = p_cp and created_at > now() - interval '24 hours'
      and not (model = 'pending' and created_at < now() - interval '10 minutes');
  if n >= p_limit then
    return null;
  end if;
  insert into public.app_assistant_usage (counterparty_id, model) values (p_cp, 'pending') returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.app_assistant_reserve(uuid, integer) from public, anon, authenticated;
grant execute on function public.app_assistant_reserve(uuid, integer) to service_role;

-- ---------- 7. nenhum link no que o aluno escreve: regra nova ----------
-- A regra antiga recusava frases normais ("Merci.De rien", "Thanks.It works", "à 18h.Es-tu dispo ?") e deixava
-- passar links de verdade (evil.ru/x, linktr.ee/abc, endereços IP). A MESMA regra vale nas Edge Functions
-- (LINK_RULES em app-api, app-community, app-house, app-requests, app-feedback) e no app (src/lib/no-links.ts):
-- mudou uma, mudam todas. Em JavaScript:
--   A  /(?:https?|ftp):\/\/|\bwww\.[a-z0-9-]/i                       esquema ou www.
--   B  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\/[^\s]/i          qualquer domínio seguido de caminho
--   C  /\b\d{1,3}(?:\.\d{1,3}){3}\b/                                 endereço IP
--   D  /\b[A-Za-z0-9-]{2,}\.(?:com|net|…|gy)(?![A-Za-z0-9À-ÿ-])/     domínio sem caminho, terminações comuns;
--      diferencia maiúsculas de propósito (maiúscula depois do ponto é frase nova) e de/me/to/be/us/es/it/co
--      deixaram de valer como terminação.
-- Aqui, "b" é o \b do JavaScript escrito por extenso (fronteira de palavra ASCII; o \y do Postgres segue o locale e
-- trataria "é" como letra) e "ns" é o [^\s] do JavaScript (espaço, tab, quebras de linha e os espaços Unicode
-- U+00A0, U+1680, U+2000 a U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 e U+FEFF, montados com chr()).
-- As regras *_no_links das tabelas (019) chamam esta função: valem para linhas novas e editadas.
create or replace function public.app_has_link(t text)
returns boolean language sql immutable set search_path to 'public' as $$
  with p as (
    select coalesce(t, '') as s,
           '(?:(?<![A-Za-z0-9_])(?=[A-Za-z0-9_])|(?<=[A-Za-z0-9_])(?![A-Za-z0-9_]))'::text as b,
           '[^ ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(160) || chr(5760)
             || chr(8192) || '-' || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287)
             || chr(12288) || chr(65279) || ']' as ns
  )
  select s ~* ('(?:https?|ftp)://|' || b || 'www\.[a-z0-9-]')
      or s ~* (b || '[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/' || ns)
      or s ~* (b || '[0-9]{1,3}(?:\.[0-9]{1,3}){3}' || b)
      or s ~  (b || '[A-Za-z0-9-]{2,}\.(?:com|net|org|io|fr|br|eu|uk|pt|ru|cn|xyz|info|online|link|shop|store|site|app|ly|gg|ee|gy)(?![A-Za-z0-9À-ÿ-])')
  from p
$$;

-- ---------- 8. espaço gourmet: conferir e reservar num passo só ----------
-- O espaço é do prédio, não do apartamento. Não há tabela de prédios: dois apartamentos dividem o espaço quando
-- têm o mesmo texto em app_apartment_info.building_info.gourmet.space ou, sem esse campo, o mesmo endereço
-- (apartments.location, sem diferença de maiúsculas e de espaços). Endereços escritos de formas diferentes para o
-- mesmo prédio: a equipe põe o mesmo "space" nos dois apartamentos.
create or replace function public.app_gourmet_space(p_apartment uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(
    nullif(btrim(i.building_info #>> '{gourmet,space}'), ''),
    nullif(lower(regexp_replace(btrim(a.location), '\s+', ' ', 'g')), ''),
    a.id::text)
  from public.apartments a
  left join public.app_apartment_info i on i.apartment_id = a.id
  where a.id = p_apartment
$$;
revoke all on function public.app_gourmet_space(uuid) from public, anon, authenticated;

-- Devolve o id do pedido criado, ou null quando o horário cruza com outra reserva em vigor do mesmo espaço (de
-- qualquer apartamento que o divide). A trava por espaço e dia vale até o fim da transação: dois pedidos ao mesmo
-- tempo não passam juntos. As demais validações (horário de funcionamento, duração, convidados) ficam na função
-- app-requests, que é a única que chama esta.
create or replace function public.app_gourmet_book(
  p_cp uuid, p_rental uuid, p_date date, p_start time, p_end time, p_guests integer, p_note text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_space text;
  v_id uuid;
begin
  select public.app_gourmet_space(r.apartment_id) into v_space from public.apartment_rentals r where r.id = p_rental;
  if v_space is null then
    raise exception 'app_gourmet_book: locação sem apartamento';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('gourmet:' || v_space || ':' || p_date::text, 0));
  if exists (
    select 1
      from public.app_requests q
      join public.apartment_rentals r on r.id = q.rental_id
     where q.kind = 'gourmet'
       and q.scheduled_date = p_date
       and q.status not in ('cancelled', 'declined')
       and q.start_time < p_end and p_start < q.end_time
       and public.app_gourmet_space(r.apartment_id) = v_space
  ) then
    return null;
  end if;
  insert into public.app_requests (counterparty_id, rental_id, kind, note, scheduled_date, start_time, end_time, guests)
  values (p_cp, p_rental, 'gourmet', p_note, p_date, p_start, p_end, p_guests)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.app_gourmet_book(uuid, uuid, date, time, time, integer, text) from public, anon, authenticated;
grant execute on function public.app_gourmet_book(uuid, uuid, date, time, time, integer, text) to service_role;

-- ---------- 9. menor privilégio ----------
-- A 021 deixou app_students e app_password_resets legíveis (menos os hashes) para a equipe logada. O painel não lê
-- nenhuma das duas direto (conferido em src/hooks/app-panel e src/pages/admin/AdminApp*.tsx do site): tudo passa
-- pela função app-admin, com a chave de serviço. As políticas de SELECT ficam, sem efeito enquanto não houver grant.
revoke select on public.app_students, public.app_password_resets from authenticated;
revoke select (counterparty_id, auth_user_id, status, must_change_password, last_login_at, last_seen_at, created_at,
  updated_at, display_name, login_count, session_version, birthday_greeted_year, usage_excluded, invited_at, invited_by,
  deleted_at, activated_at) on public.app_students from authenticated;
revoke select (id, counterparty_id, channel, expires_at, attempts, used_at, handled_at, handled_by, lang, created_at)
  on public.app_password_resets from authenticated;

commit;
