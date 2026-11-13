# Caminho para a produção (levantado em 09/11/2026, 21h40)

Como juntar a V2 com a `main` (versão do Arthur) e ligar o app no banco real (`miucfiiporxhvvbefonh`) sem afetar o
site. A regra continua: **nada escrito no banco do site sem aprovação do Daniel**.

## Feito em 12/11/2026 (aprovação do Daniel)

- **Backup:** plano Pro com backup diário; foto "antes" do banco do site guardada (contagens, agendamentos, Vault,
  buckets, e a impressão digital das 80 tabelas, 51 funções e 192 políticas do site).
- **Homologação:** uma cópia do banco (branch do Supabase) com a estrutura do site recebeu
  `supabase/producao/001_app_do_aluno.sql` duas vezes (a segunda sem mudar nada) e ficou igual ao dev. Achado:
  `create extension pg_cron` regrava as permissões do esquema `cron`, por isso saiu do arquivo.
- **Produção, 18h08:** o arquivo foi carregado em 8 partes, conferido pelo md5 (`58daf0f3…`) e rodado numa
  transação só. Depois: as 2 senhas internas geradas no próprio banco (`002_segredos_internos.sql`, ninguém viu o
  valor) e as 10 funções publicadas (`app-admin` com o login da equipe; as outras com o token do app).
- **Conferido depois:** o site igual à foto "antes" (mesmas tabelas, funções e políticas, as 11 tabelas `app_*` que
  já existiam com as mesmas linhas); o app igual ao dev em colunas, funções, gatilhos, índices, restrições, políticas
  e permissões (única diferença: o padrão de `app_settings.excluded_rental_ids`, que na produção já excluía 2
  locações); `app-api`, `app-community` e `app-assistant` publicadas iguais ao repositório byte a byte; as 10 funções
  respondem (sem login: `unauthorized`; login de e-mail que não existe: `wrongCredentials`).

## Feito em 13/11/2026

- **Segredos das funções** na produção, postos pelo Daniel: `ANTHROPIC_API_KEY`, `RESEND_API_KEY` e `RESEND_FROM`. A
  chave do Resend que estava lá era de outra conta (do Arthur) e foi trocada pela da conta nova, que tem o domínio
  verificado. Ela vale também para os e-mails do site (`send-email`, `send-password-reset`,
  `send-confirmation-email`).
- **Painel na `main` do site:** a branch `app/painel-producao` (merge `db965fd0` da `app/painel-do-app` sobre a `main`
  de 12/11) foi testada localmente contra a produção: as 13 telas abriram sem erro, sem gravar nada. Depois veio o
  avanço direto da `main`, o push do Daniel e a publicação no Lovable (15h, bundle novo `index-HIBBS6dm.js`). Conferido
  no ar: a home e as páginas legais abrem sem erro no console, o `/admin` pede o login da equipe e o pedaço do admin
  (`AdminRoutes-CYlBEAEs.js`) traz as 13 telas do app. Com o login da equipe, as 13 telas e o dashboard do admin
  abriram no ar com os dados da produção (Acesso ao app: 1 ativo, 98 sem acesso), sem erro no console e sem gravar
  nada. Uma vez, abrir `/admin/app/avisos` direto voltou para a home: é uma corrida antiga do site (`useRoles` passa
  um instante sem papéis depois que o login carrega e o `AdminRoute` manda para `/`), não do painel; na segunda vez
  abriu normal. A diferença para a `main` anterior está só no menu do admin, nas rotas do admin e nos arquivos novos do painel.
- **App na `main`:** a `onda-6-pedidos` foi para a `main` do app pelo PR #1 (merge `a03f0d2`, 17h59), com a checagem
  do GitHub rodando no PR.
- **Falta:** a rotina de limpeza (item 4); o EAS de produção (item 6, passo 5); os primeiros alunos de teste pelo convite do painel (passo 6); desligar a `bright-service` quando ninguém
  mais a usar.

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
