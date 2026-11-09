-- 013: agenda automática "o que rola em BH" (pedido do dono em 09/11/2026: CCBB, Palácio das Artes, shows,
-- festas, 2LIV, Raro, Sympla, prefeitura).
-- Só no projeto de desenvolvimento appctbh (gxhvhacqemdwwebsftcd). Para produção, só com aprovação do Daniel.
--
-- Fontes e o que cada uma permite: docs/pesquisa/agenda-bh.md, seção 7.
--   * leitura automática (função app-events-sync, 1x por dia pelo pg_cron): dados abertos da PBH (CKAN, CC-BY),
--     CCBB BH (sitemap + OpenGraph) e Palácio das Artes (agenda da página inicial + API WordPress);
--   * curadoria por link: a equipe cola o link (Sympla, 2LIV, Raro, Belotur, Instagram...) em app_bh_event_links e
--     o robô lê só os metadados públicos daquela página, como uma prévia de link.
-- O app lê pela função app-events (token do app); a equipe vê, corrige e esconde pelo painel (login do site).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------- links colados pela equipe ----------
create table if not exists public.app_bh_event_links (
  id uuid primary key default gen_random_uuid(),
  url text not null check (url ~ '^https?://' and char_length(url) <= 600),
  -- nome de quem colou (texto livre do painel)
  added_by text check (added_by is null or char_length(added_by) <= 80),
  -- pending: ainda não lido · ok: virou evento · needs_info: a página não trouxe título ou data (a equipe completa)
  -- error: não deu para abrir · not_allowed: o robots.txt do site não deixa
  status text not null default 'pending' check (status in ('pending', 'ok', 'needs_info', 'error', 'not_allowed')),
  status_detail text,
  -- Opcionais: a equipe preenche quando a página não traz (Instagram, site sem data). Valem mais que a página.
  title text check (title is null or char_length(trim(title)) between 1 and 160),
  starts_at timestamptz,
  ends_at timestamptz,
  venue text check (venue is null or char_length(venue) <= 120),
  category text check (category is null or category in ('show', 'party', 'exhibition', 'theatre', 'festival', 'other')),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create unique index if not exists app_bh_event_links_url_idx on public.app_bh_event_links (url);

-- ---------- os eventos (um por fonte + id na fonte) ----------
create table if not exists public.app_bh_events (
  id uuid primary key default gen_random_uuid(),
  -- ccbb_bh · palacio_das_artes · pbh_dados_abertos · link (curadoria)
  source text not null check (source in ('ccbb_bh', 'palacio_das_artes', 'pbh_dados_abertos', 'link')),
  -- o nome mostrado no app ("CCBB BH", "Palácio das Artes", "Sympla", "2LIV"...)
  source_name text not null,
  -- slug, id do WordPress, id do licenciamento ou o id do link
  external_id text not null,
  link_id uuid references public.app_bh_event_links(id) on delete cascade,
  -- como publicado na fonte (nome próprio, em geral em português)
  title text not null check (char_length(trim(title)) between 1 and 200),
  venue text,
  neighborhood text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- false = só o dia é conhecido (temporada, exposição): o app não mostra hora
  time_known boolean not null default true,
  url text,
  image_url text,
  category text not null default 'other' check (category in ('show', 'party', 'exhibition', 'theatre', 'festival', 'other')),
  -- texto original do preço (para a equipe); o app mostra price_min/price_max/is_free
  price_text text,
  price_min numeric(10, 2),
  price_max numeric(10, 2),
  is_free boolean,
  -- TODO(IA): resumo de uma linha em FR/EN gerado pelo Claude quando houver ANTHROPIC_API_KEY no appctbh;
  -- até lá o app mostra só os fatos (título, local, data, preço, categoria).
  fetched_at timestamptz not null default now(),
  -- a equipe esconde o que não serve; o robô nunca mexe nesta coluna
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists app_bh_events_upcoming_idx on public.app_bh_events (starts_at) where not hidden;

-- ---------- páginas lidas pelo robô: no máximo uma leitura por página por dia ----------
create table if not exists public.app_bh_source_pages (
  url text primary key,
  source text not null,
  -- lastmod do sitemap (CCBB): a página só é lida de novo quando muda
  last_modified text,
  http_status int,
  fetched_at timestamptz not null default now()
);

-- ---------- histórico das execuções (para a equipe ver se a agenda está viva) ----------
create table if not exists public.app_bh_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb
);

-- ---------- updated_at ----------
create or replace function public.app_bh_touch()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.app_bh_touch() from public, anon, authenticated;
drop trigger if exists app_bh_events_touch on public.app_bh_events;
create trigger app_bh_events_touch before update on public.app_bh_events
  for each row execute function public.app_bh_touch();
drop trigger if exists app_bh_event_links_touch on public.app_bh_event_links;
create trigger app_bh_event_links_touch before update on public.app_bh_event_links
  for each row execute function public.app_bh_touch();

-- ---------- os próximos dias, sem os escondidos ----------
-- Sem fim conhecido: evento com hora some 4 h depois do início; evento só com o dia, no fim do dia.
-- Exposição sem data de fim (Palácio das Artes) continua enquanto a fonte ainda a lista (lida há menos de 36 h).
create or replace function public.app_bh_events_next(p_days int default 30, p_category text default null)
returns setof public.app_bh_events
language sql stable set search_path to 'public' as $$
  select e.*
  from public.app_bh_events e
  where not e.hidden
    and (p_category is null or e.category = p_category)
    and e.starts_at < now() + make_interval(days => least(greatest(coalesce(p_days, 30), 1), 60))
    and (
      coalesce(e.ends_at, e.starts_at + case when e.time_known then interval '4 hours' else interval '1 day' end) > now()
      or (e.ends_at is null and e.category = 'exhibition' and e.source <> 'link' and e.fetched_at > now() - interval '36 hours')
    )
  order by e.starts_at, e.title
  limit 200;
$$;
revoke execute on function public.app_bh_events_next(int, text) from public, anon;
grant execute on function public.app_bh_events_next(int, text) to authenticated, service_role;

-- ---------- quem pode chamar a app-events-sync: só quem tem o segredo do Vault ----------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'app_events_sync_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app_events_sync_secret',
      'Enviado pelo pg_cron no cabeçalho x-sync-secret da função app-events-sync (013_agenda_bh.sql).'
    );
  end if;
end;
$$;

create or replace function public.app_bh_events_sync_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'app_events_sync_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.app_bh_events_sync_secret_ok(text) from public, anon, authenticated;
grant execute on function public.app_bh_events_sync_secret_ok(text) to service_role;

-- Chama a função (assíncrono, pelo pg_net). Sem argumento: tudo; com p_link: só aquele link colado.
-- Endereço do appctbh: em produção, trocar pelo endereço do projeto de lá.
create or replace function public.app_bh_events_run_sync(p_link uuid default null)
returns bigint language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint;
begin
  select net.http_post(
    url := 'https://gxhvhacqemdwwebsftcd.supabase.co/functions/v1/app-events-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'app_events_sync_secret')
    ),
    body := case when p_link is null then '{}'::jsonb else jsonb_build_object('linkId', p_link) end,
    timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;
revoke execute on function public.app_bh_events_run_sync(uuid) from public, anon, authenticated;

-- A equipe colou ou corrigiu um link: o robô lê aquela página na hora (não espera o dia seguinte).
create or replace function public.app_bh_event_links_changed()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.app_bh_events_run_sync(new.id);
  return null;
end;
$$;
revoke execute on function public.app_bh_event_links_changed() from public, anon, authenticated;
drop trigger if exists app_bh_event_links_changed on public.app_bh_event_links;
create trigger app_bh_event_links_changed
  after insert or update of url, title, starts_at, ends_at, venue, category on public.app_bh_event_links
  for each row execute function public.app_bh_event_links_changed();

-- Todo dia às 06:15 de BH (09:15 UTC).
select cron.schedule('app-events-sync-daily', '15 9 * * *', 'select public.app_bh_events_run_sync()');

-- ---------- acesso: o app passa pela app-events (chave de serviço); a equipe pelo painel ----------
alter table public.app_bh_events enable row level security;
alter table public.app_bh_event_links enable row level security;
alter table public.app_bh_source_pages enable row level security;
alter table public.app_bh_sync_runs enable row level security;

revoke all on public.app_bh_events, public.app_bh_event_links, public.app_bh_source_pages, public.app_bh_sync_runs
  from anon, authenticated;
grant select, update, delete on public.app_bh_events to authenticated;
grant select, insert, update, delete on public.app_bh_event_links to authenticated;
grant select on public.app_bh_source_pages, public.app_bh_sync_runs to authenticated;

drop policy if exists "Equipe le e corrige eventos" on public.app_bh_events;
create policy "Equipe le e corrige eventos" on public.app_bh_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe cola links de eventos" on public.app_bh_event_links;
create policy "Equipe cola links de eventos" on public.app_bh_event_links for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe ve as paginas lidas" on public.app_bh_source_pages;
create policy "Equipe ve as paginas lidas" on public.app_bh_source_pages for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe ve as execucoes" on public.app_bh_sync_runs;
create policy "Equipe ve as execucoes" on public.app_bh_sync_runs for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
