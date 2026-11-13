-- Onda 6: pedidos e extras. Nasce no appctbh; só vai para o banco do site depois de aprovado.
-- Tudo novo, com prefixo app_: nenhuma tabela do site é alterada.
--
-- app_service_catalog  catálogo de extras (a equipe edita no painel, onda 4)
-- app_requests         um formato só para extra, manutenção, late checkout, early check-in e espaço gourmet
-- app_request_events   linha do tempo; preenchida por gatilho a cada mudança de status
--
-- Cobrança (decisão de 06/11/2026): extra acumula e é faturado com o aluguel, a Chez Toi adianta.
-- billing_month = 1º dia do mês do aluguel que recebe a cobrança (mês seguinte ao do serviço).
-- Quando a equipe concluir o pedido, o painel lança em student_payments (payment_type 'service'): onda 4.

create table public.app_service_catalog (
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

create table public.app_requests (
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
create index app_requests_rental_idx on public.app_requests (rental_id, created_at desc);
create index app_requests_student_idx on public.app_requests (counterparty_id, created_at desc);
create index app_requests_open_idx on public.app_requests (status, created_at) where status in ('received','scheduled','in_progress');

create table public.app_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.app_requests(id) on delete cascade,
  status text not null,
  by_team boolean not null,
  note text,
  created_at timestamptz not null default now()
);
create index app_request_events_request_idx on public.app_request_events (request_id, created_at);

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

create trigger app_requests_touch before update on public.app_requests
  for each row execute function public.app_requests_touch();
create trigger app_requests_log after insert or update on public.app_requests
  for each row execute function public.app_requests_log_after();

alter table public.app_service_catalog enable row level security;
alter table public.app_requests enable row level security;
alter table public.app_request_events enable row level security;

revoke execute on function public.app_requests_log_after() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-request-photos', 'app-request-photos', false, 10485760,
        array['image/jpeg','image/png','image/heic','image/heif','image/webp'])
on conflict (id) do nothing;
