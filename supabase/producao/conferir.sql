-- Impressão digital de tudo que é do app (tabelas, colunas, funções, políticas, gatilhos, permissões).
-- Só leitura. Rodar igual no dev (appctbh) e na produção (site) e comparar as linhas:
-- antes de aplicar, mostra o que falta na produção; depois, as duas listas devem ser iguais.
with
cols as (
  select 'coluna' as tipo, c.table_name || '.' || c.column_name as nome,
         md5(c.data_type || coalesce(c.column_default, '') || c.is_nullable) as assinatura
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name like 'app\_%'
),
funcs as (
  select 'função', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'app\_%' and p.prokind = 'f'
),
pols as (
  select 'política', tablename || ':' || policyname,
         md5(coalesce(qual, '') || coalesce(with_check, '') || cmd || array_to_string(roles, ','))
  from pg_policies where schemaname = 'public' and tablename like 'app\_%'
),
trgs as (
  select 'gatilho', c.relname || ':' || t.tgname, md5(pg_get_triggerdef(t.oid))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname like 'app\_%' and not t.tgisinternal
),
grants as (
  select 'permissão', table_name || ':' || grantee,
         md5(string_agg(privilege_type, ',' order by privilege_type))
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name like 'app\_%' and grantee in ('anon', 'authenticated')
  group by table_name, grantee
),
fgrants as (
  select 'permissão de função', p.proname || ':' || r.rolname, 'execute'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where n.nspname = 'public' and p.proname like 'app\_%' and has_function_privilege(r.rolname, p.oid, 'execute')
)
select * from cols union all select * from funcs union all select * from pols
union all select * from trgs union all select * from grants union all select * from fgrants
order by 1, 2;

-- Contagem de linhas das tabelas do app que já existem na produção (devem continuar iguais depois).
-- select relname, n_live_tup from pg_stat_user_tables where schemaname = 'public' and relname like 'app\_%' order by 1;
