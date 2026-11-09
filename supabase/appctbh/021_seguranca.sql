-- appctbh: correções da revisão de segurança (09/11/2026). Só o projeto de desenvolvimento (gxhvhacqemdwwebsftcd);
-- antes de levar para o banco do site, ler o aviso do bloco 6 (has_role e anon).
--
-- 1. app_session_state: o token só vale com a conta ativa, a versão da sessão certa e o acesso ainda aberto
--    (app_access_until, data de BH). Todas as Edge Functions chamam esta função no lugar de ler app_students.
-- 2. Contadores atômicos (antes era "conta e depois grava", dava para passar do limite com pedidos em paralelo):
--    app_rate_take / app_rate_refund (login, primeiro acesso, pedidos de nova senha, comunidade, denúncias da
--    Charlotte), app_reset_take_attempt (tentativas do código de 6 dígitos), app_assistant_reserve (cota da
--    Charlotte: a linha de uso é reservada antes de chamar o modelo).
-- 3. app_assistant_reports: "a resposta da Charlotte está errada" (rota report da app-assistant), lida pela equipe.
-- 4. app_account_delete: a exclusão da conta numa transação só (antes eram ~20 chamadas soltas).
-- 5. Grants: anon e authenticated perdem tudo nas tabelas app_*; authenticated recebe de volta só o que o painel do
--    site usa (src/hooks/app-panel/*.ts e useAppServiceCatalog.ts, branch app/painel-do-app). O hash da senha
--    (app_students.password_hash) e o do código (app_password_resets.code_hash) ficam fora do SELECT.
-- Funções: security definer, search_path vazio, EXECUTE só para service_role (as Edge Functions).

-- ---------- 1. sessão ----------
create or replace function public.app_session_state(p_cp uuid, p_version integer)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.counterparty_id is null or s.status <> 'active' or s.session_version is distinct from p_version then 'invalid'
    when public.app_access_until(p_cp) < (now() at time zone 'America/Sao_Paulo')::date then 'ended'
    else 'ok'
  end
  from (select 1) as one
  left join public.app_students s on s.counterparty_id = p_cp
$$;

-- ---------- 2. contadores atômicos ----------
-- Uma linha por tentativa, por balde ('login', 'first_access', 'reset_request', 'community_write',
-- 'assistant_report') e chave (hash do e-mail, hash do IP ou o id do aluno). Linhas com mais de 2 dias somem sozinhas.
create table if not exists public.app_rate_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists app_rate_events_lookup on public.app_rate_events (bucket, key, created_at desc);
create index if not exists app_rate_events_age on public.app_rate_events (created_at);
alter table public.app_rate_events enable row level security;

-- Reserva uma tentativa em cada chave, se nenhuma passou do limite na janela: devolve os ids reservados, ou null.
-- O trava-por-chave (advisory lock da transação) faz o "conta e grava" valer como um passo só.
create or replace function public.app_rate_take(p_bucket text, p_keys text[], p_limits integer[], p_window_seconds integer)
returns bigint[] language plpgsql security definer set search_path = '' as $$
declare
  k text;
  i integer;
  n integer;
  ids bigint[] := '{}';
  new_id bigint;
begin
  if p_keys is null or cardinality(p_keys) = 0 or cardinality(p_keys) <> cardinality(p_limits) then
    raise exception 'app_rate_take: keys and limits must have the same size';
  end if;
  -- sempre na mesma ordem, para dois pedidos com as mesmas chaves não se travarem um ao outro
  for k in select distinct x from unnest(p_keys) as x order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || k, 0));
  end loop;
  for i in 1 .. cardinality(p_keys) loop
    select count(*) into n from public.app_rate_events
      where bucket = p_bucket and key = p_keys[i] and created_at > now() - make_interval(secs => p_window_seconds);
    if n >= p_limits[i] then
      return null;
    end if;
  end loop;
  for i in 1 .. cardinality(p_keys) loop
    insert into public.app_rate_events (bucket, key) values (p_bucket, p_keys[i]) returning id into new_id;
    ids := ids || new_id;
  end loop;
  if random() < 0.02 then
    delete from public.app_rate_events where created_at < now() - interval '2 days';
  end if;
  return ids;
end;
$$;

-- Devolve tentativas reservadas (login certo, primeiro acesso que conferiu): só os erros contam.
create or replace function public.app_rate_refund(p_ids bigint[])
returns void language sql security definer set search_path = '' as $$
  delete from public.app_rate_events where id = any(p_ids)
$$;

-- Gasta uma tentativa do código de 6 dígitos antes de comparar; false quando acabou, venceu ou já foi usado.
create or replace function public.app_reset_take_attempt(p_id uuid, p_max integer)
returns boolean language sql security definer set search_path = '' as $$
  with taken as (
    update public.app_password_resets set attempts = attempts + 1
    where id = p_id and used_at is null and expires_at > now() and attempts < p_max
    returning 1
  )
  select exists (select 1 from taken)
$$;

-- Cota diária da Charlotte (24 h corridas): reserva a linha de uso antes de chamar o modelo; null quando acabou.
create or replace function public.app_assistant_reserve(p_cp uuid, p_limit integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('assistant:' || p_cp::text, 0));
  select count(*) into n from public.app_assistant_usage
    where counterparty_id = p_cp and created_at > now() - interval '24 hours';
  if n >= p_limit then
    return null;
  end if;
  insert into public.app_assistant_usage (counterparty_id, model) values (p_cp, 'pending') returning id into new_id;
  return new_id;
end;
$$;

-- ---------- 3. respostas da Charlotte marcadas como erradas ----------
create table if not exists public.app_assistant_reports (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 4000),
  question text check (question is null or char_length(question) <= 2000),
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid
);
create index if not exists app_assistant_reports_open on public.app_assistant_reports (created_at desc) where handled_at is null;
alter table public.app_assistant_reports enable row level security;
drop policy if exists "Equipe le respostas marcadas da Charlotte" on public.app_assistant_reports;
create policy "Equipe le respostas marcadas da Charlotte" on public.app_assistant_reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

-- ---------- 4. excluir a conta ----------
-- Chamada pela app-api (account-delete) depois de conferir a senha. p_version: a sessão que pediu ainda tem de ser a
-- atual (false se não for). Apaga o que é só do app e do aluno; ficam com a Chez Toi o contrato, os pagamentos, os
-- pedidos (faturados, sem as fotos), as despesas divididas com os colegas, as indicações e o aceite das regras.
-- Tarefas da casa: só o passado que fala só dele (faxina feita por ele, troca que ele fez para si mesmo); a semana
-- atual e as próximas ficam, porque mudariam a escala dos colegas. As fotos dos chamados saem do bucket na função.
create or replace function public.app_account_delete(p_cp uuid, p_version integer, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_posts uuid[];
  v_trips uuid[];
  v_comments uuid[];
  v_week date;
begin
  update public.app_students
     set status = 'disabled', password_hash = null, display_name = null, must_change_password = true,
         session_version = session_version + 1, deleted_at = now(), updated_at = now()
   where counterparty_id = p_cp and session_version = p_version and status = 'active';
  if not found then
    return false;
  end if;

  select coalesce(array_agg(id), '{}') into v_posts from public.app_community_posts where author_cp = p_cp;
  select coalesce(array_agg(id), '{}') into v_trips from public.app_trips where creator_cp = p_cp;
  -- os comentários dele e os que somem junto com os posts e as viagens dele (on delete cascade)
  select coalesce(array_agg(id), '{}') into v_comments from public.app_community_comments
   where author_cp = p_cp or post_id = any(v_posts) or trip_id = any(v_trips);

  delete from public.app_moderation_log
   where actor_id = p_cp or target_id = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));
  delete from public.app_community_reports
   where reporter_cp = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'comment' and target_id = any(v_comments));

  delete from public.app_community_posts where author_cp = p_cp;
  delete from public.app_trips where creator_cp = p_cp;
  delete from public.app_community_comments where author_cp = p_cp;
  delete from public.app_trip_members where counterparty_id = p_cp;
  delete from public.app_community_event_rsvps where counterparty_id = p_cp;
  delete from public.app_community_blocks where blocker_cp = p_cp or blocked_cp = p_cp;
  delete from public.app_community_terms where counterparty_id = p_cp;
  delete from public.app_community_suspensions where counterparty_id = p_cp;

  delete from public.app_profiles where counterparty_id = p_cp;
  delete from public.app_devices where counterparty_id = p_cp;
  delete from public.app_feedback where counterparty_id = p_cp;
  delete from public.app_surveys where counterparty_id = p_cp;
  delete from public.app_referral_codes where counterparty_id = p_cp;
  delete from public.app_cleaning_feedback where counterparty_id = p_cp;
  delete from public.app_visitors where counterparty_id = p_cp;
  delete from public.app_packages where counterparty_id = p_cp;
  delete from public.app_notice_reads where counterparty_id = p_cp;
  delete from public.app_notices where counterparty_id = p_cp;
  delete from public.app_password_resets where counterparty_id = p_cp;
  delete from public.app_profile_corrections where counterparty_id = p_cp;
  delete from public.app_events where counterparty_id = p_cp;
  delete from public.app_assistant_usage where counterparty_id = p_cp;
  delete from public.app_assistant_reports where counterparty_id = p_cp;
  delete from public.app_rate_events where key = p_cp::text;

  v_week := (now() at time zone 'America/Sao_Paulo')::date;
  v_week := v_week - ((extract(isodow from v_week)::integer) - 1);
  delete from public.app_chore_completions where done_by = p_cp and week_start < v_week;
  delete from public.app_chore_swaps where counterparty_id = p_cp and created_by = p_cp and week_start < v_week;

  update public.app_requests set photo_paths = '{}' where counterparty_id = p_cp and photo_paths <> '{}';

  insert into public.app_account_deletions (counterparty_id, reason)
  values (p_cp, nullif(left(btrim(coalesce(p_reason, '')), 500), ''));
  return true;
end;
$$;

-- ---------- execução: só as Edge Functions (service_role) ----------
revoke all on function public.app_session_state(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_rate_take(text, text[], integer[], integer) from public, anon, authenticated;
revoke all on function public.app_rate_refund(bigint[]) from public, anon, authenticated;
revoke all on function public.app_reset_take_attempt(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_assistant_reserve(uuid, integer) from public, anon, authenticated;
revoke all on function public.app_account_delete(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.app_session_state(uuid, integer), public.app_rate_take(text, text[], integer[], integer),
  public.app_rate_refund(bigint[]), public.app_reset_take_attempt(uuid, integer), public.app_assistant_reserve(uuid, integer),
  public.app_account_delete(uuid, integer, text) to service_role;

-- ---------- 5. grants das tabelas app_* ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'app\_%' loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- Só leitura no painel
grant select on
  public.app_service_catalog, public.app_packages, public.app_community_events, public.app_community_event_rsvps,
  public.app_cleaners, public.app_bh_event_links, public.app_bh_events, public.app_bh_sync_runs,
  public.app_requests, public.app_request_events, public.app_referrals, public.app_referral_program,
  public.app_referral_codes, public.app_notices, public.app_notice_reads, public.app_feedback,
  public.app_community_posts, public.app_community_comments, public.app_trips, public.app_trip_members,
  public.app_community_reports, public.app_community_suspensions, public.app_moderation_log,
  public.app_apartment_info, public.app_profile_corrections, public.app_surveys, public.app_account_deletions,
  public.app_assistant_reports
to authenticated;
-- Lidas só pela app-admin hoje; ficam legíveis para a equipe, menos os hashes.
grant select (counterparty_id, auth_user_id, status, must_change_password, last_login_at, last_seen_at, created_at,
  updated_at, display_name, login_count, session_version, birthday_greeted_year, usage_excluded, invited_at, invited_by,
  deleted_at, activated_at) on public.app_students to authenticated;
grant select (id, counterparty_id, channel, expires_at, attempts, used_at, handled_at, handled_by, lang, created_at)
  on public.app_password_resets to authenticated;

-- Escrita no painel (as políticas de cada tabela continuam decidindo quem: admin e equipe)
grant insert, update, delete on public.app_service_catalog, public.app_community_events, public.app_cleaners,
  public.app_bh_event_links to authenticated;
grant insert, delete on public.app_notices to authenticated;
grant insert, update on public.app_referral_program to authenticated;
grant insert on public.app_referrals, public.app_packages to authenticated;
grant update (status, notes, friend_contact) on public.app_referrals to authenticated;
grant update (status, team_note) on public.app_packages to authenticated;
grant update (status, team_note, fee_cents, billing_month, scheduled_date, start_time, end_time) on public.app_requests to authenticated;
grant update (reply, status) on public.app_feedback to authenticated;
grant update (handled_at, handled_by) on public.app_profile_corrections to authenticated;
grant update (hidden) on public.app_bh_events to authenticated;
grant update (cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;
grant insert (apartment_id, cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- ---------- 6. has_role sem anon ----------
-- No appctbh nenhuma política de anon/public chama has_role. No banco do site pode haver (políticas do Lovable sem
-- "to authenticated"): ali, tirar o EXECUTE do anon quebraria a leitura pública dessas tabelas. Por isso o revoke só
-- acontece quando nenhuma política aplicável a anon usa has_role; senão fica um aviso e nada muda.
do $$
begin
  if exists (
    select 1 from pg_policies
    where (coalesce(qual, '') || coalesce(with_check, '')) like '%has_role%'
      and (roles && array['public', 'anon']::name[])
  ) then
    raise warning 'has_role: há políticas de anon/public que chamam has_role; EXECUTE do anon mantido';
  else
    revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
    grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
  end if;
end;
$$;

-- ---------- 7. search_path fixo nas funções que o get_advisors apontou (gatilhos e ajudantes, não são definer) ----------
alter function public.app_requests_touch() set search_path = public;
alter function public.app_community_events_touch() set search_path = public;
alter function public.app_moderation_reason(text) set search_path = public;
alter function public.app_feedback_stamp() set search_path = public;
alter function public.app_referrals_touch() set search_path = public;
alter function public.app_has_link(text) set search_path = public;
