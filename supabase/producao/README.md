# producao: o app do aluno no banco do site

`001_app_do_aluno.sql` leva para o banco do site (`miucfiiporxhvvbefonh`) as tabelas, funções, gatilhos, políticas e
grants do app do aluno, para ficarem iguais aos do desenvolvimento (`appctbh`) depois da 025. Montado em 12/11/2026
a partir de `supabase/appctbh/` (002, 004, 006, 007, 008, 010 a 017, 019 a 025, nessa ordem, uma seção por arquivo).
**Ainda não foi aplicado.** Só com backup, homologação e aprovação do Daniel.

- Uma transação só (`begin; … commit;`): se um comando falhar, nada fica.
- Pode rodar de novo: `if not exists`, `drop … if exists` antes de cada `create policy`/`create trigger`,
  `create or replace function` e `do $$` com checagem para as regras `*_no_links`.
- `lock_timeout` de 10 s: se uma tabela estiver ocupada (por exemplo `storage.objects`, que o site usa), o arquivo
  falha em vez de deixar o site esperando.
- As 11 tabelas `app_*` que a produção já tem ficam como estão (nenhuma linha muda); ganham só colunas novas
  (`app_students`, `app_apartment_info`), políticas, gatilhos e regras `*_no_links` (NOT VALID: as linhas antigas
  não são conferidas).

## O que ficou de fora

| Fonte | O quê | Por quê |
|---|---|---|
| 001 | Estrutura das tabelas do site | É a cópia do site para o dev; lá ela é a original |
| 003, 005, 009, 018 | Dados de teste | Alunos, catálogo de exemplo ("preços a definir"), Pix fictício, posts e viagem |
| Fim da 011, 012, 020 | Dados fictícios | Faxineira, portaria, visitas, encomendas e perfis de teste; passaportes e telefones de teste na ficha do site |
| 006, parte 1 | `app_role`, `user_roles`, `has_role` | Já existem no site e não podem ser trocadas |
| 021, bloco 6 | Revogar o EXECUTE de anon em `has_role` | É função do site; se um dia quiser, é outra decisão, olhando as políticas do site |
| 013 e 022 | Criação dos segredos no Vault | Viraram passo manual (passo 4), sem valor no arquivo |
| 019b | Apagar `app_trips.whatsapp_link` | Aqui a coluna nem é criada (no dev nasceu na 015 e saiu depois) |

Mudanças de forma em relação ao dev: endereços das funções apontam para a produção; na 021 o `revoke` de anon e
authenticated passa por uma lista fixa das 53 tabelas do app (no dev era "toda tabela `app_%`"; outra que aparecer só
gera um aviso).

## O que mexe fora de `app_*`

- Extensão `pg_net` (nova) e `pg_cron` (`if not exists`, já existe).
- Bucket privado `app-request-photos` (fotos dos chamados) e a política "Equipe ve fotos dos chamados" em
  `storage.objects`, só para esse bucket.
- Agendamento `app-events-sync-daily` no `pg_cron` (06:15 de BH).

Linhas de configuração que entram: `app_payment_info` (uma linha vazia, a equipe preenche no painel) e
`app_referral_program` (ativo, sem recompensa). O catálogo de extras começa vazio.

## Conferir na homologação

- **Travas no site durante a transação** (segundos): as tabelas novas com chave estrangeira travam a escrita em
  `finance_counterparties` e `apartment_rentals` até o `commit`, e a política do bucket trava `storage.objects`.
  Por isso o horário de pouco movimento e o `lock_timeout`.
- **Chaves sem `on delete`** em `app_chores.created_by`, `app_chore_swaps.counterparty_id`/`created_by` e
  `app_chore_completions.done_by` (008, como no dev): o site não consegue apagar uma ficha de
  `finance_counterparties` que tenha tarefa da casa (hoje já é assim com as despesas da casa).
- **Funções que a `bright-service` também usa** (`app_home_for`, `app_rental_for`, `app_login_lookup` etc.) passam
  a ter o comportamento do dev, e as regras `*_no_links` valem para despesas e notas de faxina novas. A
  `bright-service` mudou em 08/11 22h32, depois da cópia da 002: se a assinatura de alguma função mudou lá, o
  `create or replace` falha e nada é aplicado.
- O dev tinha 54 tabelas `app_*` no levantamento de 09/11; os arquivos criam 53. Conferir qual falta.

## Marcadores

- `<<SEGREDO_DA_AGENDA>>` e `<<SEGREDO_DO_PUSH>>`, nos blocos comentados das seções 013 e 022: um texto aleatório
  longo cada. Não precisa guardar em outro lugar: só o banco usa (as funções conferem por RPC). Melhor ainda: no
  lugar do marcador, `encode(extensions.gen_random_bytes(32), 'hex')`, que gera o valor no banco e não deixa o
  segredo no histórico do SQL Editor (se o `pgcrypto` da produção não estiver no esquema `extensions`, tirar o prefixo).

## Ordem

1. **Backup** do banco do site. Antes, a homologação de `docs/caminho-producao.md` (projeto só com a estrutura do
   site, este arquivo aplicado, app e painel testados).
2. **Aplicar** `001_app_do_aluno.sql` no SQL Editor da produção, em horário de pouco movimento, conferindo o
   projeto. Ler os avisos do fim (tabela `app_*` fora da lista).
3. **Funções**: publicar na produção `app-api`, `app-house`, `app-requests`, `app-assistant`, `app-community`,
   `app-feedback`, `app-events`, `app-events-sync` e `app-push` com Verify JWT desligado, e `app-admin` com Verify
   JWT ligado. A `bright-service` fica como está.
4. **Segredos**:
   - Vault: rodar os dois blocos comentados (seções 013 e 022) com os marcadores trocados. Sem eles o push não sai
     e o robô da agenda é recusado.
   - Funções (Edge Functions › Secrets): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`; opcionais
     `APP_MODERATION_MODEL`, `EXPO_ACCESS_TOKEN`, `APP_ASSISTANT_MODEL`, `APP_ASSISTANT_EFFORT`,
     `APP_ASSISTANT_DAILY_LIMIT`.
5. **Conferir**:

   ```sql
   select count(*) from pg_tables where schemaname = 'public' and tablename like 'app\_%';  -- 53
   select jobname, schedule from cron.job where jobname = 'app-events-sync-daily';
   select name from vault.secrets where name in ('app_events_sync_secret', 'app_push_secret');
   select id, public from storage.buckets where id = 'app-request-photos';
   ```

Depois: `EXPO_PUBLIC_APP_API_URL` do ambiente `production` no EAS apontando para a produção (passo 5 do caminho).
