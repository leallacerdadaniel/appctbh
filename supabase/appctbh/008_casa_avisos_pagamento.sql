-- appctbh (ondas 5, 7 e 9): tarefas da casa, avisos (o sino), dados de pagamento da Chez Toi e
-- aparelhos para notificação. Tudo novo, prefixo app_; nada do site é alterado.

-- ---------- tarefas da casa (os moradores criam e cuidam; a Chez Toi não gerencia) ----------
create table public.app_chores (
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
create index app_chores_rental_idx on public.app_chores (rental_id) where active;

-- "Esta semana eu faço no seu lugar": vale para uma tarefa e uma semana.
create table public.app_chore_swaps (
  chore_id uuid not null references public.app_chores(id) on delete cascade,
  week_start date not null,
  counterparty_id uuid not null references public.finance_counterparties(id),
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  primary key (chore_id, week_start)
);

create table public.app_chore_completions (
  chore_id uuid not null references public.app_chores(id) on delete cascade,
  week_start date not null,
  done_by uuid not null references public.finance_counterparties(id),
  done_at timestamptz not null default now(),
  primary key (chore_id, week_start)
);

-- ---------- avisos (o sino) ----------
-- audience: 'all' = todos os alunos com acesso; 'rental' = um apartamento (rental_id); 'student' = um aluno.
-- O painel escreve comunicados (onda 4); o gatilho abaixo avisa o aluno quando a equipe mexe num pedido.
create table public.app_notices (
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
create index app_notices_created_idx on public.app_notices (created_at desc);

create table public.app_notice_reads (
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
create trigger app_requests_notify after update on public.app_requests
  for each row execute function public.app_requests_notify();
revoke execute on function public.app_requests_notify() from public, anon, authenticated;

-- ---------- como pagar a Chez Toi (uma linha; a equipe edita no painel) ----------
create table public.app_payment_info (
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
create table public.app_devices (
  expo_token text not null primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  platform text not null check (platform = any (array['ios','android'])),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index app_devices_student_idx on public.app_devices (counterparty_id) where enabled;

alter table public.app_chores enable row level security;
alter table public.app_chore_swaps enable row level security;
alter table public.app_chore_completions enable row level security;
alter table public.app_notices enable row level security;
alter table public.app_notice_reads enable row level security;
alter table public.app_payment_info enable row level security;
alter table public.app_devices enable row level security;

-- A equipe edita os dados de pagamento e escreve comunicados pelo painel (login do site).
create policy "Equipe le e edita pagamento" on public.app_payment_info for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Equipe le e escreve avisos" on public.app_notices for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select, insert, update, delete on public.app_payment_info, public.app_notices to authenticated;
