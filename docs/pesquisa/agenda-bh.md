# Agenda automática de eventos de BH: fontes e pipeline

Pesquisa feita em 08/11/2026. Cada fato traz a fonte e a data de consulta (todas 08/11/2026). "Não confirmado" = não consegui verificar em fonte oficial. As ferramentas de leitura devolvem resumos, então os dados abaixo devem ser reconferidos antes de codar.

## 1. Resumo

- **Não existe uma API oficial pronta de "agenda de BH".** A única fonte pública, gratuita e com licença clara é o portal de dados abertos da PBH, mas ele traz *eventos licenciados* (autorizações de uso do espaço público), não programação cultural com título, descrição e foto.
- A **agenda do Portal Belo Horizonte (Belotur)** é a melhor fonte de conteúdo (shows, feiras, grátis, exposições), mas é só página HTML, sem API, RSS ou iCal que eu tenha achado. Sem termos de uso publicados. Precisa de **autorização por escrito da Belotur**; o caminho legal é pedir uma parceria/feed.
- **Sympla, Eventbrite, Ingresse, Facebook/Instagram, Google: não oferecem listagem pública de eventos por cidade via API.** Só dão acesso aos eventos do próprio organizador. Eles só servem se o evento for cadastrado manualmente (com link de compra) ou se houver parceria.
- **Recomendação:** tabela `app_events` alimentada por 3 vias: (a) curadoria da equipe no painel do site (principal), (b) importação automática de poucas fontes permitidas (dados abertos PBH + ICS/feeds de parceiros que autorizarem), (c) entrada manual. Esforço estimado abaixo.

## 2. Fontes públicas e oficiais

### 2.1 Portal de dados abertos da PBH (CKAN)
- Roda em CKAN; base da API `https://dados.pbh.gov.br/api/3/action/` (`package_list`, `package_show`, `package_search`). Guia oficial: https://databh.pbh.gov.br/sites/default/files/pdf-documentos/guia.pdf (consultado 08/11/2026). Testei `package_search` em 08/11/2026 e respondeu `success: true`.
- Licença dos conjuntos vistos: **CC-BY** (uso livre, inclusive comercial, com atribuição "Prefeitura de Belo Horizonte"). Fonte: metadados do CKAN, ex.: https://dados.pbh.gov.br/api/3/action/package_show?id=d31004a4-cc35-4ad2-a325-fdc98c9cd24d (08/11/2026).
- Conjuntos úteis:
  - **Eventos Autorizados**: locais de eventos licenciados, atualização **mensal**, CSV (~1,5 MB), última publicação 01/09/2026; datastore ativo. Descrição: dados para planejamento urbano e fiscalização. Os nomes dos campos estão no dicionário em PDF (não li). Útil para saber *o que vai acontecer no espaço público* (blocos, feiras, corridas), mas defasado (mensal) e sem descrição/foto: **não confirmado** que traga nome do evento e data de forma utilizável.
  - **Equipamento Cultural** (centros culturais, teatros, museus da FMC), mensal, CSV: serve como lista de *locais* (para mapa e para ligar evento a local). https://ckan.pbh.gov.br/dataset/equipamento_cultural
  - **Pontos de Cultura** (mensal) e **Licenças de Eventos e Feiras Concedidas**: também CC-BY.
- Limites de uso da API, rate limit, autenticação: **não confirmado** (nada documentado no que li). O CKAN costuma permitir leitura anônima.

### 2.2 Portal Belo Horizonte / Belotur (agenda oficial de turismo e cultura)
- Listagem em https://www.portalbelohorizonte.com.br/eventos (também `/eventos/gratuito` e `/trade/calendario-anual-de-eventos`). Consultado 08/11/2026.
- Dados por cartão: título, categoria, data, horário, local (em metadado oculto), imagem com crédito, link do detalhe. Filtros: data, local, gratuito/pago, regional, categoria. Paginação `?page=N`. Sem JSON-LD de evento nem RSS/iCal visíveis no que li (**não confirmado**; conferir o código-fonte para `<link rel="alternate">`, e o `/sitemap.xml`).
- `robots.txt` é o padrão do Drupal e **não bloqueia** `/eventos`; sitemap em https://portalbelohorizonte.com.br/sitemap.xml (08/11/2026).
- Termos: rodapé "Copyright Belotur 2026. All Rights Reserved"; só há política de privacidade, **sem termos de uso nem licença de reutilização**. Ou seja, tecnicamente não é proibido ler, mas o conteúdo (texto e fotos) é protegido por direito autoral. Não é CC-BY. **Caminho seguro: escrever para belotur@pbh.gov.br / portal-bh@pbh.gov.br pedindo permissão ou um feed** (contato listado no próprio site).
- Observação de qualidade: a página que li mostrava datas "Hoje até" e fim em 2030, suspeito de dados cacheados/inconsistentes. Validar na hora de importar.

### 2.3 Fundação Municipal de Cultura / Prefeitura
- Notícias e programação em https://prefeitura.pbh.gov.br/estrutura-de-governo/fundacao-municipal-de-cultura/noticias. É texto de notícia (não estruturado). `robots.txt` do `prefeitura.pbh.gov.br` também é o padrão Drupal. Programação ocasional (Virada Cultural, aniversário de BH em dezembro).
- Uso recomendado: curadoria manual, não importação automática.

### 2.4 Circuito Liberdade, Mineirão, Arena MRV, BH Shopping, Palácio das Artes, Sesc
- **Não pesquisei a fundo / não confirmado** se algum publica API, RSS ou iCal. Esses sites costumam ter só página de agenda; a maioria vende pelo Sympla, Ticketmaster/Eventim, Ingresso.com etc. Ação sugerida: pedir ICS ou planilha direto à equipe de cada um (parceria), ou curadoria manual dos grandes eventos.

## 3. Plataformas de ingresso

| Plataforma | Dá para listar eventos públicos por cidade? | Observação / fonte (08/11/2026) |
|---|---|---|
| **Sympla** | **Não confirmado, provavelmente não.** A API pública (portal developers.sympla.com.br) exige token e é voltada ao produtor; não consegui ler a documentação (páginas só de navegação). Fontes de terceiros indicam `api.sympla.com.br/public/v3/events` com o token do produtor. | https://developers.sympla.com.br/api-doc/index.html. O `robots.txt` da Sympla é `Allow: /` (https://www.sympla.com.br/robots.txt), mas os termos de uso (https://termos-e-politicas.sympla.com.br/) não consegui ler (403): **não confirmado** se proíbem coleta automatizada. Há scrapers de terceiros (Apify): **não usar** sem permissão da Sympla. Opção legal: parceria/afiliados com a Sympla. |
| **Eventbrite** | **Não.** A busca pública de eventos foi desligada em 12/12/2019; a API só gerencia eventos da sua organização. | https://www.eventbrite.com/platform/api (oficial) |
| **Ingresse** | **Não confirmado.** Não achei documentação oficial pública de listagem; só scrapers de terceiros. | Pedir contato comercial/parceria. |
| **Eventim / Bilheteria Digital / Shotgun** | **Não confirmado.** Não pesquisei documentação oficial de cada um. | Provavelmente só parceria. |
| **Ticketmaster (Discovery API)** | Existe API pública gratuita com chave e a documentação diz ter cobertura global; **cobertura do Brasil não confirmada** (teste com `countryCode=BR`). A operação da Ticketmaster no Brasil é pequena. | https://developer.ticketmaster.com/products-and-docs/apis/getting-started/ |

## 4. O que não é possível
- **Facebook Events:** a Meta restringiu em 2018 a busca de eventos/páginas/grupos e exigiu App Review; não há listagem pública de eventos por cidade. Fonte: https://developers.facebook.com/blog/post/2018/04/04/facebook-api-platform-product-changes/ (consultado 08/11/2026; não achei mudança posterior, **status atual não confirmado**).
- **Instagram:** sem API pública para ler posts de terceiros; raspar viola os termos (não verifiquei o texto atual, **não confirmado**). Usar só como fonte de curadoria humana.
- **Google:** não achei uma API pública de eventos por cidade (busca 08/11/2026; **não confirmado oficialmente**). O que existe é Google Calendar: se um organizador publicar um **calendário público**, dá para ler o `.ics`. Serve para parceiros.
- **Sites "Guia BH"/agregadores privados:** conteúdo protegido, sem licença; só curadoria manual com link para a fonte.

## 5. Pipeline recomendado

```
 [Painel do site (equipe)] ──┐
 [Entrada manual no app/admin]──┼─> tabela app_events (Supabase appctbh)  ──> app-api (lista/filtra) ──> app (aba Agenda)
 [Edge Function agendada] ────┘      ▲
   - dados abertos PBH (CKAN, CC-BY)  |  deduplicação por (fonte, id_externo)
   - ICS/feeds de parceiros autorizados
```

1. **Curadoria no painel (principal).** O time cadastra os 10 a 30 eventos do mês mais relevantes para estudantes (festas, shows, jogos, feiras, festivais, eventos grátis), com link oficial de compra/informação. Qualidade alta, risco jurídico baixo (fatos: nome, data, local; foto própria ou da divulgação oficial com crédito).
2. **Função agendada (Supabase Edge Function + pg_cron, 1x/dia ou 1x/semana)** que lê: (a) CKAN da PBH (Equipamento Cultural para locais; Eventos Autorizados para blocos/feiras, se os campos permitirem), (b) ICS ou JSON de parceiros que autorizarem por escrito (Belotur, Sesc, casas de show, Mineirão/Arena MRV, clubes). Nunca raspar sem permissão.
3. **Entrada manual** por qualquer admin (corrige e cancela eventos).

### Campos mínimos de `app_events`
`id`, `titulo`, `descricao_curta`, `categoria` (show, festa, feira, cultura grátis, esporte, festival, outro), `inicio` (timestamptz), `fim`, `local_nome`, `endereco`, `lat`, `lng`, `bairro`, `gratuito` (bool), `preco_texto`, `link_oficial` (info/ingresso), `imagem_url`, `fonte` (curadoria | pbh_ckan | ics:parceiro | manual), `id_externo`, `atribuicao` (ex.: "Dados: Prefeitura de BH, CC-BY"), `status` (rascunho, publicado, cancelado), `destaque` (bool), `idiomas` opcionais (titulo_fr, titulo_en), `criado_em`, `atualizado_em`. Índice único em (`fonte`, `id_externo`). RLS: leitura pública só de `publicado`; escrita só por admin/função.

### Custo e esforço (estimativas minhas, não de fonte)
- Tabela + endpoint na `app-api` + tela de lista com filtros: ~2 a 3 dias.
- Formulário no painel do site (ou tela admin): ~1 a 2 dias.
- Edge Function de importação (CKAN + ICS genérico): ~2 dias por fonte nova, depois manutenção baixa.
- Custo em dinheiro: praticamente zero (Edge Functions e cron estão no plano Supabase; CKAN e ICS são gratuitos). A real despesa é o tempo de curadoria da equipe (~1 h/semana).

## 6. A confirmar pela equipe Chez Toi
1. Pedir à Belotur (belotur@pbh.gov.br) permissão/feed para usar a agenda em app.
2. Testar a Sympla e a Ticketmaster (`countryCode=BR`) com uma chave e ler o dicionário de dados de "Eventos Autorizados".
3. Decidir quem cura a agenda e com que frequência.

## 7. Fontes do pedido de 09/11/2026 (CCBB, Palácio das Artes, Raro, 2LIV, Sympla, Prefeitura)

Pedido do dono (09/11/2026): "puxa de algum site da prefeitura os principais eventos que tão rolando em BH [...] No CCBB, no Palácio das Artes, shows, festas etc. Site do 2liv, site da Raro, Sympla."
Tudo abaixo foi consultado em **09/11/2026** com o robô identificado como `ChezToiBH-Agenda/1.0 (+contact via chez toi bh)` (uma leitura por página).

Regra aplicada: o robô só lê sozinho o que o `robots.txt` **e** os termos permitem, prefere dado estruturado (API, sitemap, JSON-LD, OpenGraph) a raspar HTML, lê cada página no máximo uma vez por dia, mostra o nome da fonte e leva o aluno de volta para ela. Onde a leitura automática não cabe, vale a **curadoria por link**: a equipe cola o link de um evento e o robô lê só os metadados públicos daquela página (OpenGraph/JSON-LD: título, data, imagem, local), como faz o WhatsApp quando mostra a prévia de um link.

| Fonte | O que é | Leitura automática? | Como o robô lê |
|---|---|---|---|
| Dados abertos PBH (CKAN) | Portal oficial da prefeitura, licença CC-BY | **Sim** | API `package_show` + `datastore_search` do conjunto "Eventos Autorizados" |
| CCBB Belo Horizonte | Centro cultural do Banco do Brasil na Praça da Liberdade | **Sim, com cuidado** | Sitemap da programação de BH + metadados OpenGraph de cada evento |
| Palácio das Artes (Fundação Clóvis Salgado) | Fundação do governo de Minas | **Sim** (termos liberam reuso com crédito) | Agenda da página inicial (data estruturada AAAAMMDD) + API WordPress `evento` |
| Portal Belo Horizonte (Belotur) | Agenda oficial de turismo da prefeitura | **Não** (todos os direitos reservados, sem licença) | Só link para a agenda; curadoria por link; pedir autorização |
| Sympla | Plataforma de ingressos | **Não** (termos ilegíveis para robô, API só do produtor) | Curadoria por link (lê `og:*` e os dados do evento da página colada) |
| Raro Club | Casa noturna (Grupo Raro), datas secretas | **Não há o que ler** (o site não publica datas) | Curadoria por link (Instagram/ingresso) com data digitada pela equipe |
| 2LIV | Produtora de shows e festas em BH | **Não** (site é app JavaScript sem dado estruturado de evento) | Curadoria por link (página de ingresso) |

### 7.1 Dados abertos da PBH (CKAN), a parte "prefeitura" que pode ser lida
- Conjunto **Eventos Autorizados**: https://dados.pbh.gov.br/dataset/eventos-autorizados, licença "Creative Commons Atribuição" (metadados do CKAN, 09/11/2026). Atribuição exigida: "Prefeitura de Belo Horizonte".
- Campos (lidos pela API em 09/11/2026): `ID_EVENTO_LICENCIAMENTO`, `NOME_EVENTO`, `SITUACAO_LICENCA_PUBLICO`, `LOCALIDADE_EVENTO`, `BAIRRO`, `NOME_LOGRADOURO`, `DATA_HORA_INICIO_DT`, `DATA_HORA_FIM_DT`, `GEOMETRIA` (EPSG:31983). **Traz nome e data**, mas não traz foto, preço nem link.
- Arquivo mensal; o de 01/09/2026 tinha 8.361 linhas, 19 com data a partir de 09/11/2026, a maioria **corridas de rua** (Night Run, Volta da Pampulha...) e algumas festas no espaço público (Vila da Mineiridade na Savassi em 10/11, Virada da Liberdade em 31/12). Situações vistas: "Evento autorizado", "Consulta prévia reserva confirmada", "Requerimento em análise", "Vencida".
- `robots.txt` (https://dados.pbh.gov.br/robots.txt): bloqueia só `bingbot`, `sleepbot`, `/datastore/dump/` e `*/resource/*/view/`; a API (`/api/3/action/...`) está liberada. **Atenção:** o `datastore_search_sql` devolveu "Acesso Bloqueado" (firewall GoCache) em 09/11/2026; usar só `datastore_search`.
- O conjunto "Licenças de Eventos e Feiras Concedidas" traz o **nome da pessoa titular** e quase sempre sem data do evento: não usar (dado pessoal e inútil para a agenda).
- Decisão: o robô lê 2 endereços por dia (o `package_show` para achar o CSV do mês e um `datastore_search` com os 300 eventos de data mais recente) e guarda só eventos em espaço público (logradouro, parque, imóvel público), com situação "Evento autorizado" ou "Consulta prévia reserva confirmada", nos próximos 60 dias, **sem corridas e caminhadas** (são inscrição esportiva, não programação). Fonte mostrada: "Prefeitura de BH (dados abertos)". Sem link (o conjunto não tem página por evento).

### 7.2 CCBB Belo Horizonte
- Programação: https://ccbb.com.br/belo-horizonte/programacao/ (cada evento em `/belo-horizonte/programacao/<slug>/`).
- Dados estruturados: o site é WordPress, mas o tipo "programação" **não aparece** na API REST (`/wp-json/wp/v2/types` só lista posts e páginas). Há um **sitemap só da programação de BH**: https://ccbb.com.br/programacao-bh-sitemap.xml (13 endereços em 09/11/2026, com `lastmod`). Cada página de evento tem OpenGraph com título, imagem e uma descrição que começa com os fatos: "Artes Cênicas · Karamazovianas · 06/11/26 a 07/12/26 · Sexta a segunda, às 20h · Teatro I · R$30,00 (inteira) e R$15,00 (meia-entrada)". Não há JSON-LD `Event`.
- `robots.txt` (https://ccbb.com.br/robots.txt): `User-agent: *` com `Disallow:` vazio (tudo liberado) e o sitemap declarado.
- Termos: não achei termos de uso nem licença; rodapé "Todos os direitos reservados". Os ingressos são vendidos em `ingressosccbb.com.br`.
- Decisão: leitura automática **só do sitemap e dos metadados OpenGraph** (o que o próprio site publica para robôs e para prévia de link): título, datas, categoria, preço e imagem de divulgação, sempre com o nome "CCBB BH" e o link para a página do evento. Uma página só é lida de novo quando o `lastmod` do sitemap muda. Recomendo a equipe confirmar com o CCBB BH (pelo contato do site) que está de acordo; se pedirem, é só desligar a fonte na função.

### 7.3 Palácio das Artes / Fundação Clóvis Salgado (FCS)
- Programação: https://fcs.mg.gov.br/programacao/ (eventos em `/evento/<slug>/`). Ingressos pela Sympla Bileto (ex.: `bileto.sympla.com.br/event/128853`).
- Dados estruturados: a API WordPress publica o tipo **`evento`** (https://fcs.mg.gov.br/wp-json/wp/v2/evento, 444 eventos em 09/11/2026, com a taxonomia `categoria_evento`: música, concertos, teatro, dança, cinema, artes visuais, Cefart, outros). A data **não** vem na API, mas a agenda da página inicial (https://fcs.mg.gov.br/) mostra cada evento com a data em formato **AAAAMMDD** (campo `data-evento`), título, link e imagem do cartão: 20 eventos em 09/11/2026. O preço está na página do evento ("a partir de R$25"). Sem JSON-LD nem OpenGraph nas páginas de evento.
- `robots.txt` (https://fcs.mg.gov.br/robots.txt): bloqueia só `/wp-admin/`.
- Termos: página "Aspectos Legais e Responsabilidades" (https://fcs.mg.gov.br/aspectos-legais-e-responsabilidades/): o conteúdo pertence à FCS e **pode ser reutilizado desde que a fonte seja identificada e o crédito atribuído**; as marcas do Governo de Minas não podem ser reproduzidas sem autorização (não usamos logo).
- Decisão: leitura automática da página inicial (1 vez por dia), da API `evento` só para os eventos novos (o texto confirma horário e período quando bate com a data estruturada) e da página de cada evento novo uma única vez (preço). Local: "Palácio das Artes" (Centro), fonte "Palácio das Artes".

### 7.4 Portal Belo Horizonte (Belotur), a agenda oficial de turismo
- Programação: https://www.portalbelohorizonte.com.br/eventos. Em 09/11/2026: sem JSON-LD, sem RSS/iCal; o aviso de cookies cita "Termos de uso", mas não achei a página; rodapé "Copyright Belotur 2026. All Rights Reserved".
- `robots.txt`: padrão do Drupal, não bloqueia `/eventos`.
- Decisão (mantida da seção 2.2): **não ler automaticamente**. O app mostra um link "Agenda officielle de BH" para o portal e a equipe pode colar links de eventos do portal na curadoria. Pedir autorização ou um feed à Belotur (belotur@pbh.gov.br).

### 7.5 Sympla
- Agenda de BH: https://www.sympla.com.br/eventos/belo-horizonte-mg. `robots.txt` (https://www.sympla.com.br/robots.txt): `User-agent: * / Allow: /`.
- Termos: https://termos-e-politicas.sympla.com.br/ continua devolvendo **403** para leitura automática (09/11/2026), então não dá para confirmar se permitem coleta. A API pública (developers.sympla.com.br) só lista eventos do próprio produtor, com token.
- Página de evento: OpenGraph com título e imagem 1200×630; a data, o local e a categoria estão nos dados da própria página (`__NEXT_DATA__`: `startDateMultiFormat.ISO8601`, `eventsAddress.name`/`neighborhood`, `eventsCategory`). Exemplo lido: 37ª Feira Nacional de Artesanato, Expominas, 02 a 06/12/2026.
- Decisão: **sem leitura da listagem**. Curadoria por link: a equipe cola o link do evento no painel e o robô lê só aquela página (uma vez, e de novo no máximo uma vez por semana para pegar mudança de data).

### 7.6 Raro Club ("site da Raro")
- O que é: casa noturna de alto padrão do Grupo Raro (no app: `raro` em `src/lib/nightlife.ts`), https://www.raroclub.com.br/. Abre em datas escolhidas.
- O site **não publica datas**: o texto diz que a lista não é pública e que "ninguém será avisado"; o JSON-LD é só `NightClub`. As datas saem no Instagram (@raroclub.com.br).
- `robots.txt`: `User-agent: *` liberado, com `Content-Signal: search=yes, ai-train=no, use=reference` e bloqueio de robôs de IA (ClaudeBot, GPTBot etc.). Nosso uso é referência com link, sem IA.
- Decisão: nada para ler automaticamente. Quando a Raro anunciar uma noite, a equipe cola o link (Instagram ou ingresso) e **digita título e data** no painel; o robô não abre Instagram/Facebook (termos da Meta proíbem coleta automatizada).

### 7.7 2LIV
- O que é: **produtora de eventos e shows em BH** (pagode, sertanejo, festas: "Pagode do Conde", "Deixa de Charme", "Tudo Pode", "Churrasquinho Menos é Mais"; grupo exclusivo do show do Matuê). Site https://2liv.com.br, Instagram @2liv_oficial.
- O site é um app JavaScript (feito no Lovable): o HTML só tem título, descrição e JSON-LD `Organization`; os eventos aparecem depois, pelo JavaScript. Sitemap (https://2liv.com.br/sitemap.xml) só com páginas fixas e fotos de festas passadas. `robots.txt`: tudo liberado. Não achei termos de uso.
- Decisão: **não ler automaticamente** (só daria rodando o JavaScript ou chamando a API interna deles, que não é pública). Curadoria por link: a equipe cola a página de ingresso de cada festa (Sympla, Shotgun, Ingresse etc.); se a página não tiver data, a equipe digita.

### 7.8 O que a equipe precisa fazer
1. Colar no painel (tabela `app_bh_event_links`) os links das festas e shows que interessam aos alunos: Sympla, 2LIV, Raro (com data digitada), Belotur.
2. Esconder (`hidden = true`) o que não serve para estudante.
3. Escrever para a Belotur pedindo autorização ou feed da agenda e, por cortesia, avisar o CCBB BH de que o app mostra a programação com link para o site deles.
4. Reler esta seção a cada seis meses: termos e sites mudam.

### 7.9 Como ficou montado e a primeira leitura (09/11/2026, só no `appctbh`)
- Banco: `supabase/appctbh/013_agenda_bh.sql` (tabelas `app_bh_events`, `app_bh_event_links`, `app_bh_source_pages`, `app_bh_sync_runs`; função `app_bh_events_next(dias, categoria)`; `pg_cron` todo dia às 06:15 de BH; segredo no Vault).
- Robô: função `app-events-sync` (só aceita o cabeçalho `x-sync-secret`, que só o banco tem). Colar ou corrigir um link dispara a leitura daquele link na hora (gatilho + `pg_net`).
- App: função `app-events` (`/app-events/list`, token do app) → `src/lib/bh-events.ts` → `src/components/bh-events-ui.tsx` e a página `/events`.
- Primeira leitura (09/11/2026, 00h42 de BH, ~50 s, 38 páginas):

| Fonte | Páginas lidas | Eventos gravados | Nos próximos 30 dias | Observação |
|---|---|---|---|---|
| Dados abertos PBH | 2 | 3 | 2 | Vila da Mineiridade (Savassi, 10/11), Virada da Liberdade (31/12), "Circuito das Estações" (é corrida: a equipe pode esconder) |
| CCBB BH | 14 (sitemap + 13) | 4 | 4 | 7 já tinham acabado; 2 páginas antigas (2025) sem data no OpenGraph |
| Palácio das Artes | 22 (início + API + 20) | 20 | 19 | Duas obras aparecem duas vezes na fonte (uma por sessão): o app junta |
| Links da equipe | 1 | 1 | 1 | Exemplo real deixado no `appctbh`: 37ª Feira Nacional de Artesanato (Sympla, Expominas, 02 a 06/12) |

- Testes de curadoria: link da Sympla virou evento com data, local e categoria; link do Instagram com título e data digitados virou evento sem o robô abrir o Instagram; a página inicial da 2LIV ficou como `needs_info` (sem data). Os links de teste foram apagados.

### 7.10 Primeira curadoria: Sympla e 2LIV (09/11/2026, pedido do dono, só no `appctbh`)
- **2LIV: nada para colar.** O site mostra "Pagode do Condé em breve, data a definir"; a página de produtor deles na Sympla (https://www.sympla.com.br/produtor/2liv) está sem eventos à venda; o último foi o "2Liv: A Halloween Story" (26/09/2026, já passou). Quando anunciarem a próxima festa, colar o link do ingresso.
- **Sympla: 26 links colados** em `app_bh_event_links` (`added_by` = "Claude, a pedido do Daniel"), escolhidos à mão na agenda de BH da Sympla (https://www.sympla.com.br/eventos/belo-horizonte-mg) pensando em estudante: festas (Fiesta Argentina no The Mexican, One Direction, Halloween, Malt 90, Mister Rock 80s, samba e pagode, eletrônica), shows (Zé Ramalho, Vitor Kley, Baby do Brasil, Guilherme Arantes, Henry Freitas, jazz no Café com Letras), balé e passeios a pé pelo Centro. Ficaram de fora cursos, eventos infantis, de empresa, fora de BH e excursões de vários dias. Todos viraram evento (`status = ok`); o título foi digitado limpo (sem "| 20/11 - SEXTA 21H").
- **Sympla Bileto** (`bileto.sympla.com.br`, usada por teatros e casas grandes: Minascentro, Arena Hall, Palácio das Artes): a página é um app JavaScript e o HTML não traz nome, data, local nem foto. Para esses links a equipe digita título, data e local; o evento entra sem foto. Desde 09/11 o robô ignora o título genérico "Sympla - Ingressos para Eventos..." e marca o link como `needs_info` em vez de gravar esse título.
- Festa que termina de madrugada (22h às 5h) aparece no app com o dia e a hora de início, não como "sex. 13 – sáb. 14" (`lastDay` em `src/lib/bh-events.ts`).
- Por cortesia com a Sympla: colar só eventos escolhidos, não a agenda inteira; o robô relê cada link no máximo uma vez por semana.
- **Raro Club:** o site continua sem datas. A busca achou uma festa à venda na Sympla, "NONSTOP 1 ano convida: Departamento long set" (19/12/2026, 22h às 7h), colada com o horário do texto do produtor (a Sympla registra 20h). O Raro fica em **Nova Lima** (Vila da Serra, Rua Senador Milton Campos, 230), por isso a festa não aparece na agenda de BH da Sympla: para o Raro e outras casas de Nova Lima, procurar na agenda de Nova Lima da Sympla ou pelo nome da festa.
- **Nova Lima** (Vila da Serra, Jardim Canadá, Alphaville: Raro, Club 415, LayBack Park): a agenda de Nova Lima da Sympla só repete eventos de BH, então a lista veio do Vibe Index (https://www.vibeindex.com.br/events/nova-lima-mg), que aponta para a página da Sympla de cada festa. **9 links colados** em 09/11/2026: BOMA (1 ano do Club 415, com Mochakk, 21/11), Réveillon 415 com Artbat, Réveillon Viva La Vida, Réveillon Alive, Tangram BH (25/12), Balanço do Mumu (13/11), Chefinho Festival (12/12), Pagode do Big de Verão (15/11) e Pagode Solidário (20/12). Fora: sunset "high-end" de Alphaville, torneio de beach tennis, aniversário de loja de bicicleta. O horário que vale é o da Sympla (o Vibe Index mostra 3 h a mais).
