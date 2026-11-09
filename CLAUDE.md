@AGENTS.md

# Chez Toi BH: app do morador

App Expo (SDK 58, Expo Router) para os estudantes que moram nos apartamentos da Chez Toi BH.
O painel da equipe mora no **site da Chez Toi** (projeto Lovable "Chez's Lovable"), e site e app
leem o mesmo banco Supabase. Conversa com o dono do projeto em português.

**O app é sempre bilíngue, francês e inglês** (pedido do dono, 08/11/2026: "não se esqueça disso").
Todo texto que o aluno vê vai em `src/i18n/strings.ts` nas duas línguas (o tipo `Strings` acusa a que faltar);
conteúdo que mora fora dele (guia, apps, frases, regras, avisos do painel, respostas da Charlotte) também
tem as duas versões. Nada de texto fixo numa língua só na tela. Exceções de propósito: o português para
mostrar ao motorista ou à portaria e os nomes de marcas.

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
| 6 | Pedidos e extras | **Pronta no desenvolvimento (08/11/2026)**: branch `onda-6-pedidos`, função `app-requests` e tabelas `app_requests*` só no `appctbh` |
| 5, 7, 9 (parte) | Pix, tarefas da casa, sino de avisos | **Prontos no desenvolvimento (08/11/2026)**: função `app-house`, tabelas `app_chores*`, `app_notices*`, `app_payment_info`, `app_devices` |
| 16 | Assistente de IA | **Pronto no desenvolvimento (08/11/2026)**: função `app-assistant` (Claude Opus 5.5, esforço baixo); falta o segredo `ANTHROPIC_API_KEY` no `appctbh` |
| Visual v3 | Navegação e cara nova (Airbnb + Revolut) | **Pronta no desenvolvimento (08/11/2026)**: abas Accueil · Explorer · Assistente no centro · Maison · Séjour; desenho em https://claude.ai/artifact/F8BRwXetJgskUp4xuh6nLj |
| 4 (parte) | Painel: preços dos extras | Branch local `app/catalogo-extras` no repositório do site, sem push e sem teste no navegador |
| 4, 9, 10, 12 a 18 | Painel, avisos, chegada, emergência, línguas, comunidade, lojas | Não iniciadas |

## Onde mora cada coisa (08/11/2026)

- **Código:** repositório `leallacerdadaniel/appctbh` (remoto `origin`); o do Arthur (`arthurhp14/ctbh-app`)
  ficou como remoto `arthur`, só referência. O Arthur parou de mexer no app em 07/11/2026.
- **Desenvolvimento:** projeto Supabase **`appctbh`** (`gxhvhacqemdwwebsftcd`, organização Chez Toi BH), com a
  estrutura das tabelas do site que o app lê, as tabelas `app_*`, a `app-api` e dados fictícios.
  SQL em `supabase/appctbh/` (001 estrutura do site, 002 tabelas e funções do app, 003 dados de teste,
  004 a 009 pedidos, assistente, casa e avisos, 010 aceite das regras da casa, 011 faxineira de cada
  apartamento: `app_cleaners` + `app_apartment_info.cleaner_id`; o telefone só sai com `share_phone`;
  012 visitas, encomendas e perfis: `app_visitors`, `app_packages` (gatilho → aviso no sino), `app_profiles`).
  Para marcar uma encomenda como chegada enquanto o painel não tem a tela: `update app_packages set status='arrived'`.
  013 agenda de BH: `app_bh_events` (robô `app-events-sync` todo dia 06:15, fontes em `docs/pesquisa/agenda-bh.md`),
  `app_bh_event_links` (links colados pela equipe: Sympla, 2LIV, Raro, Belotur); esconder evento com `hidden = true`.
  Link da Sympla Bileto (`bileto.sympla.com.br`) não traz dados no HTML: digitar `title`, `starts_at` e `venue` no link.
  Primeira curadoria (26 eventos da Sympla; a 2LIV não tinha nada à venda) em `docs/pesquisa/agenda-bh.md` 7.10.
  A conta de teste fica no `.env.local` (fora do Git).
- **Produção:** banco do site (`miucfiiporxhvvbefonh`), função `bright-service` (a `app-api` do Arthur) e
  tabelas `app_*`. **Nunca escrever no banco do site** sem aprovação do Daniel: lá só leitura do catálogo.
  Nunca escrever em `rental_tenants` nem `apartment_rentals` (gatilho refaz mensalidades e faxinas).
- O conector Supabase desta conta escreve nos dois projetos: conferir o `project_id` antes de cada
  `apply_migration`, `execute_sql` ou `deploy_edge_function`.
- O app fala só com a `app-api` (`src/lib/app-api.ts`), endereço em `EXPO_PUBLIC_APP_API_URL` no `.env.local`.
- Navegação v3 (aprovada em 08/11/2026, substitui a "por tarefa"): abas Accueil, Explorer, Maison e Séjour
  (`src/app/(tabs)/`), com o botão vermelho da Assistente no centro da barra (`src/components/tab-bar.tsx`,
  não é aba). A Agenda virou página (`src/app/calendar.tsx`). Abas têm o `TabHeader` (iniciais, pergunta à IA,
  sino) num canvas claro; telas empurradas mantêm a barra vermelha com o logo. SOS fica nos atalhos do Início.
  O Início da chegada (foto e 5 passos) aparece de 7 dias antes a 14 dias depois da chegada; para ver no
  simulador, abrir `exp://localhost:8081/--/?welcome=1`.
- Funções do app no `appctbh`: `app-api` (login e dados, com a correção da data de saída),
  `app-requests`, `app-house`, `app-assistant`. Todas usam o mesmo token; o app chega a elas por
  `houseApi`, `requestsApi`, `assistantApi` em `src/lib/app-api.ts`.
- Regras da casa obrigatórias (08/11/2026): `src/app/rules-intro.tsx` abre por cima das abas até o aluno
  assinar a versão atual (`RULES_VERSION` em `src/lib/rules-intro.ts`; mudou a regra, sobe a versão). O aceite
  vai para `app_rules_acceptances` pela `app-house` (`rules-status`, `rules-accept`).
- A assistente se chama **Charlotte** (rosto: a mascote de `src/components/charlotte.tsx`). Português no app:
  `src/app/portuguese/` (frases com áudio pelo `expo-speech`, lição, sequência de dias guardada no celular).
- Novidades de 09/11/2026 (desenvolvimento): tour do app com a Charlotte (`src/lib/tour.tsx`, abre uma vez depois
  das regras; refazer em Séjour › Aide), modo sem internet (cópia dos dados em `src/lib/home.tsx`, apagada ao sair),
  cartão para a família (Séjour › Aide), celular roubado (`src/app/phone-stolen/`, fontes em `src/lib/phone-stolen.ts`;
  o número 1058 da Vivo está a conferir), retrospectiva (`src/app/recap.tsx`, check-ins "J'y suis allé" no celular),
  visitas, encomendas e perfis (`src/app/house/`). O widget espera o build de desenvolvimento (onda 9).
- Recap mensal (09/11/2026): `src/app/recap/` (central, histórias, linha do tempo, "carte de BH"), dados só no celular
  (`src/lib/journal.ts`: pontos de localização arredondados, fotos do mês, português por mês). Localização só com
  opt-in; os nomes de cidade vêm do geocodificador da Apple/Google. Em segundo plano, só com o build da onda 9.
- Pesquisas para as próximas ondas: `docs/pesquisa/agenda-bh.md` (fontes de eventos) e `docs/pesquisa/saude-bh.md`
  (seção Saúde; só publicar o que a equipe confirmar).
- Base de conhecimento da IA: `node scripts/assistant/build.mjs` gera
  `supabase/functions/app-assistant/knowledge.ts`; rodar de novo e republicar quando regras ou guia mudarem.
- O site tem o banco de produção fixo no código (`src/integrations/supabase/client.ts`): rodar o site
  localmente mexe em produção.
- O trabalho em modo local de 06/11 (extras e pedidos, fatura com extras, lembretes, agenda, tarefas da casa)
  está na branch `arquivo/modo-local-0611`, para portar sobre a `app-api`, uma onda por vez.

## Armadilhas conhecidas (08/11/2026)

- O `Simulator.app` não está no Xcode desta máquina: `expo start --ios` falha. Usar
  `npx expo start --localhost` e abrir `exp://localhost:8081` com `xcrun simctl openurl` no iPhone 18 Pro.
- O servidor `supabase-cheztoi-leitura` (`.mcp.json`) lê o token de `SUPABASE_CHEZTOI_TOKEN`; o app do
  Claude não carrega o `~/.zshrc`, então a variável tem de ir por `launchctl setenv` (some ao reiniciar).
