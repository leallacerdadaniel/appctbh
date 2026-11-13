-- 010: aceite das regras da casa (introdução obrigatória no primeiro acesso, pedido do dono em 08/11/2026).
-- Só no projeto de desenvolvimento appctbh (gxhvhacqemdwwebsftcd). Para produção, só com aprovação do Daniel.
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
create policy "Equipe le aceites das regras" on public.app_rules_acceptances for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

revoke all on public.app_rules_acceptances from anon;
