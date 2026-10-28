-- App CTBH: despesas e acertos em real ou em euro.
-- Os saldos são calculados separados por moeda (sem conversão). O que já existe fica em BRL.
alter table public.app_expenses
  add column if not exists currency text not null default 'BRL' check (currency in ('BRL', 'EUR'));
alter table public.app_settlements
  add column if not exists currency text not null default 'BRL' check (currency in ('BRL', 'EUR'));
