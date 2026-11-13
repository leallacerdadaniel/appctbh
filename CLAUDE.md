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
| 1 | Acessos e ambiente | Quase: Lovable, Supabase (admin) e GitHub do site liberados; **banco do app e as 10 funções na produção desde 12/11/2026** (homologação numa cópia passou); **painel no ar no site e segredos das funções na produção desde 13/11/2026**; a `main` do app recebeu a `onda-6-pedidos` em 13/11/2026 (PR #1) |
| 2, 3, 5, 7, 8, 11 | Banco, login, apartamento, faxinas, contas da casa, lugares | **Em parte pelo Arthur (27/10 a 07/11)**: `app-api` + tabelas `app_*`; caixas marcadas no plano em 08/11 |
| 6 | Pedidos e extras | **Pronta no desenvolvimento (08/11/2026)**: branch `onda-6-pedidos`, função `app-requests` e tabelas `app_requests*` só no `appctbh` |
| 5, 7, 9 (parte) | Pix, tarefas da casa, sino de avisos | **Prontos no desenvolvimento (08/11/2026)**: função `app-house`, tabelas `app_chores*`, `app_notices*`, `app_payment_info`, `app_devices` |
| 16 | Assistente de IA | **Pronto no desenvolvimento (08/11/2026)**: função `app-assistant` (Claude Opus 5.5, esforço baixo); falta o segredo `ANTHROPIC_API_KEY` no `appctbh` |
| Visual v3 | Navegação e cara nova (Airbnb + Revolut) | **Pronta no desenvolvimento (08/11/2026)**: abas Accueil · Explorer · Assistente no centro · Maison · Séjour; desenho em https://claude.ai/artifact/F8BRwXetJgskUp4xuh6nLj |
| 3 (resto) | Convite, esqueci a senha, sessão segura, fim do acesso, excluir conta | **Pronto no desenvolvimento (09/11/2026)**: `app-api` v3 e `app-admin` no `appctbh` |
| 14 | Feedback, pesquisa de satisfação, indicação | **Pronto no desenvolvimento (09/11/2026)**: função `app-feedback` |
| 15 | Comunidade: mural, viagens em grupo, eventos, denúncia e bloqueio, IA moderando | **Pronto no desenvolvimento (09/11/2026)**: função `app-community`; falta `ANTHROPIC_API_KEY` |
| 4 (parte) | Painel: preços dos extras e 11 telas do "App do aluno" | **No ar no site desde 13/11/2026** (`main` do site no commit `db965fd0`, publicada pelo Lovable); as 13 telas conferidas no ar com o login da equipe, sem gravar nada |
| Revisões V2 | Segurança, design e tour, lojas | **Feito no desenvolvimento (09/11/2026, noite)**: 021 (limites atômicos, grants, exclusão numa transação), as 9 funções republicadas, tour refeito, ajustes de UX, `app.json`/`eas.json`, abertura animada; resumo em `docs/v2-app-chez-toi.html` |
| 9 (parte) | Push | **Servidor pronto no desenvolvimento (09/11/2026)**: 022 + função `app-push` + `src/lib/push.ts`; chega ao celular só com build nativo, chave APNs e Firebase (`docs/eas-setup.md`) |
| 4 (resto), 9 (resto), 10, 12, 13, 16 a 18 | Ficha do morador e do apartamento, lembretes, chegada, emergência, línguas, lojas | Não iniciadas ou em parte (lojas: falta conta Apple/Google, `eas init` e o primeiro build) |

## Onde mora cada coisa (08/11/2026)

- **Código:** repositório `leallacerdadaniel/appctbh` (remoto `origin`); o do Arthur (`arthurhp14/ctbh-app`)
  ficou como remoto `arthur`, só referência. O Arthur parou de mexer no app em 07/11/2026.
  Desde 13/11/2026 a `main` tem todo o trabalho da `onda-6-pedidos` (PR #1, merge `a03f0d2`, feito pelo Daniel no GitHub).
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
  014 acesso e conta (`app_password_resets`, `app_account_deletions`, `app_access_until`: saída + 30 dias),
  015 comunidade (mural, comentários, `app_trips`, eventos da Chez Toi com presença, denúncia, bloqueio, suspensão,
  carta aceita, histórico de moderação; a equipe decide por `app_team_moderate` e `app_team_suspend`),
  016 feedback, pesquisa de satisfação e indicação (`app_feedback`, `app_surveys`, `app_referral_*`),
  017 políticas da equipe para o painel (pedidos, fotos dos chamados, faxineira, leituras dos avisos),
  018 dados fictícios da comunidade (posts de Hugo e Chloé, viagem a Ouro Preto, apéro de boas-vindas).
  020 primeiro acesso ligado à ficha do site (`app_first_access_attempts`, `app_profile_corrections`,
  `app_students.activated_at`; passaporte e dados fictícios para Hugo e Chloé testarem).
  019 nenhum link no que o aluno escreve (`app_has_link` + regras `*_no_links` em todas as tabelas de texto livre) e a
  conversa da viagem (`app_community_comments.trip_id`); a coluna do link do WhatsApp das viagens saiu (019b).
  021 segurança (09/11/2026): limites atômicos (`app_rate_take`, `app_reset_take_attempt`, `app_assistant_reserve`),
  `app_session_state` (fim do acesso em toda função), `app_account_delete` (tudo numa transação), `app_assistant_reports`,
  e **nenhum grant para anon** nas `app_*`; `authenticated` só tem o que os hooks do painel usam (tabela nova do app:
  revogar de anon na própria migration; tela nova do painel: dar o grant). Os hashes de senha e código não saem nem para a equipe.
  022 push: `app_devices.lang`, `app_notices.pushed_at`, gatilho em `app_notices` → função `app-push` (segredo no Vault).
  023 datas dos avisos por língua (`app_notice_when`: FR « 19/11 à 19h00 », EN « Nov 19, 7:00 PM »).
  024 a equipe marca como vista a resposta da Charlotte sinalizada (tela "Respostas da Charlotte" do painel).
  025 revisão independente do servidor (10/11/2026): contrato só `contract_type = 'tenant'`; locação `finished` vale
  até 30 dias depois do fim (antes o aluno perdia tudo no checkout); data de BH em `app_rental_for`; aparelhos de
  push desligados quando a sessão cai (`app_students_devices_off`); o aviso nunca falha por causa do push;
  `app_account_delete` mantém suspensão, bloqueios e log sobre o aluno e avisa os membros das viagens dele;
  `app_gourmet_book` (reserva atômica, por prédio); regra de links A–D (igual a `src/lib/no-links.ts`).
  A conta de teste fica no `.env.local` (fora do Git).
- **Produção:** banco do site (`miucfiiporxhvvbefonh`), função `bright-service` (a `app-api` do Arthur) e
  tabelas `app_*`. Desde 12/11/2026 (18h08, com aprovação do Daniel): as 53 tabelas `app_*` e funções do banco iguais
  ao dev (`supabase/producao/001_app_do_aluno.sql`, uma transação, sem dados de teste), `pg_net`, bucket
  `app-request-photos`, agenda das 06:15, as duas senhas internas no Vault (`002_segredos_internos.sql`) e as 10
  funções do app publicadas com os mesmos nomes do dev. O site ficou igual (mesmas 80 tabelas, 51 funções e 192
  políticas, conferido por impressão digital antes e depois). A `bright-service` continua no ar, sem mudança.
  Em 13/11/2026 o Daniel pôs os segredos das funções (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`). A chave do
  Resend é de uma conta nova com o domínio verificado e vale também para os e-mails do próprio site (`send-email`,
  `send-password-reset`, `send-confirmation-email`, que usam `EMAIL_FROM`).
  **Nunca escrever no banco do site** sem aprovação do Daniel: lá só leitura do catálogo.
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
- Funções do app no `appctbh`: `app-api` (login e dados, com a correção da data de saída; desde 09/11 também
  "esqueci a senha", excluir a conta e o fim do acesso 30 dias depois da saída), `app-requests`, `app-house`,
  `app-assistant`, `app-community` (comunidade, com a IA moderando) e `app-feedback` (feedback, pesquisa,
  indicação). Todas usam o mesmo token; o app chega a elas por `houseApi`, `requestsApi`, `assistantApi`,
  `communityApi`, `feedbackApi` em `src/lib/app-api.ts`. A `app-admin` é do painel (JWT da equipe, papéis
  admin e equipe): lista alunos, convida (senha provisória mostrada uma vez), desliga e religa; nova senha para quem já
  tem senha só pelo papel admin. A `app-push` (sem JWT, segredo no cabeçalho) manda os avisos novos pela Expo Push API.
  Login com limite (10 erros por e-mail e 30 por IP em 15 min), sessão de 60 dias, `/app-api/logout` ao sair.
- Revisão independente de 10/11/2026 (3 revisores, 47 achados, todos corrigidos no dev): funções `app-api` v9,
  `app-house` v9, `app-requests` v6, `app-community` v7, `app-feedback` v6, `app-events` v6, `app-admin` v6,
  `app-assistant` v9. Contrato novo que o app segue: 500 `server` nunca tira da conta (só 401 = sessão recusada,
  `signOut('expired')` sem `/logout`); `change-password` pede `currentPassword` fora da troca obrigatória;
  `expenses` traz `former` (quem saiu) e `expense-save` responde `former`; `links` 400 em todo texto livre;
  `rules-accept` só aceita a versão do servidor (`RULES_VERSION`, mudar nos dois lados); report da Charlotte com
  `signature`. No app: toda chamada tem tempo-limite (`src/lib/app-api.ts`), estado por sessão
  (`src/lib/session-state.ts`), "hoje" de BH (`src/lib/bh-time.ts`), parâmetros de link (`src/lib/params.ts`).
- Testes: `npm test` (jest-expo, 135 testes, roda com o relógio em Paris e em BH) e `npm run test:api` (16 checagens
  de ponta a ponta no dev, só login certo do aluno de teste). O GitHub roda tipos, lint e testes a cada push
  (`.github/workflows/ci.yml`). Charlotte: `node scripts/assistant/build.mjs` regenera a base a partir dos textos do
  app e para se algo sumir; depois publicar `index.ts` e `knowledge.ts` juntos.
- Segredos que faltam no `appctbh` (o dev): para e-mail, `RESEND_API_KEY` + `RESEND_FROM` (a `ANTHROPIC_API_KEY` já
  está lá; na produção os três estão desde 13/11/2026). Sem e-mail, o "esqueci a senha" vira pedido na tela Acesso ao app do painel. Se a IA falhar ou faltar a chave, o que o
  aluno publica fica `pending` (fora do ar) até a equipe decidir. A Charlotte só relê respostas que ela assinou (`signature`).
- Primeiro acesso (09/11/2026, decisão do Daniel: nascimento + passaporte): `src/app/first-access.tsx` (3 passos:
  quem é você, seus dados da ficha, senha) e as rotas `first-access-verify` e `first-access-complete` da `app-api`.
  A ficha do site (`finance_counterparties`) só é lida; "Corriger" grava em `app_profile_corrections`, que aparece na
  tela Acesso ao app do painel. Só para conta sem senha: quem já tem senha recebe `hasAccount` e vai para o "esqueci a
  senha" (revisão de segurança, 09/11/2026). Telefone e contatos de emergência aparecem mascarados. Senha de teste do Hugo no
  `.env.local` (`TEST_HUGO_PASSWORD`). Login e primeiro acesso usam `src/components/auth-ui.tsx` (foto de BH,
  campos com ícone, botão com o gradiente).
- Login (09/11/2026): sessão no Keychain/Keystore (`expo-secure-store`, migra a de antes); `src/app/forgot-password.tsx`
  (fora do login) e `src/app/account-delete.tsx` (Perfil › Supprimer mon compte). Não sair da conta de teste no
  simulador: entrar de novo pede a senha do `.env.local`.
- Comunidade (09/11/2026, onda 15): `src/app/community/` (mural com Tout le monde / Mon appart, viagens em grupo,
  eventos, carta, denúncia, bloqueio), entradas em Maison (tile 🤝) e Explorer › Voyages ("Partir en groupe").
  A carta (`COMMUNITY_TERMS_VERSION` em `src/lib/community.ts` e na função) é pedida antes do primeiro post.
  Decisão do Daniel: a IA modera e a equipe participa; 3 denúncias escondem o conteúdo até a equipe decidir.
- **Nenhum link do aluno, em lugar nenhum** (Daniel, 09/11/2026: "se for malicioso nos complicamos"). Três barreiras:
  o cliente (`src/lib/no-links.ts`, checado em `call()` de `src/lib/app-api.ts` para todo corpo, menos a Charlotte e o
  `track`; erro `links` → `t.common.noLinks`), a `app-community` (erro `links`) e o banco (019). O Instagram do perfil
  continua só como nome de usuário. As viagens não têm mais grupo do WhatsApp: a conversa é dentro do app, só de quem vai.
- Transição em teste (09/11/2026): zoom nativo do iOS 18+ (`Link.AppleZoom`, Expo Router, alfa) dos cartões de destino
  em Explorer › Voyages (`src/components/explorer-content.tsx`) para `src/app/travel/[id].tsx` (`Link.AppleZoomTarget`).
  O filho do `Link asChild` precisa de estilo achatado (`StyleSheet.flatten`).
- Regras da casa obrigatórias (08/11/2026): `src/app/rules-intro.tsx` abre por cima das abas até o aluno
  assinar a versão atual (`RULES_VERSION` em `src/lib/rules-intro.ts`; mudou a regra, sobe a versão). O aceite
  vai para `app_rules_acceptances` pela `app-house` (`rules-status`, `rules-accept`).
- A assistente se chama **Charlotte** (rosto: a mascote de `src/components/charlotte.tsx`). Português no app:
  `src/app/portuguese/` (frases com áudio pelo `expo-speech`, lição, sequência de dias guardada no celular).
- Novidades de 09/11/2026 (desenvolvimento): tour do app com a Charlotte (`src/lib/tour.tsx`, abre uma vez depois
  das regras; refazer em Séjour › Aide), modo sem internet (cópia dos dados em `src/lib/home.tsx`, apagada ao sair),
  cartão para a família (Séjour › Aide), celular roubado (`src/app/phone-stolen/`, fontes em `src/lib/phone-stolen.ts`;
  o 1058 da Vivo foi conferido pelo Daniel em 09/11/2026), retrospectiva (`src/app/recap.tsx`, check-ins "J'y suis allé" no celular),
  visitas, encomendas e perfis (`src/app/house/`). O widget espera o build de desenvolvimento (onda 9).
- Recap mensal (09/11/2026): `src/app/recap/` (central, histórias, linha do tempo, "carte de BH"), dados só no celular
  (`src/lib/journal.ts`: pontos de localização arredondados, fotos do mês, português por mês). Localização só com
  opt-in; os nomes de cidade vêm do geocodificador da Apple/Google (decisão do Daniel em 09/11/2026: manter, avisando
  na tela de opt-in que a posição arredondada passa por esse serviço). Em segundo plano, só com o build da onda 9.
- Pesquisas para as próximas ondas: `docs/pesquisa/agenda-bh.md` (fontes de eventos) e `docs/pesquisa/saude-bh.md`
  (seção Saúde; só publicar o que a equipe confirmar). Seção Saúde pronta em 09/11/2026 (`src/app/health/`,
  `src/lib/health.ts`, entradas no SOS e em Explorer › Pratique) com as respostas da equipe na seção 9 da pesquisa;
  SUS para estrangeiros, seguro da SKEMA e vacinas ficam de fora a pedido da equipe. A Charlotte conhece a seção desde 10/11/2026.
- Mais bem avaliados do Google perto de casa (09/11/2026): `scripts/nearby.py` (`TOP_RATED`: restaurantes, bares e cafés a
  até 15 min a pé, nota ponderada pelo número de avaliações) grava em `app_apartment_places.nearby.topRated`; no app,
  `src/components/top-rated-near-home.tsx` na Explorer, com toque para o Google Maps. Some enquanto o apartamento não tem a lista.
  **Decisão do Daniel (09/11/2026): seguir sem a chave do Google**, com o "Autour de moi" levando ao Maps. A lista fica escondida
  (não há dados); o script continua no repositório caso a chave apareça (`python3 scripts/apartment_places.py --top-rated`).
  Sem a chave, apartamento novo também fica sem o "Perto de casa" (o mesmo script calcula os dois).
- Fora de casa, "Autour de moi" (`src/components/around-me.tsx`): botões que abrem o Google Maps buscando onde o aluno está
  (link do Maps, sem chave e sem custo). Busca ao vivo do Google dentro do app foi descartada pelo custo (09/11/2026:
  de US$ 70 a US$ 1.850 por mês para 100 alunos); se voltar, só no toque, com limite por aluno e alerta de gasto.
- Base de conhecimento da IA: `node scripts/assistant/build.mjs` gera
  `supabase/functions/app-assistant/knowledge.ts`; rodar de novo e republicar quando regras ou guia mudarem.
- O site tem o banco de produção fixo no código (`src/integrations/supabase/client.ts`): rodar o site
  localmente mexe em produção.
- Painel do app no site (**no ar desde 13/11/2026**): o grupo "App do aluno" no menu e 11 telas em
  `src/pages/admin/AdminApp*.tsx`, mais "Serviços extras do app"; hooks em `src/hooks/app-panel/` (cliente `appDb`
  tipado à parte: o `types.ts` do site é refeito pelo Lovable a partir de produção). Foi para a `main` do site pela
  branch `app/painel-producao` (merge `db965fd0` sobre a `main` de 12/11), com push do Daniel e publicação no Lovable.
  As tabelas e a `app-admin` já estão na produção; trocar `appDb` por `supabase` só quando o `types.ts` do site tiver
  as tabelas `app_*` (não é preciso para funcionar). Textos de um idioma só que o aluno lê: `team_note` dos pedidos e encomendas e a
  resposta do feedback (a equipe escreve na língua do aluno).
- Caminho para a produção (09/11/2026; passos 1 a 4 feitos em 12/11/2026, ver o topo do arquivo): `docs/caminho-producao.md`. Resumo: o código junta na `main` sem conflito; o
  banco é aditivo (9 de 11 tabelas `app_*` iguais, 2 com colunas novas, 43 novas), mas sem 001, dados de teste, a
  `user_roles` da 006 e o fim da 020; a produção não tem `pg_net`; a `bright-service` mudou em 08/11 22h32 fora do repo.
- O trabalho em modo local de 06/11 (extras e pedidos, fatura com extras, lembretes, agenda, tarefas da casa)
  está na branch `arquivo/modo-local-0611`, para portar sobre a `app-api`, uma onda por vez.
- Abertura do app (09/11/2026, ideia do Daniel: "o formato de MG, as letras saem de dentro dele, zoom no mapinha e abre
  a tela como um mapa"): `AppOpening` em `src/components/app-loader.tsx`, por cima de tudo no `_layout.tsx`. O splash
  nativo é o mapa branco de Minas (`assets/brand/minas-white.png`, 112 pt, `#B80A1C`) e a animação começa nesse quadro.
  O mapa é vetor (`src/components/minas-shape.ts`, gerado por `python3 scripts/brand/minas_shape.py` a partir do logo).
- Lojas (09/11/2026): `app.json` sem permissões que o app não usa, manifesto de privacidade, `eas.json` (development,
  preview, production) e o passo a passo em `docs/eas-setup.md` (`eas login`, `eas init`, variáveis no EAS, APNs,
  Firebase, TestFlight). Rascunhos de política e termos em PT/FR/EN em `docs/legal/` ("RASCUNHO para revisão jurídica").
  No site, páginas públicas `/app/privacidade` e `/app/excluir-conta` (`noindex`), texto final de 10/11/2026 (decisão do
  Daniel: canal `cheztoibh@gmail.com`, sem encarregado nomeado por ser agente de pequeno porte, guarda legal de 5 anos,
  12 meses depois do fim do acesso, 6 meses para dados de uso; revisão jurídica depois como atualização). Fonte única:
  `src/content/appLegal.ts` do site. Só as duas páginas foram para a `main` do site (branch `app/paginas-legais`), no ar desde 10/11/2026 18h37; o resto
  do painel foi para a `main` em 13/11/2026.
  A Charlotte pede ciência do uso da IA (Anthropic) antes da primeira pergunta e tem "Signaler cette réponse".
  Contas (09/11/2026): o site oficial é `housing.cheztoibh.com.br` (links de privacidade, exclusão e indicação apontam para lá).
  Apple: D-U-N-S obtido, inscrição como organização enviada pelo Apple ID da Chez Toi, em análise. Google Play: conta
  da organização CHEZ TOI BH criada na conta Google da Chez Toi (não na pessoal do Daniel); comerciante declarado e documento
  enviado (09/11/2026, em análise); falta a verificação dos telefones.
  Expo/EAS (09/11/2026): projeto `@chez-toi-bh/chez-toi-bh` (organização `chez-toi-bh`, logado como `cheztoibh`), ID no
  `app.json` (`extra.eas.projectId`), `expo-updates` com canais `development`/`preview`/`production`, variável
  `EXPO_PUBLIC_APP_API_URL` no EAS nos três ambientes (por enquanto o `appctbh`). Identificador do app decidido:
  `br.cheztoibh.app` (não muda depois do primeiro envio). Cuidado: `eas init` e `eas update:configure` reescrevem o
  `app.json` inteiro com a configuração calculada (duplicam o manifesto de privacidade); conferir o diff e manter só a
  mudança pretendida. O Metro precisa rodar fora do sandbox (terminal do usuário) para assinar o manifesto do Expo Go. O site foi verificado (09/11/2026): domínio `cheztoibh.com.br` no Search Console da conta Google da
  Chez Toi, por um TXT `google-site-verification` na raiz do DNS (HostGator, dns3/dns4). Não apagar esse TXT.
  O DNS também mostra o Resend já verificado no domínio (`resend._domainkey`, `send.`), usado pelo site.

## Armadilhas conhecidas (08/11/2026)

- O `Simulator.app` não está no Xcode desta máquina: `expo start --ios` falha. Usar
  `npx expo start --localhost` e abrir `exp://localhost:8081` com `xcrun simctl openurl` no iPhone 18 Pro.
- O servidor `supabase-cheztoi-leitura` (`.mcp.json`) lê o token de `SUPABASE_CHEZTOI_TOKEN`; o app do
  Claude não carrega o `~/.zshrc`, então a variável tem de ir por `launchctl setenv` (some ao reiniciar).
- O `node_modules` do site nesta máquina tem `@supabase/supabase-js` 2.119, mas o `bun.lock` e o `package-lock.json`
  do site (e o Lovable) usam 2.55.0. Com a 2.119 o admin quebra ("cannot add `postgres_changes` callbacks … after
  `subscribe()`", canal `admin-notifications-realtime` usado em dois lugares). Para testar o painel localmente, instalar
  a versão do lock (`npm install --no-save --no-package-lock @supabase/supabase-js@2.55.0`) numa cópia à parte
  (`git worktree add`), lembrando que o site local lê e escreve na produção.
- Abrir um endereço do admin do site direto (recarregando a página) às vezes volta para a home: corrida antiga em
  `src/hooks/useRoles.tsx` do site (um render sem papéis depois que o login carrega, e o `AdminRoute` manda para `/`).
  Não é do painel do app; tentar de novo abre.
