@AGENTS.md

# Chez Toi BH: app do morador

App Expo (SDK 58, Expo Router) para os estudantes que moram nos apartamentos da Chez Toi BH.
O painel da equipe mora no **site da Chez Toi** (projeto Lovable "Chez's Lovable"), e site e app
leem o mesmo banco Supabase. Conversa com o dono do projeto em português.

## O plano de ondas

O plano acordado está em [docs/ondas-app-chez-toi.html](docs/ondas-app-chez-toi.html), publicado como
artefato em https://claude.ai/artifact/LDoCU2oghUbvQDxeFmNv9D (as caixas marcadas lá ficam salvas no
próprio artefato).

1. **Mudou onda, muda o HTML.** Qualquer mudança de escopo, de item ou de estado de onda entra no HTML
   e o artefato é republicado no mesmo link.
2. **O carimbo `span#atualizado` muda junto**, com dia e hora de Brasília, antes de republicar.
3. **Não mudar a quantidade de itens** de uma onda que já tenha marcação. Os IDs são
   `w<onda>-<índice do array>`; tirar ou acrescentar item desloca as marcações. Para mudar escopo,
   reescreva o texto do item ou acrescente no fim.
4. Antes de republicar, ler a versão publicada (as marcações feitas no artefato não estão no arquivo
   local) e levar o bloco `<script id="estado">` dela para o arquivo.
5. Itens com `proposta` são ideias do Claude ainda não aprovadas pelo dono do projeto.

| Onda | O que é | Estado |
|---|---|---|
| 0 | O app demo | **Concluída** (05/11/2026) |
| 1 | Acessos e ambiente | Quase: Lovable, Supabase (admin) e GitHub do site liberados; falta a homologação e levar a branch para a `main` |
| 2, 3, 5, 7, 8, 11 | Banco, login, apartamento, faxinas, contas da casa, lugares | **Em parte pelo Arthur (27/10 a 07/11)**: `app-api` + tabelas `app_*`; caixas marcadas no plano em 08/11 |
| 4, 6, 9, 10, 12 a 18 | Painel, pedidos, avisos, chegada, emergência, línguas, comunidade, lojas | Não iniciadas |

## Onde mora cada coisa (08/11/2026)

- **Código:** repositório `leallacerdadaniel/appctbh` (remoto `origin`); o do Arthur (`arthurhp14/ctbh-app`)
  ficou como remoto `arthur`, só referência. O Arthur parou de mexer no app em 07/11/2026.
- **Desenvolvimento:** projeto Supabase **`appctbh`** (`gxhvhacqemdwwebsftcd`, organização Chez Toi BH), com a
  estrutura das tabelas do site que o app lê, as tabelas `app_*`, a `app-api` e dados fictícios.
  SQL em `supabase/appctbh/` (001 estrutura do site, 002 tabelas e funções do app, 003 dados de teste).
  A conta de teste fica no `.env.local` (fora do Git).
- **Produção:** banco do site (`miucfiiporxhvvbefonh`), função `bright-service` (a `app-api` do Arthur) e
  tabelas `app_*`. **Nunca escrever no banco do site** sem aprovação do Daniel: lá só leitura do catálogo.
  Nunca escrever em `rental_tenants` nem `apartment_rentals` (gatilho refaz mensalidades e faxinas).
- O conector Supabase desta conta escreve nos dois projetos: conferir o `project_id` antes de cada
  `apply_migration`, `execute_sql` ou `deploy_edge_function`.
- O app fala só com a `app-api` (`src/lib/app-api.ts`), endereço em `EXPO_PUBLIC_APP_API_URL` no `.env.local`.
- O trabalho em modo local de 06/11 (extras e pedidos, fatura com extras, lembretes, agenda, tarefas da casa)
  está na branch `arquivo/modo-local-0611`, para portar sobre a `app-api`, uma onda por vez.

## Armadilhas conhecidas (08/11/2026)

- O `Simulator.app` não está no Xcode desta máquina: `expo start --ios` falha. Usar
  `npx expo start --localhost` e abrir `exp://localhost:8081` com `xcrun simctl openurl` no iPhone 18 Pro.
- O servidor `supabase-cheztoi-leitura` (`.mcp.json`) lê o token de `SUPABASE_CHEZTOI_TOKEN`; o app do
  Claude não carrega o `~/.zshrc`, então a variável tem de ir por `launchctl setenv` (some ao reiniciar).
