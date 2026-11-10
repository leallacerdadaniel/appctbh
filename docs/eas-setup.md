# EAS: builds, TestFlight, Play e atualizações (09/11/2026)

Guia para o Daniel levar o app às lojas. Tudo aqui pede login nas contas da Chez Toi (Expo, Apple, Google).
Rodar na pasta do app, com `npx eas-cli@latest` (o projeto usa npm; não precisa instalar o EAS globalmente).

**Já feito em 09/11/2026:** login na Expo (conta `cheztoibh`, pelo navegador), `eas init` na organização
`chez-toi-bh` (projeto `@chez-toi-bh/chez-toi-bh`), `expo-updates` instalado e `eas update:configure`, variável
`EXPO_PUBLIC_APP_API_URL` nos três ambientes. Identificador do app: `br.cheztoibh.app`. Atenção: o `eas init` e o
`eas update:configure` reescrevem o `app.json` inteiro; conferir o diff antes de commitar. Falta: conta da Apple
aprovada (primeiro `eas build -p ios`), Firebase para o push no Android, primeiro build.

O que já está pronto no repositório: `eas.json` (perfis `development`, `preview`, `production`),
`app.json` (permissões enxutas, manifesto de privacidade do iOS, criptografia isenta, ícone adaptativo do Android,
`runtimeVersion` para o EAS Update, plugin de notificações) e o código de push (`src/lib/push.ts`,
função `app-push`, SQL `022_push.sql`).

## 0. Antes de começar

| Conta | Para quê | Custo |
|---|---|---|
| Expo (expo.dev), de preferência uma organização "cheztoibh" | builds, envio, push, atualizações | grátis para começar |
| Apple Developer Program, em nome da empresa (pede D-U-N-S) | TestFlight, App Store, chave de push (APNs) | US$ 99/ano |
| Google Play Console, em nome da empresa | teste interno, Play Store | US$ 25 uma vez |
| Firebase (console.firebase.google.com) | push no Android (FCM) | grátis |

**Decidir antes do primeiro build** (depois de publicado não muda): `ios.bundleIdentifier` e `android.package`
em `app.json` (hoje os dois são `br.cheztoibh.app`).

## 1. Login e projeto

```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # cria o projeto no expo.dev e grava extra.eas.projectId e owner no app.json
npx eas-cli@latest update:configure --environment preview   # grava updates.url no app.json
```

Fazer commit das mudanças do `app.json`. Sem o `projectId`, o app não consegue o token de push (o código só ignora).

## 2. Variáveis de ambiente (no EAS, não no `.env.local`)

O `.env.local` fica fora do Git e **não vai para os builds do EAS**. Cada perfil do `eas.json` lê o ambiente
de mesmo nome no expo.dev (`development`, `preview`, `production`). Variáveis `EXPO_PUBLIC_*` ficam dentro do app,
então são públicas por natureza: visibilidade `plaintext` (ou `sensitive`), nunca `secret`.

| Variável | Obrigatória | Valor |
|---|---|---|
| `EXPO_PUBLIC_APP_API_URL` | sim | endereço da `app-api`. Desenvolvimento/preview: `https://gxhvhacqemdwwebsftcd.supabase.co/functions/v1/app-api` (appctbh, dados fictícios). Produção: o endereço do projeto do site quando as funções do app estiverem lá (decisão do Daniel) |
| `EXPO_PUBLIC_REQUESTS_API_URL`, `EXPO_PUBLIC_HOUSE_API_URL`, `EXPO_PUBLIC_ASSISTANT_API_URL`, `EXPO_PUBLIC_EVENTS_API_URL`, `EXPO_PUBLIC_FEEDBACK_API_URL`, `EXPO_PUBLIC_COMMUNITY_API_URL` | não | só se alguma função não estiver ao lado da `app-api` (o app troca o último pedaço do endereço por `app-requests`, `app-house` etc.) |
| `EXPO_PUBLIC_PHOTO_ENDPOINT` | não | função `place-photo`; sem ela o app usa a do site |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | para fotos de lugares | chave pública (anon/publishable) do projeto da `place-photo` |

```bash
# uma vez por ambiente (em versões novas do eas-cli o mesmo comando se chama env:set, com as mesmas opções)
npx eas-cli@latest env:create --name EXPO_PUBLIC_APP_API_URL \
  --value https://gxhvhacqemdwwebsftcd.supabase.co/functions/v1/app-api \
  --environment preview --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_APP_API_URL --value <url> --environment development --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_APP_API_URL --value <url de produção> --environment production --visibility plaintext
npx eas-cli@latest env:list --environment preview    # conferir
```

## 3. Credenciais de push (sem elas o push não chega)

**iOS (APNs).** No primeiro `eas build -p ios`, aceitar quando o EAS oferecer criar a chave de push
("Push Notifications key") com o login da Apple. Ou depois: `npx eas-cli@latest credentials -p ios` → Push Notifications.
A chave (.p8) fica guardada no EAS; não colocar no repositório.

**Android (FCM V1).**
1. No Firebase, criar o projeto e um app Android com o pacote `br.cheztoibh.app`; baixar o `google-services.json`.
2. Pôr o arquivo no build: o mais simples é uma variável do EAS do tipo arquivo
   (`npx eas-cli@latest env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --visibility secret`,
   repetir para `preview`) e, no `app.json`, `"android": { "googleServicesFile": "./google-services.json" }`
   trocado por um `app.config.js` que lê `process.env.GOOGLE_SERVICES_JSON` (ou commitar o arquivo, que não é segredo forte).
3. Firebase → Configurações do projeto → Contas de serviço → gerar chave privada (JSON) e enviar ao EAS:
   `npx eas-cli@latest credentials -p android` → Google Service Account → "FCM V1".

Sem build nativo não há push: Expo Go no Android não recebe push desde o SDK 53, simulador também não.
O app simplesmente não pede a permissão nesses casos.

## 4. Builds

```bash
# Teste rápido por link (instalação direta, sem loja)
npx eas-cli@latest device:create                       # registrar os iPhones de teste (uma vez por aparelho)
npx eas-cli@latest build -p ios --profile preview
npx eas-cli@latest build -p android --profile preview  # gera um APK para instalar pelo link

# Build de loja (TestFlight e Play)
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest build -p android --profile production   # gera um AAB
```

O número do build sobe sozinho (`autoIncrement` + `appVersionSource: remote`). A versão que o usuário vê é
`version` no `app.json` (hoje 1.0.0).

**Development build** (para testar push e módulos nativos com recarga do código): antes, `npx expo install expo-dev-client`
e `npx eas-cli@latest build -p ios --profile development`. Com o `expo-dev-client` instalado, o `npx expo start`
passa a abrir o development build; para continuar no Expo Go, usar `npx expo start --go`.
(Ainda não instalado de propósito, para não mudar o fluxo do Expo Go de quem está testando agora.)

## 5. TestFlight (testadores internos)

Precisa da conta da Apple aprovada (em 10/11/2026 ainda "Your enrollment is being processed"). Com ela aprovada,
um comando faz o build e manda para o TestFlight (rodar no terminal: pede o login da Apple e o código de 2 fatores;
responder "sim" para criar certificado, perfil e chave de push):

```bash
npx eas-cli@latest build -p ios --profile production --auto-submit
```

Ou, com um build já pronto:

```bash
npx eas-cli@latest submit -p ios --latest
```

**Antes da Apple aprovar**, para mostrar no iPhone: Expo Go (App Store) no celular, Mac e celular no mesmo Wi-Fi,
`npx expo start --lan` no Mac e a câmera do iPhone no QR code do terminal. O app fala com o `appctbh` (dados fictícios);
push e widget não funcionam no Expo Go. O Mac precisa ficar ligado com o Metro rodando durante a demonstração.

Na primeira vez, o EAS pede o login da Apple e cria o app no App Store Connect (ou pergunta o `ascAppId`).
Depois, no App Store Connect → TestFlight → "Testes internos": criar o grupo e adicionar até 100 pessoas da equipe
(precisam ser usuários do App Store Connect). Para testadores de fora, "Testes externos" passa por uma revisão curta da Apple.

## 6. Google Play (teste interno)

1. Criar o app no Play Console (nome, idioma padrão, "app" gratuito).
2. **O primeiro AAB tem de ser enviado à mão** no Play Console (Testes → Teste interno → Criar versão).
3. Para os próximos: criar uma conta de serviço no Google Cloud com acesso ao Play Console, baixar a chave JSON e
   `npx eas-cli@latest submit -p android --latest` (o `eas.json` já manda para a faixa `internal` como rascunho).
4. Adicionar os e-mails dos testadores na faixa de teste interno e mandar o link de participação.

## 7. EAS Update (correções só de JavaScript)

```bash
npx eas-cli@latest update --channel preview --environment preview --message "Corrige X"
npx eas-cli@latest update --channel production --environment production --message "Corrige X"
```

Só chega a builds com a mesma `version` (política `appVersion`). Mudou algo nativo (plugin, permissão, pacote
com código nativo, ícone): subir `version` no `app.json` e fazer build novo.

## 8. Fichas das lojas (o que vão perguntar)

- **Política de privacidade**: `https://housing.cheztoibh.com.br/app/privacidade` (rascunho em `docs/legal/`, página no site na
  branch `app/painel-do-app`; publicar só depois da revisão jurídica e confirmar o domínio que serve a página).
- **Exclusão de conta** (Google Play): `https://housing.cheztoibh.com.br/app/excluir-conta`; no app: Profil › Supprimer mon compte.
- **Conta de demonstração** para a revisão da Apple e do Google: o app só abre com login. Criar um aluno de teste com
  estadia ativa no banco de produção (ou apontar o build de revisão para o appctbh) e informar e-mail e senha no
  formulário da loja.
- **Privacidade no App Store Connect** ("rótulos") e **Segurança dos dados** no Play: responder igual à política
  (e-mail, nome, fotos, conteúdo do usuário, dados de uso, identificadores do aparelho para push; sem rastreamento,
  sem publicidade; localização aproximada só no aparelho).
- **IA**: as respostas da Charlotte e a moderação usam o Claude (Anthropic); o app pede ciência antes do primeiro uso
  e tem "Signaler cette réponse".
- **Criptografia**: já declarada como isenta (`ITSAppUsesNonExemptEncryption = false`), o App Store Connect não pergunta.
- Se o App Store Connect mandar e-mail "ITMS-90683 Missing purpose string" para `NSLocationAlwaysAndWhenInUseUsageDescription`
  (o módulo de localização contém a API "sempre", mesmo sem usá-la), voltar o texto no `app.json` em `expo-location`
  (`locationAlwaysAndWhenInUsePermission`) com uma frase honesta: o app nunca pede "sempre".
