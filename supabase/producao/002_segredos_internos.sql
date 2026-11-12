-- PRODUÇÃO: as duas senhas internas do app, geradas pelo próprio banco (ninguém vê nem digita o valor).
-- Rodar DEPOIS do 001_app_do_aluno.sql. Pode rodar de novo: não troca uma senha que já existe.
-- Só o banco usa estas senhas: o pg_cron (agenda de BH) e o gatilho dos avisos (push) mandam no cabeçalho, e as
-- funções app-events-sync e app-push conferem pelo banco (app_bh_events_sync_secret_ok, app_push_secret_ok).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'app_events_sync_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app_events_sync_secret',
      'Enviado pelo pg_cron no cabeçalho x-sync-secret da função app-events-sync (013_agenda_bh.sql).'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'app_push_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app_push_secret',
      'Enviado pelo gatilho de app_notices no cabeçalho x-push-secret da função app-push (022_push.sql).'
    );
  end if;
end;
$$;

select name, created_at from vault.secrets where name in ('app_events_sync_secret', 'app_push_secret');
