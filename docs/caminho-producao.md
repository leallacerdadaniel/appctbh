# Caminho para a produção (levantado em 09/11/2026, 21h40)

Como juntar a V2 com a `main` (versão do Arthur) e ligar o app no banco real (`miucfiiporxhvvbefonh`) sem afetar o
site. Nada disto foi feito: é o roteiro. A regra continua: **nada escrito no banco do site sem aprovação do Daniel**.

## 1. Código do app: tranquilo

- A branch `onda-6-pedidos` contém tudo da `main` e da `origin/main` (0 commits só lá) e tudo da última versão do
  Arthur que temos (`arthur/redesign-explorer-guide`, 07/11/2026; 0 commits só lá). A junção na `main` é um avanço
  direto (fast-forward), sem conflito.
- Não deu para atualizar o remoto do Arthur (o GitHub pediu login). Antes de juntar, confirmar com ele se subiu algo
  depois de 07/11.
- A `origin/onda-6-pedidos` estava 8 commits atrás da local: o Daniel faz o push pelo GitHub Desktop.

## 2. Banco: aditivo, mas com roteiro

Comparação só de leitura (09/11/2026) das tabelas `app_*`:

| | Produção | Desenvolvimento |
|---|---|---|
| Tabelas `app_*` | 11 | 54 |
| Iguais nos dois | 9 | |
| Só colunas novas no dev | `app_apartment_info` (+`cleaner_id`), `app_students` (+`invited_at`, `invited_by`, `deleted_at`, `activated_at`) | |
| Só no dev | | 43 tabelas novas |

Nenhuma tabela do site muda de estrutura. O que **não** pode ir para a produção:

- `001_estrutura_do_site.sql` (cópia da estrutura do site para o dev).
- `003`, `005`, `009`, `018` (dados de teste) e o fim da `020` (passaportes fictícios em `finance_counterparties`).
- A parte da `006` que cria `user_roles` (no site ela já existe).
- Na `021`, o bloco de `has_role` só revoga do anônimo se nenhuma política do site depender disso (o bloco já confere
  e só avisa); conferir à mão antes.

Montar um arquivo único "produção" com o resto (002 e 004 a 022 sem as partes acima), revisado linha a linha.

## 3. Funções

- A produção tem a `bright-service` (a `app-api` do Arthur), **publicada pela última vez em 08/11/2026 às 22h32**, com
  código que não está no repositório. Não foi mexida por nós.
- Recomendação: publicar as nossas funções na produção com os nomes próprios (`app-api`, `app-house`, `app-requests`,
  `app-assistant`, `app-community`, `app-feedback`, `app-events`, `app-events-sync`, `app-push`, `app-admin`) e
  deixar a `bright-service` como está até ninguém mais usá-la. Antes, baixar o código dela e comparar com a nossa
  `app-api` (o Arthur pode ter corrigido algo que não temos).

## 4. Configuração da produção

- Ligar a extensão `pg_net` (hoje a produção tem `pg_cron`, `pgcrypto` e `supabase_vault`, mas não `pg_net`): o push
  e o robô da agenda dependem dela.
- Segredos das funções: `ANTHROPIC_API_KEY`, `RESEND_API_KEY` e `RESEND_FROM` (o domínio já está verificado no
  Resend, usado pelo site), `APP_MODERATION_MODEL` (opcional), `EXPO_ACCESS_TOKEN` (opcional).
- Vault: segredo do push (`app_push_secret`) e do robô da agenda; agendamento das 06:15 (013).
- Bucket privado das fotos dos chamados (`request-photos`).
- **Rotina de limpeza antes de abrir para os alunos.** A política publicada em 10/11/2026 promete: dados só do app
  apagados ou anonimizados em até 12 meses depois do fim do acesso, e dados de uso por 6 meses (depois só números
  agregados). Hoje nenhuma tarefa agendada faz isso: criar o `pg_cron` que cumpre esses prazos (ou mudar a política).

## 5. Painel do site

- Branch `app/painel-do-app`: trocar o cliente `appDb` pelo `supabase` do site e deixar o Lovable refazer o
  `types.ts` a partir da produção (depois das tabelas criadas).
- Testar com login da equipe numa homologação antes de publicar o site.

## 6. Ordem sugerida

1. Backup do banco do site.
2. Homologação: projeto clonado só na estrutura do site (sem dados de alunos), com o arquivo "produção" aplicado.
3. Testar app e painel na homologação.
4. Aplicar na produção (aprovação do Daniel), publicar as funções, configurar segredos e `pg_net`.
5. Trocar `EXPO_PUBLIC_APP_API_URL` do ambiente `production` no EAS para a produção e fazer o build das lojas.
6. Primeiros alunos de teste (convite pelo painel) antes de abrir para todos.
