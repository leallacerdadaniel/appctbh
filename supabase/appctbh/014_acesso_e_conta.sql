-- appctbh: onda 3, o resto do login (09/11/2026).
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
create policy "Equipe le acesso dos alunos" on public.app_students for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le pedidos de nova senha" on public.app_password_resets for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le contas apagadas" on public.app_account_deletions for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_students, public.app_password_resets, public.app_account_deletions to authenticated;
-- Convidar, gerar senha, desligar e religar: só pela função app-admin (o hash nunca passa pelo navegador).
