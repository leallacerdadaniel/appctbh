-- 022: notificações push (onda 9). Todo aviso novo em app_notices (escrito pela equipe no painel ou por um
-- gatilho: pedido mudou de estado, encomenda chegou) vira push nos telefones registrados.
-- Só no projeto de desenvolvimento appctbh (gxhvhacqemdwwebsftcd). Para produção, só com aprovação do Daniel
-- (e trocar o endereço da função em app_push_run).
--
-- Caminho: insert em app_notices → gatilho app_notices_push → pg_net chama a função app-push com o segredo do
-- Vault no cabeçalho x-push-secret (mesmo padrão da 013) → a função pede os destinatários a app_push_targets,
-- manda pela Expo Push API em lotes de 100 e desliga os aparelhos que voltam DeviceNotRegistered.
-- O app registra o aparelho em app-house/device (tabela app_devices, 008).

-- ---------- colunas ----------
-- Língua do app no aparelho (o push sai nela). Vazia: a língua do último aceite das regras, senão francês.
-- A rota app-house/device precisa gravar body.lang ('fr' | 'en') para preencher esta coluna.
alter table public.app_devices add column if not exists lang text check (lang is null or lang in ('fr', 'en'));
-- Quando o push daquele aviso saiu (a função marca antes de enviar: o mesmo aviso nunca sai duas vezes).
alter table public.app_notices add column if not exists pushed_at timestamptz;

-- ---------- destinatários de um aviso ----------
-- Mesma regra da rota app-house/notices: 'all' = todo aluno ativo com locação no período do app;
-- 'rental' = moradores daquela locação (inclusive quem continua nela, app_rentals_for);
-- 'student' = aquele aluno. Só aparelhos ligados de alunos com acesso ativo.
create or replace function public.app_push_targets(p_notice uuid)
returns table (expo_token text, counterparty_id uuid, lang text)
language sql stable security definer set search_path to 'public' as $$
  select d.expo_token,
         d.counterparty_id,
         coalesce(
           d.lang,
           (select a.lang from public.app_rules_acceptances a
             where a.counterparty_id = d.counterparty_id
             order by a.accepted_at desc limit 1),
           'fr'
         ) as lang
  from public.app_notices n
  join public.app_devices d on d.enabled
  join public.app_students s on s.counterparty_id = d.counterparty_id and s.status = 'active'
  where n.id = p_notice
    and case n.audience
      when 'all' then public.app_rental_for(d.counterparty_id) is not null
      when 'student' then d.counterparty_id = n.counterparty_id
      when 'rental' then n.rental_id = any (coalesce(public.app_rentals_for(d.counterparty_id), '{}'::uuid[]))
      else false
    end
$$;
revoke execute on function public.app_push_targets(uuid) from public, anon, authenticated;
grant execute on function public.app_push_targets(uuid) to service_role;

-- ---------- quem pode chamar a app-push: só quem tem o segredo do Vault ----------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'app_push_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app_push_secret',
      'Enviado pelo gatilho de app_notices no cabeçalho x-push-secret da função app-push (022_push.sql).'
    );
  end if;
end;
$$;

create or replace function public.app_push_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'app_push_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.app_push_secret_ok(text) from public, anon, authenticated;
grant execute on function public.app_push_secret_ok(text) to service_role;

-- Chama a função (assíncrono, pelo pg_net: o insert do aviso não espera o envio).
-- Endereço do appctbh: em produção, trocar pelo endereço do projeto de lá.
create or replace function public.app_push_run(p_notice uuid)
returns bigint language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint;
begin
  select net.http_post(
    url := 'https://gxhvhacqemdwwebsftcd.supabase.co/functions/v1/app-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'app_push_secret')
    ),
    body := jsonb_build_object('noticeId', p_notice),
    timeout_milliseconds := 60000
  ) into v_id;
  return v_id;
end;
$$;
revoke execute on function public.app_push_run(uuid) from public, anon, authenticated;

create or replace function public.app_notices_push()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.app_push_run(new.id);
  return null;
end;
$$;
revoke execute on function public.app_notices_push() from public, anon, authenticated;
drop trigger if exists app_notices_push on public.app_notices;
create trigger app_notices_push after insert on public.app_notices
  for each row execute function public.app_notices_push();
