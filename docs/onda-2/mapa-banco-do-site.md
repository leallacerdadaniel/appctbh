# Mapa do banco do site para o app (onda 2)

Levantamento de 06/11/2026, **só leitura** do repositório do site
(`leallacerdadaniel/chez-toi-bh`, commit `1e92518b`, 301 migrações em `supabase/migrations`).
Nenhuma consulta foi feita ao banco `miucfiiporxhvvbefonh`. Os dados de `estudantes-import.csv`
não foram abertos.

## A descoberta que muda a onda 2

As migrações **não batem com o banco no ar**. O arquivo de tipos do site
(`src/integrations/supabase/types.ts`, gerado em 28/10/2026, commit `fec995d4`) mostra tabelas e
funções que nenhuma migração cria. **Segundo o Daniel (06/11/2026), foram criadas para a gestão
feita pelo site, não para o app**, direto no banco e por isso fora do Git. Para o app, contam como
tabelas do site: ler quando servir, nunca escrever. A consequência prática é que a homologação tem de
ser clonada do **esquema real do banco**, não das migrações do repositório:

- `app_students` (login: auth_user_id, password_hash, session_version, must_change_password, status)
- `app_apartment_info` (wifi_name, wifi_password, house_rules jsonb, trash_info, building_info, student_notes, unit_number)
- `app_cleaning_feedback`, `app_expenses`, `app_expense_shares`, `app_settlements`
- `app_events`, `app_settings` (janela de acesso), `app_rental_continuations`, `app_apartment_places`
- RPCs `app_login_lookup`, `app_home_for`, `app_rental_for`, `app_rentals_for`, `app_claim_birthday`

Algumas migrações também foram apagadas do Git (por exemplo a que criou `apartment_departures`).
Conferir as políticas e os gatilhos reais com `list_tables` no banco (pelo servidor só leitura) antes
de desenhar qualquer tabela nova.

## Onde cada coisa do app já mora

| No app | No banco do site |
|---|---|
| Morador | `finance_counterparties` (nome, e‑mail, telefone, passaporte, contatos de emergência) |
| Estadia | `apartment_rentals` (o "grupo": apartamento, início, fim, semestre, aluguel, dia da faxina) e `rental_tenants` (entrada, saída, aluguel individual, horário de chegada, voo) |
| Apartamento | `apartments` (público) via `apartment_rentals.apartment_id` |
| Wifi e regras | `app_apartment_info.wifi_name / wifi_password / house_rules` |
| Aluguel do mês | `student_payments` (month_year, amount, currency, status, paid_date). **Não tem vencimento.** |
| Caução | `security_deposits` + `security_deposit_deductions` |
| Extras cobrados | `student_payments` com `payment_type` preenchido (o caminho mais natural); `finance_charges` não tem ligação com aluno |
| Manutenção | `rental_incidents` (sem urgência nem linha do tempo) |
| Late checkout / early check‑in | não existe |
| Espaço gourmet | não existe |
| Inventário | `apartment_inventory` (só equipe lê) |
| Vistorias | `checkin_inspections`, `checkout_stages` (PDFs), `checkout_inspections` (vídeos, checklists) |
| Documentos | `student_onboarding` (passaporte, carta de aceite), bucket `student-documents`, `rental_contracts`, `insurance_policies` |
| Faxinas | `cleaning_records` (aluno já lê as do próprio grupo) |
| Avaliação de faxina | `cleaning_reviews` e `app_cleaning_feedback` (duplicado) |
| Feedback | `student_feedback` |
| Indicação | não existe |
| Avisos | não existe (`blog_posts` serve de dicas) |
| Colegas | `rental_tenants` do mesmo `rental_id` |
| Tarefas da casa | não existe |
| Contas da casa | `app_expenses`, `app_expense_shares`, `app_settlements` |
| Pix / conta da Chez Toi | não existe: o IBAN/SWIFT do Wise está fixo no código (`src/pages/student/StudentPayments.tsx:14`) |

## Login de aluno hoje: três caminhos

1. `student_panel_users` + função `student-panel-auth` (bcrypt, token próprio de 7 dias); a área do
   aluno do site (`/student`: painel, jornada, faxinas, contrato, pagamentos, documentos, check‑out,
   ocorrências, dicas, feedback, onboarding) lê tudo por funções com a chave de serviço.
2. Supabase Auth com papel `student` + `student_rentals`.
3. `app_students` (do backend `app_*`).

Escolher **um** antes de ligar o app. O mais sólido é o Supabase Auth (onda 3), reaproveitando o
fluxo de senha provisória que os três já têm.

## Cuidados para não quebrar o site

- **Nunca escrever em `rental_tenants` nem em `apartment_rentals` pelo app.** O gatilho
  `trg_sync_rental_dependents` refaz e apaga mensalidades pendentes, cauções, chegadas, saídas,
  faxinas e acompanhamento.
- Outros gatilhos: inserir em `finance_counterparties` cria `student_tracking`; inserir em
  `auth.users` cria `profiles`; mudanças em `user_roles` são auditadas.
- Várias tabelas que o aluno precisa só são lidas pela equipe (cauções, inventário, vistorias,
  seguro). O app lê por funções `SECURITY DEFINER` ou por edge functions, nunca abrindo a RLS delas.
- O painel faz `select('*')` em `student_payments`, `student_onboarding`, `apartments`,
  `rental_contracts`, `checkin_inspections`, `checkout_stages`, `student_feedback` e
  `finance_counterparties`: coluna nova nessas tabelas aparece no painel. Preferir tabelas novas no
  schema `app` ligadas por id.
- `cleaning_reviews.student_user_id` e `student_feedback.student_user_id` não têm chave estrangeira e
  a política compara com o id errado: não gravar mais nada nelas até corrigir.
- O `generate-ical` que existe é a agenda da **equipe**; o link de agenda do aluno é novo.

## Próximos passos

1. ~~Conectar o servidor `supabase-cheztoi-leitura` e conferir no banco real~~: feito em 06/11/2026,
   ver "Conferido no banco" abaixo.
2. ~~Perguntar sobre as tabelas `app_*`~~: respondido, são da gestão do site.
3. Montar a homologação a partir do esquema real (não das migrações), sem dados de alunos.
4. Ajustar `src/store/types.ts` para os nomes do banco onde a coisa já existe.

## Conferido no banco em 06/11/2026

Consultas feitas só pelo servidor `supabase-cheztoi-leitura` (projeto `miucfiiporxhvvbefonh`,
`read_only=true`): catálogo (`information_schema`, `pg_policies`, `pg_trigger`, `pg_proc`),
contagens com `count(*)` e `get_advisors`. Nenhum SELECT em nome, e‑mail, telefone ou passaporte.
Legenda: **✅ confirmado no banco** · **≠ diferente do mapa** · **➕ só no banco**.

### 1. Tabelas e linhas (contagem exata em 06/11/2026)

Schemas de usuário: `public` (91 tabelas + a visão `student_panel_users_safe`) e `private`
(`cron_secrets`, 1). **Não existe schema `app`** ainda. RLS ligada em todas as tabelas de `public`.

| Grupo | Tabelas (linhas) |
|---|---|
| Moradia | apartments 105 · apartment_rentals 72 (47 `active`) · rental_tenants 158 · apartment_arrivals 48 · apartment_departures 156 · apartment_inventory 151 · inventory_categories 9 · inventory_write_offs 11 · roommate_requests 18 · saved_apartments 535 · apartment_interests 264 · apartment_page_views 5851 |
| Aluno | finance_counterparties 251 · student_payments 818 · security_deposits 162 · security_deposit_deductions 20 · student_tracking 103 · student_birthdays 151 · student_onboarding 2 · student_feedback 0 · student_panel_users 8 · student_rentals 0 · rental_contracts 113 · rental_incidents 123 · insurance_policies 14 · checkin_inspections 22 · checkout_inspections 0 · checkout_stages 0 · cleaning_records 607 · cleaning_reviews 0 |
| `app_*` ➕ | app_students 19 · app_events 81 · app_apartment_info 2 · app_apartment_places 1 · app_rental_continuations 1 · app_settings 1 · app_cleaning_feedback 0 · app_expenses 0 · app_expense_shares 0 · app_settlements 0 · **app_searches 0** (não estava no mapa) |
| Finanças | finance_transactions 1243 · finance_owner_transfers 130 · finance_projections_ctbh 90 · finance_categories 51 · finance_charges 27 · finance_bank_accounts 2 · finance_bank_statements 3 · rental_monthly_transfers 64 · rental_transfer_deductions 11 · business_contracts 73 · business_view_entries 458 · business_view_semester_entries 2 · business_view_contract_meta 0 · cmoc_contracts 1 · tax_documents 2 |
| Equipe | admin_tasks 78 · admin_task_history 130 · admin_task_comments 9 · admin_task_subtasks 3 · admin_task_routines 1 · admin_events 52 · admin_notifications 62 · admin_role_audit 45 · user_roles 6 · profiles 411 · user_observations 118 · goal_actions 48 · goal_targets 3 · goal_entries 0 · processes 3 · process_steps 17 · meeting_minutes 3 · learnings 0 · marketing_posts 6 · calendar_subscription_tokens 1 · error_logs 322 |
| Site público | blog_posts 5 · blog_post_likes 5 · blog_post_comments 0 · blog_event_registrations 0 · testimonials 17 · video_testimonials 12 · contact_forms 6 · sport_events 1 · sport_event_participants 2 · birthday_message_templates 1 · analytics_events 15137 · analytics_sessions 13689 · analytics_settings 1 |

Outros: 3 jobs no `cron` (`reset-monthly-rent-payments` dia 3, `cleanup-analytics-events` dia 1,
`check-birthdays-daily`); o realtime publica só `admin_notifications`.

### 2. Tabelas que o app vai usar

**Colunas.** ✅ Todas as colunas citadas no mapa existem com esses nomes. Detalhes que o mapa não
tinha:

- `app_students`: counterparty_id (PK, FK `finance_counterparties` cascade), auth_user_id (FK
  `auth.users`, set null), status, must_change_password, password_hash, session_version,
  last_login_at, last_seen_at, login_count, display_name, birthday_greeted_year, usage_excluded.
- `app_apartment_info`: PK `apartment_id` (FK apartments); wifi_name, wifi_password, unit_number,
  e quatro jsonb obrigatórios: trash_info, house_rules, building_info, student_notes.
- `app_apartment_places`: apartment_id, nearby jsonb, times jsonb, computed_at.
- `app_expenses` (rental_id, description, amount_cents, currency, paid_by, spent_on, split_mode,
  created_by), `app_expense_shares` (expense_id, counterparty_id, amount_cents),
  `app_settlements` (rental_id, from_cp, to_cp, amount_cents, currency, paid_on, created_by):
  pessoas sempre por `finance_counterparties.id`; valores em **centavos inteiros**.
- `app_cleaning_feedback`: cleaning_id + counterparty_id + rental_id, rating, comment.
- `app_events`: counterparty_id, kind (`screen`/`action`), name, item, occurred_at. As 81 linhas
  são todas de 05/11/2026.
- `app_settings`: linha única (`id boolean`), access_start 2027‑01‑01, access_end 2027‑05‑31,
  excluded_rental_ids (2 grupos excluídos).
- `app_rental_continuations`: rental_id → continues_rental_id (troca de grupo no meio da estadia).
- `student_payments`: ✅ sem vencimento; tem `payment_type`, `description`, `currency`,
  `finance_transaction_id`.
- `rental_incidents`: ✅ sem urgência; tem `reported_by_student uuid` (sem FK) e `student_visible`.
- `rental_tenants`: tem também `arrival_confirmed_date`, `arrival_time`, `flight_number`.

**Chaves estrangeiras.** ✅ Tudo pendura em `apartment_rentals.id` (cascade) e
`finance_counterparties.id`. ✅ `cleaning_reviews.student_user_id` e
`student_feedback.student_user_id` **não têm FK**. `student_onboarding.student_user_id` aponta para
`student_panel_users` (não para `auth.users`).

**RLS real.**

- ≠ **As 11 `app_*` têm RLS ligada e nenhuma política**: só a chave de serviço lê ou grava. O
  acesso do aluno passa todo por uma edge function.
- ✅ Equipe: `is_staff()` (e `has_role(..., 'contador')`) em quase tudo.
- Aluno (Supabase Auth): lê `cleaning_records`, `student_payments` (de **todo o grupo**, não só
  as próprias), `rental_incidents` com `student_visible`, `rental_contracts`, `student_rentals`.
  Todas dependem de `get_student_rental_id()`, que lê `student_rentals`, e **`student_rentals` tem
  0 linhas**: hoje essas políticas não liberam nada para ninguém.
- ✅ `cleaning_reviews` e `student_feedback`: a política compara `student_rentals.id` com
  `student_user_id` (id errado), como o mapa dizia.
- `finance_counterparties`: aluno não lê; o formulário público pode inserir (`type='client'`).
- `student_panel_users`: só a equipe e o `service_role`.

**Gatilhos.**

- ✅ `apartment_rentals`: `trg_sync_rental_dependents`, `check_no_overlapping_rentals`,
  `check_and_inactivate_expired_rentals`, `auto_create_projected_ctbh`,
  `aa_validate_rental_contract_type`, `zz_commission_rental_arrival`, `zz_rebalance_on_rent_change`.
- ✅ `rental_tenants`: `trg_sync_rental_dependents_from_tenant` (insert, update e delete).
- ✅ `finance_counterparties` → `student_tracking`; `auth.users` → `handle_new_user`;
  `user_roles` → auditoria.
- ➕ `finance_transactions` → `sync_finance_transaction_downstream`; `student_birthdays` →
  `auto_link_birthday_counterparty`.
- Nenhum gatilho nas `app_*`.

### 3. Funções

| Função | Assinatura | SECURITY DEFINER | Quem executa |
|---|---|---|---|
| `app_login_lookup` ➕ | (p_email text) → table(counterparty_id, password_hash, status, must_change_password, session_version) | sim | só serviço |
| `app_home_for` ➕ | (p_cp uuid) → jsonb | sim | só serviço |
| `app_rental_for` ➕ | (p_cp uuid) → uuid. Grupo ativo dentro da janela de `app_settings`, fora dos excluídos | sim | só serviço |
| `app_rentals_for` ➕ | (p_cp uuid) → uuid[]. O grupo mais as continuações | sim | só serviço |
| `app_claim_birthday` ➕ | (p_cp uuid) → boolean | sim | só serviço |
| `get_student_rental_id` | (_user_id uuid) → uuid (lê `student_rentals`) | sim | anon e authenticated |
| `is_student`, `is_staff`, `has_role` | (_user_id[, _role]) → boolean | sim | anon e authenticated |
| `verify_student_password` | (p_email, p_password_hash) → uuid. Devolve o id de qualquer e‑mail cadastrado | sim | **anon** |

➕ **Edge function `app-api`** (slug `bright-service`, versão 12, atualizada em 05/11/2026, sem
verificação de JWT) **não está no Git do site**. É ela que usa as funções `app_*` com a chave de
serviço. Também só existem no banco: `place-photo`, `book-onboarding-meeting`,
`cancel-onboarding-meeting`, `get-onboarding-slots`. As 32 funções rodam com `verify_jwt=false`.

### 4. Diferenças entre o banco e o mapa

- ≠ O mapa listava 10 tabelas `app_*`; no banco são 11 (`app_searches` a mais).
- ➕ Nenhuma `app_*` nem `app_*()` aparece nas migrações do Git (confirmado com `grep`).
- ≠ As migrações não são as mesmas: 296 versões no banco e 301 arquivos no Git. Até 28/07/2026 os
  carimbos diferem por segundos (o Lovable regera o nome); de 29/07/2026 em diante coincidem. O Git
  tem cerca de 5 a mais, que nunca rodaram ou foram renomeadas. **Não dá para recriar o banco
  rodando as migrações.**
- ➕ No banco e fora do mapa: `private.cron_secrets`, `calendar_subscription_tokens`,
  `student_panel_users_safe`.
- ✅ `apartment_departures` existe (156 linhas). O Git só tem migrações que a alteram.
- ✅ Nada do mapa falta no banco.

### 5. Login de aluno: o que está em uso

| Caminho | Contagem | Uso real |
|---|---|---|
| `student_panel_users` + `student-panel-auth` | 8 contas, 4 já entraram alguma vez, **0 nos últimos 90 dias** (último login em 23/04/2026) | parado |
| Supabase Auth + `student_rentals` | `student_rentals` 0 linhas; **0 usuários com papel `student`** em `user_roles` | nunca usado |
| `app_students` + `app-api` | 19 linhas: 18 `no_access`, **1 `active`** com senha, último login em 05/11/2026; 0 com `auth_user_id` | em teste (1 conta) |

`auth.users` tem 411 contas (177 entraram em 90 dias): são leads e equipe do site. Os papéis em
`user_roles` são 3 admin, 1 contador, 1 equipe e 1 marketing.

### 6. Storage

20 buckets. Públicos: `apartment-images` (4118 objetos), `blog-images`, `testimonial-photos`,
`app-apartment-files` ➕ (1, limite de 5 MB) e **`student-documents` (11 objetos)**. Este último
guarda passaportes e cartas de aceite: as políticas restringem a listagem, mas com o bucket público
quem tiver a URL baixa o arquivo. Os outros 15 são privados (contratos, vistorias, seguros,
cadastro, extratos, vídeos).

### Advertências de segurança (`get_advisors`, 06/11/2026)

- **WARN 43 / 45: funções SECURITY DEFINER executáveis por `anon` / `authenticated`.** Entre elas
  algumas que **escrevem e não checam quem chama**: `generate_student_payments_for_tenant`,
  `recompute_pending_payments_for_rental`, `recompute_student_deposits_for_rental`,
  `sync_rental_dependents`, `sync_cleaning_records_for_rental`, `reset_monthly_rent_payments`,
  `auto_inactivate_expired_rentals`. Também `verify_student_password` (revela se o e‑mail existe).
  `get_all_users_with_roles` tem checagem de papel no corpo.
  ([0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
  [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable))
- **WARN 86 / 89: tabelas visíveis no esquema GraphQL** para anon e authenticated. A RLS ainda
  protege as linhas, mas os nomes e colunas ficam expostos.
  ([0026](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed))
- **INFO 11: RLS sem política** nas `app_*`. É de propósito: acesso só pelo serviço.
  ([0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy))
- Fora do advisor: o bucket `student-documents` é público e as 32 edge functions rodam sem verificar
  JWT.

Nada disso foi corrigido: o banco é do site e só pode mudar com aprovação.

### O que isso muda na onda 2

**Homologação.** Clonar com `pg_dump --schema-only` do banco real (schemas `public` e `private`,
mais os buckets e as edge functions baixadas, inclusive `app-api`), sem dados. As migrações do Git
não servem: faltam as `app_*` e as versões divergem. Para testar sem dados de alunos, semear dados
fictícios.

**Onde o app grava.** Já existe um "app" no banco: `app_students` + a edge function `app-api`
(fora do Git), em teste desde 05/11/2026 com uma conta. Antes de criar o schema `app`, perguntar
quem fez `app-api` e se ela é o backend deste app. Se for, as contas da casa (`app_expenses`,
`app_settlements`), a avaliação de faxina e o wifi já têm tabela, e o app só precisa falar com a
`app-api`. O que não existe (pedidos de extra, late checkout, espaço gourmet, tarefas, avisos,
indicação) entra no schema `app`, sempre por id (`apartment_rentals.id`,
`finance_counterparties.id`), nunca com coluna nova nas tabelas do site.

**Login.** Dos três caminhos, só `app_students` está vivo. `student_panel_users` está parado e o
Supabase Auth de aluno nunca foi usado (e as políticas de aluno dependem de uma tabela vazia). O
mais simples é **ficar com `app_students`** e preencher o `auth_user_id`, que já existe e aponta
para `auth.users`. Assim o app ganha o Supabase Auth na onda 3 sem jogar fora a conta, a janela de
acesso de `app_settings` e as funções `app_rental_for` / `app_rentals_for`. Pedir à Chez Toi, antes
de abrir a área do aluno, que torne privado o bucket `student-documents` e tire de `anon` as funções
que escrevem.

### De onde veio a `app-api` (conferido em 06/11/2026, só leitura)

- **Não foi criada pelo projeto Lovable do site.** O histórico do chat do Lovable de 19/10 a 05/11
  não cita `app-api` nem `app_*`, e a `app-api` foi criada em 27/10/2026. No Git do site, as
  `app_*` só aparecem no `types.ts` regenerado pelo Lovable em 28/10 (um dia depois): nenhuma tela
  do site as usa.
- **Foi publicada à mão no painel do Supabase.** O próprio código manda publicar por "Edge
  Functions → Deploy a new function → Via Editor"; o slug aleatório `bright-service` é o nome que
  o painel dá; o caminho `/tmp/user_fn_…` é o mesmo de `place-photo`, que está no repositório
  deste app (commits do Arthur). As funções que o Lovable publica têm o caminho
  `supabase/functions/<nome>/index.ts`.
- **É o backend de um app de aluno:** a chave da sessão começa com `ctbh-app-session`, com login
  próprio (PBKDF2, token HMAC de 120 dias, não usa `auth.users`). Rotas: login, home,
  change-password, contract, expenses / expense-save / expense-delete, settlement-save /
  settlement-delete, cleaning-feedback, handovers, handover-document, birthday, track, places.
  Os comentários citam um "admin" com aba "Uso" que grava no mesmo formato de senha; esse admin
  não está no site.
- Ela espera uma tabela `checkout_handovers` que ainda não existe; enquanto isso o check-out
  aparece como "ainda não feito".
- **Autoria:** tudo aponta para o Arthur (mesmo jeito de publicar que a `place-photo`, nome
  `ctbh-app`), mas o banco não grava quem publicou. Falta ele confirmar e mostrar onde estão o app e
  o admin que usam essa função, porque não estão na branch `redesign-explorer-guide`.

**Atualização 06/11/2026:** o Arthur confirmou que a `app-api` é dele (feita com o Claude Code) e
que a versão local dele está bem diferente da publicada que lemos acima. Ele vai commitar o app e o
admin no Git. Até lá, não tomar o código da `app-api` publicada como referência nem decidir entre
adotá-la ou seguir o plano original.
