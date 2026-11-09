-- appctbh: primeiro acesso ligado à ficha do site (09/11/2026). Pedido do Daniel: "tem que ter a tela de primeiro
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

create policy "Equipe le correcoes da ficha" on public.app_profile_corrections for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe resolve correcoes da ficha" on public.app_profile_corrections for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_profile_corrections to authenticated;
grant update (handled_at, handled_by) on public.app_profile_corrections to authenticated;

-- Dados fictícios para testar no desenvolvimento (Hugo e Chloé ainda não têm acesso ao app).
update public.finance_counterparties set passport_number = '21FR00102', phone = '+33 6 12 34 56 78',
  nationality = 'Française', emergency_contact_1_name = 'Marie Bernard (mère)', emergency_contact_1_contact = '+33 6 98 76 54 32'
  where id = '00000000-0000-4000-a000-000000000102';
update public.finance_counterparties set passport_number = '22FR00103', nationality = 'Française'
  where id = '00000000-0000-4000-a000-000000000103';
