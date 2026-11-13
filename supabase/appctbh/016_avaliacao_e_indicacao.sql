-- appctbh: onda 14, avaliação, feedback e indicação (09/11/2026).
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
create policy "Equipe le feedback" on public.app_feedback for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe responde feedback" on public.app_feedback for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le pesquisas" on public.app_surveys for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le codigos de indicacao" on public.app_referral_codes for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe registra indicacoes" on public.app_referrals for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe edita o programa de indicacao" on public.app_referral_program for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_feedback, public.app_surveys, public.app_referral_codes to authenticated;
grant update (reply, status) on public.app_feedback to authenticated;
grant select, insert, update, delete on public.app_referrals to authenticated;
grant select, insert, update on public.app_referral_program to authenticated;
