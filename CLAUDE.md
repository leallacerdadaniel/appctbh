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
| 0 | O app demo de hoje | **Concluída** (05/11/2026): trabalho do Arthur na branch `redesign-explorer-guide` |
| 1 | Acessos e ambiente | Em andamento: app rodando no simulador; faltam os acessos ao Supabase e ao site |
| 2 a 4 | Banco único, login, painel | Não iniciadas; esperando o acesso ao Supabase e ao site |
| 5 a 9 | A casa no app | **Telas prontas em modo local (06/11/2026)**, sem caixas marcadas: leem e gravam em `src/store`, a trocar pelo Supabase na onda 2 |
| 10 a 18 | Viver BH, comunidade, lojas | Não iniciadas |

## Base local (`src/store`), até a onda 2

- `types.ts` tem o formato das futuras tabelas; `seed.ts` os dados de exemplo (fictícios, datas relativas a hoje);
  `index.ts` guarda no AsyncStorage (`ctbh.local-store`, suba `VERSION` se o formato mudar);
  `selectors.ts` faz as contas (fatura, saldos, rodízio); `actions.ts` é a única porta de escrita.
- Telas só usam `useStore(selector)` e as ações. Na onda 2 o corpo das ações vira chamada ao Supabase
  e o realtime chama `replaceState`; as telas não mudam.
- Regra de cobrança (decisão de 06/11/2026): extras acumulam e são faturados com o aluguel, a Chez Toi
  adianta. Um extra consumido no mês M entra no aluguel de M+1 (vencimento dia 5): confirmar com a Chez Toi.
- `simulateTeam` em `actions.ts` finge a equipe confirmando cada pedido em 4 s: tirar quando o painel existir.
- "Réinitialiser la démo" no Perfil volta a base ao estado inicial.
- Textos de cada função nova ficam em `src/i18n/features/<nome>.ts`, montados em `strings.ts`.
- Banco do site (DECISÃO-4 no plano): nunca escrever no banco do site sem aprovação; desenvolver na
  homologação; tabelas do app num schema `app` que só acrescenta.

## Armadilhas conhecidas (05/11/2026)

- Lovable conectado como CLRD GERAL (`clrdadvogados@gmail.com`), colaboradora em "Chez's Lovable".
  O projeto do site (`4ef88676-5d22-4389-87b6-f7662381c487`) responde
  `project_blocked_by_connection_access`: falta liberar a conexão do site para essa conta.
- O Supabase conectado (organização CLRD) não tem o banco da Chez Toi. A função `place-photo` roda no
  projeto `miucfiiporxhvvbefonh`, de dono ainda não confirmado.
- Nesta máquina o runtime iOS 27.0 não sobe e o `Simulator.app` não está no Xcode, então
  `expo start --ios` falha. Usar `npx expo start --localhost` e abrir `exp://localhost:8081` com
  `xcrun simctl openurl` num iPhone ligado (o Expo Go 58 já está instalado no iPhone 18 Pro).
- Todos os dados do morador ainda vêm de `src/lib/mock-data.ts`.
