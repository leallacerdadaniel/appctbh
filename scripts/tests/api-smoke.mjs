// Checagem de ponta a ponta da API de DESENVOLVIMENTO (appctbh). Uso: npm run test:api
//
// Só Node (18 ou mais), sem dependências. Lê o .env.local, entra com a conta de teste e confere:
//   1. o login funciona e a `home` responde 200;
//   2. token falso (lixo, assinatura trocada, conteúdo trocado, sem token) leva 401 em TODAS as funções;
//   3. um aluno não lê o pedido de outro nem mexe na despesa lançada por outro (e um id que não existe dá 404);
//   4. o primeiro acesso com um e-mail que não existe responde `noMatch`;
//   5. um post com link é recusado (`links`) e nada fica gravado.
// Uma linha por checagem; termina com código 1 se alguma falhar. Nunca imprime token, senha nem e-mail.
//
// Não deixa dados: só lê, e as três escritas que tenta têm de ser recusadas. Se uma delas passar (seria o
// defeito que o teste procura), o roteiro desfaz o que der e acusa. O que muda no banco: os contadores de
// login e de último acesso das contas de teste, e uma tentativa de primeiro acesso no limite por IP (30 por
// hora; o e-mail é sorteado a cada vez, então o limite de nenhum aluno é tocado).
// Nunca manda senha errada: se o login falhar, para na hora (10 erros por e-mail em 15 min bloqueiam a conta).
//
// Contas, no .env.local (fora do Git):
//   aluno de teste   TEST_STUDENT_EMAIL + TEST_STUDENT_PASSWORD, ou as linhas de comentário que já estão lá
//                    ("# e-mail: ..." e "# senha: ...");
//   segundo aluno    TEST_HUGO_PASSWORD (+ TEST_HUGO_EMAIL; sem ele, o e-mail fictício de 003_dados_de_teste.sql).
//                    Sem o segundo aluno, a checagem cruzada dos pedidos é pulada.
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const DEV_PROJECT = 'gxhvhacqemdwwebsftcd';
const SITE_PROJECT = 'miucfiiporxhvvbefonh';
const SECOND_STUDENT_SEED_EMAIL = 'hugo.teste@appctbh.test';

/* ---------- .env.local ---------- */

function readEnv() {
  let text;
  try {
    text = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
  } catch {
    stop('.env.local não encontrado na raiz do projeto.');
  }
  const env = {};
  for (const line of text.split('\n')) {
    const pair = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (pair) env[pair[1]] = pair[2].replace(/^(['"])(.*)\1$/, '$2');
    const note = /^\s*#\s*(e-mail|senha)\s*:\s*(\S+)\s*$/i.exec(line);
    if (note) env[note[1].toLowerCase() === 'senha' ? 'TEST_STUDENT_PASSWORD_NOTE' : 'TEST_STUDENT_EMAIL_NOTE'] ??= note[2];
  }
  return env;
}

function stop(message) {
  console.log(`PAROU   ${message}`);
  process.exit(1);
}

const env = readEnv();
const base = (env.EXPO_PUBLIC_APP_API_URL ?? '').replace(/\/$/, '');
if (!base) stop('EXPO_PUBLIC_APP_API_URL não está no .env.local.');
if (base.includes(SITE_PROJECT) || !base.includes(DEV_PROJECT)) {
  stop('EXPO_PUBLIC_APP_API_URL não aponta para o projeto de desenvolvimento (appctbh): este roteiro não roda em produção.');
}
const fn = (name) => base.replace(/\/[^/]*$/, `/${name}`);

const first = {
  email: env.TEST_STUDENT_EMAIL ?? env.TEST_STUDENT_EMAIL_NOTE,
  password: env.TEST_STUDENT_PASSWORD ?? env.TEST_STUDENT_PASSWORD_NOTE,
};
const second = { email: env.TEST_HUGO_EMAIL ?? SECOND_STUDENT_SEED_EMAIL, password: env.TEST_HUGO_PASSWORD };
if (!first.email || !first.password) stop('Conta de teste não encontrada no .env.local (TEST_STUDENT_EMAIL e TEST_STUDENT_PASSWORD).');

/* ---------- pedidos e resultado ---------- */

/** POST JSON; devolve só o status e o corpo (nunca lança: erro de rede vira status 0). */
async function post(url, { token, body } = {}) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(30_000),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } catch (e) {
    return { status: 0, data: { error: e?.name === 'TimeoutError' ? 'timeout' : 'network' } };
  }
}

/** "403 forbidden": o que dá para mostrar de uma resposta sem vazar nada dela. */
const seen = (r) => `${r.status || 'sem resposta'}${typeof r.data?.error === 'string' ? ` ${r.data.error}` : ''}`;
const is = (r, status, error) => r.status === status && (error === undefined || r.data?.error === error);

const totals = { ok: 0, failed: 0, skipped: 0 };
function report(passed, what, detail = '') {
  totals[passed ? 'ok' : 'failed'] += 1;
  console.log(`${passed ? 'ok     ' : 'FALHOU '} ${what}${detail ? ` (${detail})` : ''}`);
  return passed;
}
function skip(what, why) {
  totals.skipped += 1;
  console.log(`pulado  ${what} (${why})`);
}

/* ---------- 1. login e home ---------- */

async function signIn(account, label) {
  const r = await post(`${base}/login`, { body: { email: account.email, password: account.password } });
  const token = typeof r.data?.token === 'string' ? r.data.token : null;
  report(is(r, 200) && !!token, `login ${label}`, token ? '' : seen(r));
  return token;
}

const token = await signIn(first, 'do aluno de teste');
if (!token) stop('Sem login não há o que conferir. Confira a senha no .env.local antes de rodar de novo (erros de senha contam no limite).');

const home = await post(`${base}/home`, { token });
report(is(home, 200) && !!home.data?.student, 'home responde 200 com os dados do aluno', is(home, 200) ? '' : seen(home));

/* ---------- 2. token falso: 401 em todas as funções ---------- */

const [payload, signature] = token.split('.');
const b64url = (s) => Buffer.from(s).toString('base64url');
const flipped = (s) => s.slice(0, -2) + (s.at(-2) === 'A' ? 'B' : 'A') + s.at(-1);
const forged = {
  lixo: 'isto-nao-e.um-token',
  'assinatura trocada': `${payload}.${flipped(signature)}`,
  'outro aluno com a assinatura deste': `${b64url(JSON.stringify({ cp: randomUUID(), v: 1, exp: Date.now() + 86_400_000 }))}.${signature}`,
  'sem assinatura': `${payload}.`,
  'sem token': null,
};
/**
 * Uma rota de leitura de cada função. Antes, a mesma rota com o token verdadeiro: se ela não abrir, o 401 do
 * token falso não prova nada. Na assistente o controle manda uma conversa vazia, recusada com 400 (ou 503 sem a
 * chave da IA) depois de conferir o token e antes de gastar cota ou chamar a IA.
 */
const doors = [
  { name: 'app-api', route: 'home' },
  { name: 'app-house', route: 'notices' },
  { name: 'app-requests', route: 'list' },
  { name: 'app-assistant', route: 'ask', body: { messages: [], lang: 'fr' }, opens: [400, 503] },
  { name: 'app-community', route: 'status' },
  { name: 'app-feedback', route: 'feedback' },
  { name: 'app-events', route: 'list', body: { days: 7 } },
];
for (const { name, route, body = {}, opens = [200] } of doors) {
  const url = `${fn(name)}/${route}`;
  const real = await post(url, { token, body });
  const answers = await Promise.all(Object.entries(forged).map(async ([kind, fake]) => [kind, await post(url, { token: fake, body })]));
  const wrong = answers.filter(([, r]) => !is(r, 401, 'unauthorized')).map(([kind, r]) => `${kind}: ${seen(r)}`);
  if (!opens.includes(real.status)) wrong.unshift(`com o token verdadeiro: ${seen(real)}`);
  report(wrong.length === 0, `${name} abre com o token verdadeiro e recusa os ${answers.length} falsos com 401`, wrong.join('; '));
}

/* ---------- 3. o que é de outro aluno ---------- */

const secondToken = second.password ? await signIn(second, 'do segundo aluno de teste') : null;
const sessions = [token, secondToken].filter(Boolean);

// Pedidos: cada aluno só vê os seus. O id vem da lista do próprio dono; quem tenta ler é o colega.
const requestLists = await Promise.all(sessions.map((t) => post(`${fn('app-requests')}/list`, { token: t })));
const requestIds = requestLists.map((r) => (Array.isArray(r.data?.requests) ? r.data.requests.map((x) => x.id) : []));
const unknownRequest = await post(`${fn('app-requests')}/detail`, { token, body: { id: randomUUID() } });
report(is(unknownRequest, 404, 'notFound'), 'pedido que não existe: 404', is(unknownRequest, 404) ? '' : seen(unknownRequest));
if (sessions.length < 2) {
  skip('pedido de outro aluno é recusado', 'falta o segundo aluno: TEST_HUGO_PASSWORD no .env.local');
} else {
  const owner = requestIds[0].length ? 0 : requestIds[1].length ? 1 : -1;
  if (owner < 0) {
    skip('pedido de outro aluno é recusado', 'nenhuma das duas contas de teste tem pedido');
  } else {
    const id = requestIds[owner][0];
    const own = await post(`${fn('app-requests')}/detail`, { token: sessions[owner], body: { id } });
    const other = await post(`${fn('app-requests')}/detail`, { token: sessions[1 - owner], body: { id } });
    report(
      is(own, 200) && is(other, 404, 'notFound'),
      'pedido de outro aluno é recusado (o dono abre, o colega recebe 404)',
      is(own, 200) && is(other, 404) ? '' : `dono: ${seen(own)}; colega: ${seen(other)}`,
    );
  }
}

// Despesas: a casa toda vê, só quem lançou altera. A tentativa manda os mesmos valores que já estão lá:
// se a regra falhasse, a despesa continuaria igual.
let probed = false;
for (const t of sessions) {
  const ledger = await post(`${base}/expenses`, { token: t });
  const expenses = Array.isArray(ledger.data?.expenses) ? ledger.data.expenses : [];
  const theirs = expenses.find((e) => e.createdBy !== ledger.data.me);
  if (!theirs) continue;
  probed = true;
  const same = {
    description: theirs.description,
    amountCents: theirs.amountCents,
    currency: theirs.currency,
    paidBy: theirs.paidBy,
    spentOn: theirs.spentOn,
    splitMode: theirs.splitMode,
    shares: theirs.shares,
  };
  const edit = await post(`${base}/expense-save`, { token: t, body: { ...same, id: theirs.id } });
  const after = await post(`${base}/expenses`, { token: t });
  const still = (after.data?.expenses ?? []).find((e) => e.id === theirs.id);
  const untouched = JSON.stringify(still) === JSON.stringify(theirs);
  report(
    is(edit, 403, 'forbidden') && untouched,
    'despesa lançada por um colega não pode ser alterada (403) e continua igual',
    is(edit, 403) ? (untouched ? '' : 'a despesa mudou') : seen(edit),
  );
  const ghost = await post(`${base}/expense-save`, { token: t, body: { ...same, id: randomUUID() } });
  report(is(ghost, 404, 'notFound'), 'despesa que não existe: 404, nada é criado', is(ghost, 404) ? '' : seen(ghost));
  break;
}
if (!probed) skip('despesa lançada por um colega não pode ser alterada', 'nenhuma despesa de colega na casa das contas de teste');

/* ---------- 4. primeiro acesso com um e-mail que não existe ---------- */

const nobody = await post(`${base}/first-access-verify`, {
  body: { email: `ninguem-${randomUUID()}@example.invalid`, birthDate: '1999-01-01', passport: 'ZZ0000000' },
});
report(is(nobody, 400, 'noMatch'), 'primeiro acesso com e-mail que não existe responde noMatch', is(nobody, 400, 'noMatch') ? '' : seen(nobody));

/* ---------- 5. nenhum link no que o aluno escreve ---------- */

const mine = (r) => (Array.isArray(r.data?.posts) ? r.data.posts.filter((p) => p.author?.me).map((p) => p.id) : null);
const before = mine(await post(`${fn('app-community')}/feed`, { token, body: { scope: 'all' } }));
const linked = await post(`${fn('app-community')}/post-save`, {
  token,
  body: { scope: 'all', kind: 'post', body: 'TESTE api-smoke: promo sur https://example.com/gagnez' },
});
const after = mine(await post(`${fn('app-community')}/feed`, { token, body: { scope: 'all' } }));
const stored = before && after ? after.filter((id) => !before.includes(id)) : null;
if (typeof linked.data?.id === 'string') await post(`${fn('app-community')}/post-delete`, { token, body: { id: linked.data.id } });
if (is(linked, 403, 'terms') || is(linked, 403, 'suspended')) {
  report(false, 'post com link é recusado com "links"', `${seen(linked)}: a conta de teste precisa ter aceitado a carta da comunidade, senão a regra dos links nem é alcançada`);
} else {
  const refused = is(linked, 400, 'links');
  const clean = stored?.length === 0;
  report(
    refused && clean,
    'post com link é recusado com "links" e nada fica gravado',
    refused && clean ? '' : !refused ? seen(linked) : stored ? `${stored.length} post(s) novo(s) no mural` : 'não deu para ler o mural',
  );
}

/* ---------- resultado ---------- */

console.log(`${totals.ok + totals.failed} checagens: ${totals.ok} ok, ${totals.failed} com falha${totals.skipped ? `, ${totals.skipped} pulada(s)` : ''}`);
process.exit(totals.failed ? 1 : 0);
