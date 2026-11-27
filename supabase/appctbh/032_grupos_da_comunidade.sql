-- 032 (appctbh) / 008 (produção, mesmo texto em supabase/producao/008_grupos_da_comunidade.sql): grupos da comunidade
-- (27/11/2026, pedido do Daniel: "tirar a opção de postar só pros roommates: comunidade ou é pra todos, ou pra grupos
-- que ele deveria poder criar").
--
-- O app deixa de oferecer "Mon appart": um post é para todos (scope 'all') ou para um grupo (scope 'group' +
-- group_id). Posts antigos com scope 'apartment' podem ficar no banco (na produção não havia nenhum em 27/11), mas a
-- app-community não os lista nem aceita novos.
-- Grupos abertos, como as viagens: qualquer morador vê a lista e entra com um toque; só quem entrou lê e escreve no
-- grupo. A IA confere nome e descrição antes de o grupo aparecer (como as viagens); a equipe decide o que ela segura
-- pelo painel (app_team_moderate, tipo 'group'). Quem criou pode arquivar o grupo. Quem criou e exclui a conta: o
-- grupo continua para os outros membros (sem criador); se não houver outro membro, o grupo some.
-- Idempotente: pode rodar de novo.

create table if not exists public.app_community_groups (
  id uuid primary key default gen_random_uuid(),
  -- null: quem criou excluiu a conta (o grupo continua para os outros)
  creator_cp uuid references public.finance_counterparties(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text check (description is null or char_length(description) <= 300),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed', 'archived')),
  ai_verdict text check (ai_verdict in ('ok', 'review', 'block', 'unchecked')),
  ai_reason jsonb,          -- { pt, fr, en, categories }: pt para a equipe, fr/en para o aluno
  ai_checked_at timestamptz,
  reports_count integer not null default 0,
  team_decision text check (team_decision in ('kept', 'removed')),
  team_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_community_groups_no_links check (not public.app_has_link(name) and not public.app_has_link(description))
);
create index if not exists app_community_groups_open on public.app_community_groups (status, created_at desc);

create table if not exists public.app_community_group_members (
  group_id uuid not null references public.app_community_groups(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, counterparty_id)
);
create index if not exists app_community_group_members_cp on public.app_community_group_members (counterparty_id);

-- posts de grupo
alter table public.app_community_posts
  add column if not exists group_id uuid references public.app_community_groups(id) on delete cascade;
alter table public.app_community_posts drop constraint if exists app_community_posts_scope_check;
alter table public.app_community_posts
  add constraint app_community_posts_scope_check check (scope in ('apartment', 'all', 'group'));
alter table public.app_community_posts drop constraint if exists app_community_posts_group_check;
alter table public.app_community_posts
  add constraint app_community_posts_group_check check ((scope = 'group') = (group_id is not null));
create index if not exists app_community_posts_group
  on public.app_community_posts (group_id, created_at desc) where group_id is not null;

-- denunciar um grupo (nome ou descrição)
alter table public.app_community_reports drop constraint if exists app_community_reports_target_type_check;
alter table public.app_community_reports
  add constraint app_community_reports_target_type_check check (target_type in ('post', 'comment', 'trip', 'group'));

-- acesso: só a função (service role) escreve; a equipe lê no painel; anon nada (021)
alter table public.app_community_groups enable row level security;
alter table public.app_community_group_members enable row level security;
revoke all on public.app_community_groups, public.app_community_group_members from anon, public;
drop policy if exists "Equipe le grupos" on public.app_community_groups;
create policy "Equipe le grupos" on public.app_community_groups for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
drop policy if exists "Equipe le membros dos grupos" on public.app_community_group_members;
create policy "Equipe le membros dos grupos" on public.app_community_group_members for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
revoke all on public.app_community_groups, public.app_community_group_members from authenticated;
grant select on public.app_community_groups, public.app_community_group_members to authenticated;

-- a equipe decide também sobre grupos (painel › Comunidade); grupo sem criador (conta excluída) não tem a quem avisar
create or replace function public.app_team_moderate(p_type text, p_id uuid, p_action text, p_reason text default null, p_note text default null)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_author uuid;
  v_found boolean := false;
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
    v_found := found;
  elsif p_type = 'comment' then
    update public.app_community_comments
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now()
      where id = p_id returning author_cp into v_author;
    v_found := found;
  elsif p_type = 'trip' then
    update public.app_trips
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id and status <> 'cancelled' returning creator_cp into v_author;
    v_found := found;
  elsif p_type = 'group' then
    update public.app_community_groups
      set status = v_status, team_decision = v_decision, team_reason = p_reason, decided_by = auth.uid(), decided_at = now(), updated_at = now()
      where id = p_id and status <> 'archived' returning creator_cp into v_author;
    v_found := found;
  else
    raise exception 'bad type';
  end if;
  if not v_found then raise exception 'not found'; end if;

  update public.app_community_reports
    set resolved_at = now(), resolved_by = auth.uid(), resolution = v_decision
    where target_type = p_type and target_id = p_id and resolved_at is null;
  insert into public.app_moderation_log (target_type, target_id, actor, actor_id, action, reason)
    values (p_type, p_id, 'team', auth.uid(), v_status, concat_ws(' · ', p_reason, nullif(trim(p_note), '')));

  if p_action = 'remove' and v_author is not null then
    v_reason := public.app_moderation_reason(p_reason);
    insert into public.app_notices (audience, counterparty_id, title, body, href, created_by)
    values ('student', v_author,
      case when p_type = 'group'
        then jsonb_build_object('fr', 'Votre groupe a été retiré', 'en', 'Your group was removed')
        else jsonb_build_object('fr', 'Votre publication a été retirée', 'en', 'Your post was removed') end,
      jsonb_build_object('fr', 'Motif : ' || (v_reason->>'fr'), 'en', 'Reason: ' || (v_reason->>'en')),
      '/community/charter', auth.uid());
  end if;
end;
$function$;
revoke execute on function public.app_team_moderate(text, uuid, text, text, text) from public, anon;
grant execute on function public.app_team_moderate(text, uuid, text, text, text) to authenticated;

-- excluir a conta: os grupos que ele criou continuam para os outros membros (sem criador); os que só tinham ele somem
create or replace function public.app_account_delete(p_cp uuid, p_version integer, p_reason text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_posts uuid[];
  v_trips uuid[];
  v_groups uuid[];
  v_comments uuid[];
  v_week date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.app_students
     set status = 'disabled', password_hash = null, display_name = null, must_change_password = true,
         session_version = session_version + 1, deleted_at = now(), updated_at = now()
   where counterparty_id = p_cp and session_version = p_version and status = 'active';
  if not found then
    return false;
  end if;

  -- grupos dele sem nenhum outro membro: somem (com os posts que ficaram neles)
  select coalesce(array_agg(g.id), '{}') into v_groups from public.app_community_groups g
   where g.creator_cp = p_cp
     and not exists (select 1 from public.app_community_group_members m
                      where m.group_id = g.id and m.counterparty_id <> p_cp);
  select coalesce(array_agg(id), '{}') into v_posts from public.app_community_posts
   where author_cp = p_cp or group_id = any(v_groups);
  select coalesce(array_agg(id), '{}') into v_trips from public.app_trips where creator_cp = p_cp;
  -- os comentários dele e os que somem junto com os posts e as viagens dele (on delete cascade)
  select coalesce(array_agg(id), '{}') into v_comments from public.app_community_comments
   where author_cp = p_cp or post_id = any(v_posts) or trip_id = any(v_trips);

  -- quem ia numa viagem dele que ainda não acabou fica sabendo (a viagem some logo abaixo)
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  select 'student', m.counterparty_id,
         jsonb_build_object('fr', 'Voyage annulé : ' || t.destination, 'en', 'Trip cancelled: ' || t.destination),
         jsonb_build_object('fr', 'L’organisateur a quitté l’app : ce voyage n’existe plus.',
                            'en', 'The organiser left the app, so this trip no longer exists.'),
         '/community/trips'
    from public.app_trips t
    join public.app_trip_members m on m.trip_id = t.id and m.counterparty_id <> p_cp
   where t.creator_cp = p_cp and t.status in ('pending', 'published', 'hidden') and t.ends_on >= v_today;

  -- avisos no sino dos outros que levavam para um post, uma viagem ou um grupo que deixa de existir
  delete from public.app_notices
   where href = any (array(select '/community/post/' || x::text from unnest(v_posts) as x)
                     || array(select '/community/trips/' || x::text from unnest(v_trips) as x)
                     || array(select '/community/groups/' || x::text from unnest(v_groups) as x));

  -- do histórico de moderação sai o que ele fez e o que fala do conteúdo dele; fica o que fala dele (suspensões)
  delete from public.app_moderation_log
   where (actor_id = p_cp and target_id <> p_cp)
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'group' and target_id = any(v_groups))
      or (target_type = 'comment' and target_id = any(v_comments));
  delete from public.app_community_reports
   where reporter_cp = p_cp
      or (target_type = 'post' and target_id = any(v_posts))
      or (target_type = 'trip' and target_id = any(v_trips))
      or (target_type = 'group' and target_id = any(v_groups))
      or (target_type = 'comment' and target_id = any(v_comments));

  delete from public.app_community_posts where author_cp = p_cp;
  delete from public.app_trips where creator_cp = p_cp;
  delete from public.app_community_comments where author_cp = p_cp;
  delete from public.app_trip_members where counterparty_id = p_cp;
  delete from public.app_community_groups where id = any(v_groups);
  update public.app_community_groups set creator_cp = null, updated_at = now() where creator_cp = p_cp;
  delete from public.app_community_group_members where counterparty_id = p_cp;
  delete from public.app_community_event_rsvps where counterparty_id = p_cp;
  -- só os bloqueios que ELE fez; quem o bloqueou continua protegido se ele voltar
  delete from public.app_community_blocks where blocker_cp = p_cp;
  delete from public.app_community_terms where counterparty_id = p_cp;
  -- app_community_suspensions fica: a suspensão vale também depois de um novo primeiro acesso

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
  delete from public.app_rate_events where key = p_cp::text or key like '%:' || p_cp::text;

  v_week := v_today - ((extract(isodow from v_today)::integer) - 1);
  delete from public.app_chore_completions where done_by = p_cp and week_start < v_week;
  delete from public.app_chore_swaps where counterparty_id = p_cp and created_by = p_cp and week_start < v_week;

  update public.app_requests set photo_paths = '{}' where counterparty_id = p_cp and photo_paths <> '{}';

  insert into public.app_account_deletions (counterparty_id, reason)
  values (p_cp, nullif(left(btrim(coalesce(p_reason, '')), 500), ''));
  return true;
end;
$function$;
