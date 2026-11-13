-- appctbh: correções da revisão independente do servidor (10/11/2026). Só o projeto de desenvolvimento
-- (gxhvhacqemdwwebsftcd). As funções trocadas partem do que estava no ar (pg_get_functiondef), não dos arquivos
-- antigos; continuam security definer, com search_path fixo e os mesmos EXECUTE. Pode rodar de novo.
--
--  1. Contrato do aluno: app_home_for (has_contract) só olha rental_contracts.contract_type = 'tenant'. Cada locação
--     tem duas linhas ('owner' e 'tenant'); a do proprietário não é do aluno. A rota contract da app-api faz o mesmo.
--  2. Locação 'finished': o site marca apartment_rentals.status = 'finished' quando o check-out termina (e
--     rental_tenants.is_active continua true). app_rental_for passa a valer para 'active' ou para 'finished' até
--     30 dias depois do fim (data de BH, não a do servidor em UTC), preferindo a ativa; app_access_until =
--     maior fim + 30 entre 'active' e 'finished'. Quem não tem locação nenhuma dessas continua como antes
--     (sessão válida, rotas respondem noRental).
--  3. Aparelhos: quando a sessão do aluno cai (session_version muda) ou a conta deixa de estar 'active', os
--     aparelhos dele em app_devices ficam com enabled = false. O app registra de novo ao abrir (rota device).
--  4. app_notices_push: erro no push (banco sem pg_net, Vault, rede) vira aviso no log e nunca derruba o INSERT do
--     aviso nem o que vem antes dele (pedido, encomenda, resposta de feedback, moderação, evento).
--  5. app_account_delete: ficam a suspensão da comunidade, os bloqueios em que ele é o bloqueado e o histórico de
--     moderação sobre ele (não sobre o conteúdo). Quem ia numa viagem organizada por ele é avisado antes de a
--     viagem sumir; os avisos dos colegas que apontavam para posts e viagens apagados saem do sino.
--  6. app_assistant_reserve: linha 'pending' com mais de 10 minutos (função morta no meio do pedido) não conta na
--     cota diária da Charlotte.
--  7. app_has_link: regra nova, igual à das Edge Functions e à do app (quatro padrões, ver abaixo).
--  8. Espaço gourmet: app_gourmet_book confere o horário e grava a reserva num passo só (trava por espaço e dia),
--     olhando todos os apartamentos que dividem o espaço (app_gourmet_space).
--  9. Menor privilégio: authenticated perde o SELECT por coluna em app_students e app_password_resets (o painel só
--     chega a essas tabelas pela função app-admin).

-- ---------- 1. contrato do aluno ----------
create or replace function public.app_home_for(p_cp uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_rental uuid := public.app_rental_for(p_cp);
  v_rentals uuid[] := public.app_rentals_for(p_cp);
  result jsonb;
begin
  if v_rental is null then
    return null;
  end if;

  select jsonb_build_object(
    'student', (select jsonb_build_object('name', coalesce(nullif(trim(s.display_name), ''), c.name), 'email', c.email)
                from public.finance_counterparties c
                left join public.app_students s on s.counterparty_id = c.id
                where c.id = p_cp),
    'must_change_password', (select must_change_password from public.app_students where counterparty_id = p_cp),
    'apartment', jsonb_build_object(
      'title', a.title, 'location', a.location, 'address_complement', a.address_complement,
      'latitude', a.latitude, 'longitude', a.longitude,
      'photo', a.card_image_url
    ),
    'rental', jsonb_build_object(
      'name', r.nickname,
      'semester', r.semester, 'start_date', r.start_date,
      'end_date', (select max(x.end_date) from public.apartment_rentals x where x.id = any(v_rentals)),
      'cleaning_day', r.cleaning_day, 'cleaning_frequency', r.cleaning_frequency,
      'cleaning_time', r.cleaning_time,
      'currency', case when r.contract_type = 'commission_eur' then 'EUR' else 'BRL' end,
      'contract_rent', case when r.contract_type = 'commission_eur' then r.contract_value_eur else r.monthly_rent end,
      'has_contract', exists (select 1 from public.rental_contracts k
                              where k.rental_id = r.id and k.contract_type = 'tenant' and k.file_path is not null)
    ),
    'tenant', (select jsonb_build_object('move_in_date', min(t.move_in_date), 'move_out_date', max(t.move_out_date),
                                         'rent', (array_agg(t.individual_rent) filter (where t.rental_id = r.id))[1])
               from public.rental_tenants t
               where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp and t.is_active
               having count(*) > 0),
    'info', (select to_jsonb(i) - 'updated_by' - 'updated_at' - 'cleaner_id'
             from public.app_apartment_info i where i.apartment_id = a.id),
    'cleaner', (select jsonb_build_object('name', cl.name,
                                          'phone', case when cl.share_phone then cl.phone end,
                                          'photo', cl.photo_url)
                from public.app_apartment_info i
                join public.app_cleaners cl on cl.id = i.cleaner_id
                where i.apartment_id = a.id and cl.active),
    'roommates', coalesce((select jsonb_agg(coalesce(nullif(trim(s.display_name), ''), c.name)
                                            order by coalesce(nullif(trim(s.display_name), ''), c.name))
                           from public.rental_tenants t
                           join public.finance_counterparties c on c.id = t.counterparty_id
                           left join public.app_students s on s.counterparty_id = t.counterparty_id
                           where t.rental_id = r.id and t.is_active and t.counterparty_id <> p_cp), '[]'::jsonb),
    'cleanings', coalesce((select jsonb_agg(jsonb_build_object(
                              'id', k.id,
                              'date', k.scheduled_date, 'time', k.scheduled_time,
                              'completed', k.completed, 'completed_at', k.completed_at,
                              'feedback_until', greatest(k.scheduled_date, (k.completed_at at time zone 'America/Sao_Paulo')::date) + 7,
                              'feedback', (select jsonb_build_object('rating', f.rating, 'comment', f.comment)
                                           from public.app_cleaning_feedback f
                                           where f.cleaning_id = k.id and f.counterparty_id = p_cp))
                            order by k.scheduled_date)
                           from public.cleaning_records k where k.rental_id = any(v_rentals)), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('month', m.month_year, 'paid', m.paid) order by m.month_year)
                          from (select p.month_year, bool_and(p.status = 'paid') as paid
                                from public.student_payments p
                                join public.rental_tenants t on t.id = p.tenant_id
                                where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp
                                  and coalesce(lower(p.payment_type), 'rent') = 'rent'
                                group by p.month_year) m), '[]'::jsonb),
    'deposit', (select jsonb_build_object('amount', d.amount - coalesce((select sum(x.amount)
                                                                          from public.security_deposit_deductions x
                                                                          where x.deposit_id = d.id), 0),
                                          'currency', d.currency,
                                          'status', d.status, 'returned_date', d.returned_date)
                from public.security_deposits d
                where d.rental_id = any(v_rentals) and d.counterparty_id = p_cp
                  and coalesce(d.deposit_type, 'student') <> 'owner'
                order by (d.status = 'returned'), d.created_at desc
                limit 1)
  )
  into result
  from public.apartment_rentals r
  join public.apartments a on a.id = r.apartment_id
  where r.id = v_rental;

  return result;
end;
$$;
revoke all on function public.app_home_for(uuid) from public, anon, authenticated;
grant execute on function public.app_home_for(uuid) to service_role;

-- ---------- 2. locação 'finished' e a data de BH ----------
-- A locação que vale para o aluno: 'active', ou 'finished' até 30 dias depois do fim (o prazo prometido para baixar
-- contrato, recibos e laudo). Entre uma ativa e uma encerrada, a ativa. "Hoje" é o dia de Belo Horizonte: o banco
-- roda em UTC e, das 21h à meia-noite de BH, current_date já era o dia seguinte.
create or replace function public.app_rental_for(p_cp uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select r.id
  from public.app_students s
  join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
  join public.apartment_rentals r on r.id = t.rental_id
  cross join public.app_settings cfg
  cross join (select (now() at time zone 'America/Sao_Paulo')::date as today) d
  where s.counterparty_id = p_cp
    and s.status = 'active'
    and (r.status = 'active' or (r.status = 'finished' and r.end_date + 30 >= d.today))
    and r.id <> all (cfg.excluded_rental_ids)
    and r.start_date <= cfg.access_end
    and r.end_date >= cfg.access_start
  order by (r.status = 'active') desc,
           (d.today between r.start_date and r.end_date) desc,
           (r.start_date >= d.today) desc,
           abs(r.start_date - d.today)
  limit 1
$$;
revoke all on function public.app_rental_for(uuid) from public, anon, authenticated;
grant execute on function public.app_rental_for(uuid) to service_role;

-- Até quando o aluno ainda entra: o maior fim entre as locações ativas e as encerradas dele, mais 30 dias.
-- Null só quando não há nenhuma locação 'active' ou 'finished' (aí quem decide é a app_rental_for: noRental).
-- Com a 'finished' na conta, o acesso de quem saiu termina de verdade (app_session_state responde 'ended').
create or replace function public.app_access_until(p_cp uuid)
returns date language sql stable security definer set search_path to 'public' as $$
  select max(r.end_date) + 30
  from public.rental_tenants t
  join public.apartment_rentals r on r.id = t.rental_id
  where t.counterparty_id = p_cp and t.is_active and r.status in ('active', 'finished')
$$;
revoke all on function public.app_access_until(uuid) from public, anon, authenticated;
grant execute on function public.app_access_until(uuid) to service_role;

-- ---------- 3. aparelho de quem perdeu a sessão não recebe push ----------
-- Sair, trocar a senha, nova senha por código, convite da equipe e desligar a conta mudam session_version ou status.
-- O telefone que ficou para trás (roubado, emprestado, vendido) deixa de receber os avisos pessoais na hora; o app
-- do aluno registra o aparelho de novo na próxima abertura (app-house/device volta a ligar).
create or replace function public.app_students_devices_off()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.app_devices set enabled = false where counterparty_id = new.counterparty_id and enabled;
  return null;
end;
$$;
revoke all on function public.app_students_devices_off() from public, anon, authenticated;
drop trigger if exists app_students_devices_off on public.app_students;
create trigger app_students_devices_off after update on public.app_students
  for each row
  when (new.session_version is distinct from old.session_version
        or (old.status = 'active' and new.status is distinct from 'active'))
  execute function public.app_students_devices_off();

-- ---------- 4. o aviso nunca falha por causa do push ----------
create or replace function public.app_notices_push()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform public.app_push_run(new.id);
  exception when others then
    raise warning 'app_notices_push: aviso % ficou sem push (%)', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke execute on function public.app_notices_push() from public, anon, authenticated;

-- ---------- 5. excluir a conta ----------
-- Igual à 021, com quatro diferenças:
--   - ficam a suspensão da comunidade, os bloqueios em que ele é o bloqueado e o histórico de moderação cujo alvo é
--     o aluno (suspensões): quem apaga a conta e volta pelo primeiro acesso não volta "limpo";
--   - quem ia numa viagem organizada por ele (ainda por acontecer) recebe um aviso antes de a viagem sumir;
--   - os avisos no sino dos colegas que apontavam para os posts e as viagens apagados saem junto;
--   - os contadores de limite com o id dele no fim da chave ('<viagem>:<aluno>') também saem.
-- As fotos dos chamados saem do bucket ANTES desta função (rota account-delete da app-api).
create or replace function public.app_account_delete(p_cp uuid, p_version integer, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_posts uuid[];
  v_trips uuid[];
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

  select coalesce(array_agg(id), '{}') into v_posts from public.app_community_posts where author_cp = p_cp;
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

  -- avisos no sino dos outros que levavam para um post ou uma viagem que deixa de existir
  delete from public.app_notices
   where href = any (array(select '/community/post/' || x::text from unnest(v_posts) as x)
                     || array(select '/community/trips/' || x::text from unnest(v_trips) as x));

  -- do histórico de moderação sai o que ele fez e o que fala do conteúdo dele; fica o que fala dele (suspensões)
  delete from public.app_moderation_log
   where (actor_id = p_cp and target_id <> p_cp)
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
$$;
revoke all on function public.app_account_delete(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.app_account_delete(uuid, integer, text) to service_role;

-- ---------- 6. cota da Charlotte ----------
-- A linha de uso nasce 'pending' e a função troca pelo modelo quando a resposta chega. Função morta no meio
-- (tempo esgotado, reinício) deixava a 'pending' contando por 24 h; agora ela só conta por 10 minutos.
create or replace function public.app_assistant_reserve(p_cp uuid, p_limit integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('assistant:' || p_cp::text, 0));
  select count(*) into n from public.app_assistant_usage
    where counterparty_id = p_cp and created_at > now() - interval '24 hours'
      and not (model = 'pending' and created_at < now() - interval '10 minutes');
  if n >= p_limit then
    return null;
  end if;
  insert into public.app_assistant_usage (counterparty_id, model) values (p_cp, 'pending') returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.app_assistant_reserve(uuid, integer) from public, anon, authenticated;
grant execute on function public.app_assistant_reserve(uuid, integer) to service_role;

-- ---------- 7. nenhum link no que o aluno escreve: regra nova ----------
-- A regra antiga recusava frases normais ("Merci.De rien", "Thanks.It works", "à 18h.Es-tu dispo ?") e deixava
-- passar links de verdade (evil.ru/x, linktr.ee/abc, endereços IP). A MESMA regra vale nas Edge Functions
-- (LINK_RULES em app-api, app-community, app-house, app-requests, app-feedback) e no app (src/lib/no-links.ts):
-- mudou uma, mudam todas. Em JavaScript:
--   A  /(?:https?|ftp):\/\/|\bwww\.[a-z0-9-]/i                       esquema ou www.
--   B  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\/[^\s]/i          qualquer domínio seguido de caminho
--   C  /\b\d{1,3}(?:\.\d{1,3}){3}\b/                                 endereço IP
--   D  /\b[A-Za-z0-9-]{2,}\.(?:com|net|…|gy)(?![A-Za-z0-9À-ÿ-])/     domínio sem caminho, terminações comuns;
--      diferencia maiúsculas de propósito (maiúscula depois do ponto é frase nova) e de/me/to/be/us/es/it/co
--      deixaram de valer como terminação.
-- Aqui, "b" é o \b do JavaScript escrito por extenso (fronteira de palavra ASCII; o \y do Postgres segue o locale e
-- trataria "é" como letra) e "ns" é o [^\s] do JavaScript (espaço, tab, quebras de linha e os espaços Unicode
-- U+00A0, U+1680, U+2000 a U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 e U+FEFF, montados com chr()).
-- As regras *_no_links das tabelas (019) chamam esta função: valem para linhas novas e editadas.
create or replace function public.app_has_link(t text)
returns boolean language sql immutable set search_path to 'public' as $$
  with p as (
    select coalesce(t, '') as s,
           '(?:(?<![A-Za-z0-9_])(?=[A-Za-z0-9_])|(?<=[A-Za-z0-9_])(?![A-Za-z0-9_]))'::text as b,
           '[^ ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(160) || chr(5760)
             || chr(8192) || '-' || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287)
             || chr(12288) || chr(65279) || ']' as ns
  )
  select s ~* ('(?:https?|ftp)://|' || b || 'www\.[a-z0-9-]')
      or s ~* (b || '[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/' || ns)
      or s ~* (b || '[0-9]{1,3}(?:\.[0-9]{1,3}){3}' || b)
      or s ~  (b || '[A-Za-z0-9-]{2,}\.(?:com|net|org|io|fr|br|eu|uk|pt|ru|cn|xyz|info|online|link|shop|store|site|app|ly|gg|ee|gy)(?![A-Za-z0-9À-ÿ-])')
  from p
$$;

-- ---------- 8. espaço gourmet: conferir e reservar num passo só ----------
-- O espaço é do prédio, não do apartamento. Não há tabela de prédios: dois apartamentos dividem o espaço quando
-- têm o mesmo texto em app_apartment_info.building_info.gourmet.space ou, sem esse campo, o mesmo endereço
-- (apartments.location, sem diferença de maiúsculas e de espaços). Endereços escritos de formas diferentes para o
-- mesmo prédio: a equipe põe o mesmo "space" nos dois apartamentos.
create or replace function public.app_gourmet_space(p_apartment uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(
    nullif(btrim(i.building_info #>> '{gourmet,space}'), ''),
    nullif(lower(regexp_replace(btrim(a.location), '\s+', ' ', 'g')), ''),
    a.id::text)
  from public.apartments a
  left join public.app_apartment_info i on i.apartment_id = a.id
  where a.id = p_apartment
$$;
revoke all on function public.app_gourmet_space(uuid) from public, anon, authenticated;

-- Devolve o id do pedido criado, ou null quando o horário cruza com outra reserva em vigor do mesmo espaço (de
-- qualquer apartamento que o divide). A trava por espaço e dia vale até o fim da transação: dois pedidos ao mesmo
-- tempo não passam juntos. As demais validações (horário de funcionamento, duração, convidados) ficam na função
-- app-requests, que é a única que chama esta.
create or replace function public.app_gourmet_book(
  p_cp uuid, p_rental uuid, p_date date, p_start time, p_end time, p_guests integer, p_note text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_space text;
  v_id uuid;
begin
  select public.app_gourmet_space(r.apartment_id) into v_space from public.apartment_rentals r where r.id = p_rental;
  if v_space is null then
    raise exception 'app_gourmet_book: locação sem apartamento';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('gourmet:' || v_space || ':' || p_date::text, 0));
  if exists (
    select 1
      from public.app_requests q
      join public.apartment_rentals r on r.id = q.rental_id
     where q.kind = 'gourmet'
       and q.scheduled_date = p_date
       and q.status not in ('cancelled', 'declined')
       and q.start_time < p_end and p_start < q.end_time
       and public.app_gourmet_space(r.apartment_id) = v_space
  ) then
    return null;
  end if;
  insert into public.app_requests (counterparty_id, rental_id, kind, note, scheduled_date, start_time, end_time, guests)
  values (p_cp, p_rental, 'gourmet', p_note, p_date, p_start, p_end, p_guests)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.app_gourmet_book(uuid, uuid, date, time, time, integer, text) from public, anon, authenticated;
grant execute on function public.app_gourmet_book(uuid, uuid, date, time, time, integer, text) to service_role;

-- ---------- 9. menor privilégio ----------
-- A 021 deixou app_students e app_password_resets legíveis (menos os hashes) para a equipe logada. O painel não lê
-- nenhuma das duas direto (conferido em src/hooks/app-panel e src/pages/admin/AdminApp*.tsx do site): tudo passa
-- pela função app-admin, com a chave de serviço. As políticas de SELECT ficam, sem efeito enquanto não houver grant.
revoke select on public.app_students, public.app_password_resets from authenticated;
revoke select (counterparty_id, auth_user_id, status, must_change_password, last_login_at, last_seen_at, created_at,
  updated_at, display_name, login_count, session_version, birthday_greeted_year, usage_excluded, invited_at, invited_by,
  deleted_at, activated_at) on public.app_students from authenticated;
revoke select (id, counterparty_id, channel, expires_at, attempts, used_at, handled_at, handled_by, lang, created_at)
  on public.app_password_resets from authenticated;
