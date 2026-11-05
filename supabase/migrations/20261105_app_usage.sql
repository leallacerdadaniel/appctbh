-- App CTBH: uso do app, para a aba "Uso" do admin (ver PLANO-USO-ADMIN.md).
-- app_events: telas abertas e ações, por aluno.
-- app_searches: buscas do Guide, SEM identificar o aluno (decisão de 05/11/2026).
-- Retenção de 12 meses: quem apaga é a rota /api/usage do admin.
-- Pode rodar de novo sem problema.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  kind text not null check (kind in ('screen', 'action')),
  name text not null,       -- '/restaurants/[id]' ou 'copy_wifi'
  item text,                -- id do restaurante, destino etc.; o admin só mostra no total
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

-- Contas de teste ficam fora dos números do admin.
alter table public.app_students
  add column if not exists usage_excluded boolean not null default false;

-- RLS ligada e SEM políticas: só o servidor (chave secreta) lê e grava.
alter table public.app_events enable row level security;
alter table public.app_searches enable row level security;
revoke all on table public.app_events from public, anon, authenticated;
revoke all on table public.app_searches from public, anon, authenticated;
