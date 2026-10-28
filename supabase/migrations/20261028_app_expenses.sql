-- App CTBH: despesas compartilhadas entre colegas (estilo Splitwise).
-- O grupo é a locação (apartment_rentals): todos os inquilinos ativos dela, com ou sem acesso ao app.
-- Valores em centavos de real (inteiros), para não ter erro de arredondamento.
-- Só acréscimos com prefixo app_. Nenhuma tabela do site é alterada.

-- 1. Despesas: quem pagou, quanto, quando. Só quem lançou pode editar ou apagar (regra na Edge Function).
create table if not exists public.app_expenses (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_by uuid not null references public.finance_counterparties(id),
  spent_on date not null default current_date,
  split_mode text not null default 'equal' check (split_mode in ('equal', 'exact')),
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_expenses_rental_idx on public.app_expenses (rental_id, spent_on desc);

-- 2. Parte de cada colega numa despesa (a soma das partes = valor da despesa).
create table if not exists public.app_expense_shares (
  expense_id uuid not null references public.app_expenses(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, counterparty_id)
);

-- 3. Acertos: "A pagou R$ X a B" (o Pix acontece fora do app; aqui só fica registrado).
create table if not exists public.app_settlements (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  from_cp uuid not null references public.finance_counterparties(id),
  to_cp uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_on date not null default current_date,
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  check (from_cp <> to_cp)
);
create index if not exists app_settlements_rental_idx on public.app_settlements (rental_id, paid_on desc);

-- RLS ligada e SEM políticas, como as outras tabelas do app:
-- o celular nunca lê direto; só a Edge Function (chave secreta) e o admin (servidor) acessam.
alter table public.app_expenses       enable row level security;
alter table public.app_expense_shares enable row level security;
alter table public.app_settlements    enable row level security;
