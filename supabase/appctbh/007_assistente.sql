-- Assistente de IA do app (onda 16, pedido de 08/11/2026): responde sobre o contrato do aluno, regras,
-- cartilha, guia de BH e os dados dele. Esta tabela guarda só o uso (tokens e custo), nunca as perguntas,
-- para medir o custo por aluno e aplicar o limite diário.

create table public.app_assistant_usage (
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
create index app_assistant_usage_student_idx on public.app_assistant_usage (counterparty_id, created_at desc);
alter table public.app_assistant_usage enable row level security;
