-- 004 (produção) / 027 (appctbh): o aluno marca o chamado de manutenção como resolvido ("C'est réparé",
-- 27/11/2026, decisão do Daniel: "Equipe e aluno"). Conclui o chamado (linha do tempo "por você", sem aviso no sino
-- para ele mesmo) e resolve a ocorrência do site ligada a ele (026). Roda igual nos dois projetos: no appctbh não
-- existe rental_incidents e a parte da ocorrência não roda.

begin;

-- Quem mudou o status: a função do aluno marca a transação com app.by_student = on.
create or replace function public.app_requests_log_after()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_student boolean := coalesce(current_setting('app.by_student', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    insert into public.app_request_events (request_id, status, by_team) values (new.id, new.status, false);
  elsif new.status is distinct from old.status then
    insert into public.app_request_events (request_id, status, by_team, note)
    values (new.id, new.status, new.status <> 'cancelled' and not v_student,
            case when new.status <> 'cancelled' and not v_student then new.team_note end);
  elsif new.team_note is distinct from old.team_note and new.team_note is not null then
    insert into public.app_request_events (request_id, status, by_team, note)
    values (new.id, new.status, true, new.team_note);
  end if;
  return null;
end;
$$;
revoke execute on function public.app_requests_log_after() from public, anon, authenticated;

-- O aviso no sino é para o que a equipe fez; o que o próprio aluno fez não vira aviso para ele.
create or replace function public.app_requests_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_title jsonb;
begin
  if new.status is not distinct from old.status or new.status = 'cancelled'
     or coalesce(current_setting('app.by_student', true), '') = 'on' then
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
revoke execute on function public.app_requests_notify() from public, anon, authenticated;

-- Chamado aberto do próprio aluno → concluído; a ocorrência ligada (se houver) fica resolvida.
-- Devolve false quando o chamado não é dele, não é de manutenção ou já não está aberto.
create or replace function public.app_request_student_resolve(p_cp uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare
  v_incident uuid;
begin
  perform set_config('app.by_student', 'on', true);
  update public.app_requests
  set status = 'done'
  where id = p_id and counterparty_id = p_cp and kind = 'maintenance'
    and status in ('received', 'scheduled', 'in_progress')
  returning incident_id into v_incident;
  if not found then
    perform set_config('app.by_student', '', true);
    return false;
  end if;
  if v_incident is not null and to_regclass('public.rental_incidents') is not null then
    execute 'update public.rental_incidents set resolved = true, resolved_at = now(),
               resolved_notes = coalesce(nullif(resolved_notes, ''''), $2)
             where id = $1 and not resolved'
      using v_incident, 'Resolvido pelo aluno no app.';
  end if;
  perform set_config('app.by_student', '', true);
  return true;
end;
$$;
revoke all on function public.app_request_student_resolve(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_request_student_resolve(uuid, uuid) to service_role;

commit;
