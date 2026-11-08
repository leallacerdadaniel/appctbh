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

## Como o app fala com o banco (desde 27/10/2026, trabalho do Arthur)

- O app só fala com a Edge Function `app-api` (`supabase/functions/app-api`, publicada no projeto do
  site como `bright-service`); cliente em `src/lib/app-api.ts`. Login próprio em `app_students`.
- Rodar local: `.env.local` (fora do Git) com
  `EXPO_PUBLIC_APP_API_URL=https://miucfiiporxhvvbefonh.supabase.co/functions/v1/bright-service`.
- Tabelas do app: `app_*` no banco do site, migrações em `supabase/migrations` deste repositório.
  Nunca escrever em `rental_tenants` nem `apartment_rentals` (gatilho refaz mensalidades e faxinas).
- Tabela ou função nova passa antes pela homologação (DECISÃO-4 no plano).
- O trabalho em modo local de 06/11 (extras e pedidos, fatura com extras, lembretes, agenda, tarefas
  da casa, `src/store`) está no stash do GitHub Desktop (`git stash list`), para portar sobre a `app-api`.

## Armadilhas conhecidas (08/11/2026)

- O `Simulator.app` não está no Xcode desta máquina: `expo start --ios` falha. Usar
  `npx expo start --localhost` e abrir `exp://localhost:8081` com `xcrun simctl openurl` no iPhone 18 Pro.
- O servidor `supabase-cheztoi-leitura` (`.mcp.json`) lê o token de `SUPABASE_CHEZTOI_TOKEN`; o app do
  Claude não carrega o `~/.zshrc`, então a variável tem de ir por `launchctl setenv` (some ao reiniciar).
