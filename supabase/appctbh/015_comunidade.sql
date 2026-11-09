-- appctbh: onda 15, comunidade (09/11/2026). Pedido do Daniel: mural, eventos da Chez Toi e viagens em grupo,
-- "vamos usar a IA pra moderar também e a gente participa dessa moderação".
--
-- Quem participa: só alunos com acesso ativo e locação no período (a função app-community confere).
-- Moderação, em três camadas:
--   1. IA antes de publicar (função app-community): ok → publica; review → espera a equipe; block → não publica
--      e explica ao aluno. Sem a chave da IA, publica e marca 'unchecked' para a equipe conferir.
--   2. Denúncia dos alunos: 3 pessoas diferentes escondem o conteúdo até a equipe decidir.
--   3. Equipe no painel: app_team_moderate (publicar ou retirar) e app_team_suspend (tirar alguém da comunidade).
-- Bloquear: o aluno deixa de ver o que a pessoa publica, e ela deixa de ver o dele.

-- ---------- mural ----------
create table if not exists public.app_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  -- locação do autor quando publicou: define quem vê um post 'apartment'
  rental_id uuid references public.apartment_rentals(id) on delete cascade,
  scope text not null check (scope in ('apartment', 'all')),
  kind text not null default 'post' check (kind in ('post', 'question', 'giveaway')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,          -- { pt, fr, en }: pt para a equipe, fr/en para o aluno
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,         -- código do motivo (ver app_team_moderate)
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scope <> 'apartment' or rental_id is not null)
);
create index if not exists app_community_posts_feed on public.app_community_posts (status, scope, created_at desc);

create table if not exists public.app_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.app_community_posts(id) on delete cascade,
  author_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_community_comments_post on public.app_community_comments (post_id, created_at);

-- ---------- viagens em grupo ----------
create table if not exists public.app_trips (
  id uuid primary key default gen_random_uuid(),
  creator_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  destination text not null check (char_length(trim(destination)) between 2 and 80),
  -- destino da aba Voyages (src/lib/travel), quando o aluno escolhe um de lá
  destination_id text check (destination_id is null or destination_id ~ '^[a-z0-9-]{1,60}$'),
  starts_on date not null,
  ends_on date not null,
  seats integer check (seats is null or seats between 2 and 30),
  description text check (description is null or char_length(description) <= 600),
  -- grupo do WhatsApp: só quem entrou na viagem vê
  whatsapp_link text check (whatsapp_link is null or whatsapp_link ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$'),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed', 'cancelled')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists app_trips_open on public.app_trips (status, starts_on);

create table if not exists public.app_trip_members (
  trip_id uuid not null references public.app_trips(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trip_id, counterparty_id)
);

-- ---------- eventos da Chez Toi (a equipe cria no painel; o aluno confirma presença) ----------
create table if not exists public.app_community_events (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,                       -- { fr, en }
  description jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null check (char_length(trim(venue)) between 1 and 120),
  address text check (address is null or char_length(address) <= 200),
  capacity integer check (capacity is null or capacity between 1 and 1000),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (title ? 'fr' and title ? 'en')
);

create table if not exists public.app_community_event_rsvps (
  event_id uuid not null references public.app_community_events(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  going boolean not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, counterparty_id)
);

-- ---------- denúncia, bloqueio, suspensão, carta da comunidade, histórico ----------
create table if not exists public.app_community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'trip')),
  target_id uuid not null,
  reporter_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'danger', 'personal_data', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text check (resolution in ('kept', 'removed')),
  unique (target_type, target_id, reporter_cp)
);
create index if not exists app_community_reports_open on public.app_community_reports (created_at) where resolved_at is null;

create table if not exists public.app_community_blocks (
  blocker_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  blocked_cp uuid not null references public.finance_counterparties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_cp, blocked_cp),
  check (blocker_cp <> blocked_cp)
);

create table if not exists public.app_community_suspensions (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  until timestamptz not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Carta da comunidade aceita antes de publicar (exigência das lojas para conteúdo de usuário).
create table if not exists public.app_community_terms (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}$'),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  accepted_at timestamptz not null default now()
);

create table if not exists public.app_moderation_log (
  id bigint generated always as identity primary key,
  target_type text not null,
  target_id uuid not null,
  actor text not null check (actor in ('ai', 'reports', 'team', 'author')),
  actor_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists app_moderation_log_target on public.app_moderation_log (target_type, target_id, created_at);

alter table public.app_community_posts enable row level security;
alter table public.app_community_comments enable row level security;
alter table public.app_trips enable row level security;
alter table public.app_trip_members enable row level security;
alter table public.app_community_events enable row level security;
alter table public.app_community_event_rsvps enable row level security;
alter table public.app_community_reports enable row level security;
alter table public.app_community_blocks enable row level security;
alter table public.app_community_suspensions enable row level security;
alter table public.app_community_terms enable row level security;
alter table public.app_moderation_log enable row level security;

-- ---------- evento publicado vira aviso no sino de todos ----------
create or replace function public.app_community_events_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_when text := to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement Chez Toi : ' || (new.title->>'fr'), 'en', 'Chez Toi event: ' || (new.title->>'en')),
      jsonb_build_object('fr', v_when || ' · ' || new.venue, 'en', v_when || ' · ' || new.venue),
      '/community/events/' || new.id, new.created_by);
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'published' then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement annulé : ' || (new.title->>'fr'), 'en', 'Event cancelled: ' || (new.title->>'en')),
      jsonb_build_object('fr', v_when || ' · ' || new.venue, 'en', v_when || ' · ' || new.venue),
      '/community/events/' || new.id, new.created_by);
  end if;
  return null;
end;
$$;
revoke execute on function public.app_community_events_notify() from public, anon, authenticated;

create or replace function public.app_community_events_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_community_events_touch on public.app_community_events;
create trigger app_community_events_touch before update on public.app_community_events
  for each row execute function public.app_community_events_touch();
drop trigger if exists app_community_events_notify on public.app_community_events;
create trigger app_community_events_notify after insert or update of status on public.app_community_events
  for each row execute function public.app_community_events_notify();

-- ---------- decisões da equipe (painel) ----------
-- Motivos que o aluno vê, nas duas línguas. A equipe escolhe um código; o texto livre fica só no histórico.
create or replace function public.app_moderation_reason(p_code text)
returns jsonb language sql immutable as $$
  select case p_code
    when 'spam' then '{"fr":"Publicité ou message répété.","en":"Advertising or repeated message."}'
    when 'harassment' then '{"fr":"Propos blessants envers une personne.","en":"Hurtful words towards someone."}'
    when 'inappropriate' then '{"fr":"Contenu inapproprié.","en":"Inappropriate content."}'
    when 'danger' then '{"fr":"Contenu qui peut mettre quelqu''un en danger.","en":"Content that may put someone at risk."}'
    when 'personal_data' then '{"fr":"Données personnelles de quelqu''un.","en":"Someone''s personal data."}'
    when 'off_topic' then '{"fr":"Hors sujet pour la communauté.","en":"Off topic for the community."}'
    else '{"fr":"Ne respecte pas la charte de la communauté.","en":"Does not follow the community guidelines."}'
  end::jsonb
$$;

-- p_action: 'publish' (manter ou devolver ao ar) ou 'remove' (retirar e avisar o autor).
create or replace function public.app_team_moderate(p_type text, p_id uuid, p_action text, p_reason text default null, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_author uuid;
  v_status text;
  v_decision text;
  v_reason jsonb;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('publish', 'remove') then raise exception 'bad action'; end if;
  v_status := case p_action when 'publish' then 'published' else 'removed' end;
  v_decision := case p_action when 'publish' then 'kept' else 'removed' end;

  if p_type = 'post' then
    update public.app_community_posts
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id returning author_cp into v_author;
  elsif p_type = 'comment' then
    update public.app_community_comments
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now()
      where id = p_id returning author_cp into v_author;
  elsif p_type = 'trip' then
    update public.app_trips
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id and status <> 'cancelled' returning creator_cp into v_author;
  else
    raise exception 'bad type';
  end if;
  if v_author is null then raise exception 'not found'; end if;

  update public.app_community_reports
    set resolved_at = now(), resolved_by = auth.uid(), resolution = v_decision
    where target_type = p_type and target_id = p_id and resolved_at is null;
  insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action, reason)
    values (p_type, p_id, 'team', auth.uid(), v_status, concat_ws(' · ', p_reason, nullif(trim(p_note), '')));

  if p_action = 'remove' then
    v_reason := public.app_moderation_reason(p_reason);
    insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
    values ('student', v_author,
      jsonb_build_object('fr', 'Votre publication a été retirée', 'en', 'Your post was removed'),
      jsonb_build_object('fr', 'Motif : ' || (v_reason->>'fr'), 'en', 'Reason: ' || (v_reason->>'en')),
      '/community/charter', auth.uid());
  end if;
end;
$$;

-- Tira alguém da comunidade por p_days (0 = devolve). O aluno continua usando o resto do app.
create or replace function public.app_team_suspend(p_cp uuid, p_days integer, p_reason text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_reason jsonb := public.app_moderation_reason(p_reason);
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_days is null or p_days < 0 or p_days > 365 then raise exception 'bad days'; end if;
  if p_days = 0 then
    delete from public.app_community_suspensions where counterparty_id = p_cp;
    insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action)
      values ('student', p_cp, 'team', auth.uid(), 'unsuspended');
    return;
  end if;
  insert into public.app_community_suspensions (counterparty_id, until, reason, created_by)
    values (p_cp, now() + make_interval(days => p_days), coalesce(p_reason, 'other'), auth.uid())
    on conflict (counterparty_id) do update set until = excluded.until, reason = excluded.reason, created_by = excluded.created_by, created_at = now();
  insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action, reason)
    values ('student', p_cp, 'team', auth.uid(), 'suspended', p_days || ' dias · ' || coalesce(p_reason, 'other'));
  insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
  values ('student', p_cp,
    jsonb_build_object('fr', 'Accès à la communauté suspendu', 'en', 'Community access suspended'),
    jsonb_build_object('fr', p_days || ' jours. Motif : ' || (v_reason->>'fr'), 'en', p_days || ' days. Reason: ' || (v_reason->>'en')),
    '/community/charter', auth.uid());
end;
$$;
revoke execute on function public.app_team_moderate(text, uuid, text, text, text) from public, anon;
revoke execute on function public.app_team_suspend(uuid, integer, text) from public, anon;
grant execute on function public.app_team_moderate(text, uuid, text, text, text) to authenticated;
grant execute on function public.app_team_suspend(uuid, integer, text) to authenticated;

-- ---------- painel: a equipe lê tudo, cria eventos; decide só pelas funções acima ----------
create policy "Equipe le posts" on public.app_community_posts for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le comentarios" on public.app_community_comments for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le viagens" on public.app_trips for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le participantes" on public.app_trip_members for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le denuncias" on public.app_community_reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le suspensoes" on public.app_community_suspensions for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le historico de moderacao" on public.app_moderation_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le presencas" on public.app_community_event_rsvps for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe cria e edita eventos" on public.app_community_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_community_posts, public.app_community_comments, public.app_trips, public.app_trip_members,
  public.app_community_reports, public.app_community_suspensions, public.app_moderation_log,
  public.app_community_event_rsvps to authenticated;
grant select, insert, update, delete on public.app_community_events to authenticated;
