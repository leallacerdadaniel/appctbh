// Supabase Edge Function "app-api": a única porta do app do estudante para o banco.
// Login PRÓPRIO do app (não usa o login do site / auth.users).
// Publicar pelo painel: Edge Functions → Deploy a new function → Via Editor, nome "app-api",
// colar este arquivo e DESLIGAR "Verify JWT" (o app usa o token próprio abaixo).
// Usa as variáveis que o Supabase já fornece: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Rotas (POST, JSON):
//   /app-api/login            { email, password }      → { token, mustChangePassword }
//   /app-api/home             (Authorization: Bearer)  → dados do aluno (app_home_for)
//   /app-api/change-password  { password, currentPassword? } → { token }
//       troca obrigatória (must_change_password, logo depois da senha provisória): o token basta;
//       troca por vontade própria: currentPassword é exigida ('wrongCredentials' 401; 10 erradas em 15 min → 'tooMany' 429)
//   /app-api/contract         (Authorization: Bearer)  → { url } link temporário do PDF (só o contrato 'tenant')
//   Despesas compartilhadas entre colegas (grupo = locação do aluno; valores em centavos de R$):
//   /app-api/expenses           → { me, members, former, expenses, settlements }
//       former: [{ id, name }] = quem aparece numa despesa, parte ou acerto e já não é inquilino ativo da locação
//   /app-api/expense-save       { id?, description, amountCents, currency, paidBy, spentOn, splitMode, shares }
//       editar uma despesa que envolve quem já saiu → 'former' (409); apagar continua valendo para quem lançou
//   /app-api/expense-delete     { id }            (só quem lançou)
//   /app-api/settlement-save    { from, to, amountCents, currency, paidOn }  (o aluno tem de ser um dos dois; o outro
//       pode ser um colega ativo ou alguém que já saiu da mesma locação)
//   currency: 'BRL' (padrão) ou 'EUR'; os saldos são por moeda, sem conversão.
//   /app-api/settlement-delete  { id }            (só quem lançou)
//   Avaliação das faxinas (uma por aluno, editável até 7 dias depois da faxina):
//   /app-api/cleaning-feedback  { cleaningId, rating (1–5), comment }
//   Check-in e check-out (entrega e devolução do apartamento, cadastradas no site):
//   /app-api/handovers           → { checkin, checkout } (data, quem recebeu/devolveu, se há PDF assinado)
//   /app-api/handover-document   { kind: 'checkin' | 'checkout' } → { url } link temporário do PDF assinado
//   Aniversário (a data de nascimento nunca sai do banco):
//   /app-api/birthday            → { show } true uma única vez por ano, no dia do aniversário
//   Uso do app (aba "Uso" do admin); as buscas são gravadas sem identificar o aluno:
//   /app-api/track               { events: [{ kind, name, item?, at }], searches?: [{ query, results, at }] }
//   Conta (014_acesso_e_conta.sql, 09/11/2026):
//   /app-api/password-reset-request  { email, lang }  → { ok, channel: 'email' | 'team' }  (mesma resposta exista ou não a conta;
//       a resposta sai antes de o banco e o e-mail trabalharem; por conta 3 por hora e 5 por dia; por IP 20 por hora → 'tooMany' 429)
//   /app-api/password-reset-confirm  { email, code, password } → { token }  (código de 6 dígitos por e-mail, 15 min, 5 tentativas;
//       por IP 20 erradas por hora → 'tooMany' 429; quando um código confere, os outros códigos abertos da conta deixam de valer)
//   /app-api/account-delete          { password, reason? }     → { ok }  (apaga o que é só do app; contrato e financeiro ficam;
//       primeiro as fotos dos chamados saem do bucket, depois app_account_delete numa transação; senha errada
//       'wrongCredentials' 403, 10 erradas em 15 min → 'tooMany' 429; chamada de novo depois de apagar responde { ok })
//   O acesso termina 30 dias depois da saída (app_access_until): login e home respondem 'accessEnded'.
//   Primeiro acesso ligado à ficha do site (020_primeiro_acesso.sql): o aluno prova quem é com a data de nascimento e
//   o número do passaporte da ficha (finance_counterparties) e escolhe a senha, sem a equipe gerar nada.
//   /app-api/first-access-verify   { email, birthDate: 'AAAA-MM-DD', passport } → { ticket, alreadyActive: false, profile }
//       erros: 'noMatch' (não confere, resposta igual exista ou não o e-mail), 'tooMany' (5 erradas por hora),
//       'incomplete' (ficha sem passaporte: o pedido vai para o painel), 'disabled' (desligado pela equipe),
//       'hasAccount' (409: a conta já tem senha; só depois de nascimento E passaporte conferirem; o app manda
//       para "esqueci a senha"). No perfil, telefone e contatos de emergência vêm mascarados ("+33 6 •• •• •• 78").
//   /app-api/first-access-complete { ticket, password, correction? } → { token }  (correction vai para a equipe;
//       'hasAccount' se a conta ganhou senha depois do bilhete)
//   /app-api/logout               (Authorization: Bearer)  → { ok }  derruba as sessões abertas (session_version + 1)
//   Revisão de segurança (09/11/2026, 021_seguranca.sql): sessão de SESSION_DAYS dias e recusada quando o acesso
//   terminou ('accessEnded' em qualquer rota); login com limite de erros por e-mail e por IP ('tooMany', 429);
//   contadores atômicos no banco (app_rate_take, app_reset_take_attempt); exclusão da conta numa transação só.
//   Revisão do servidor (10/11/2026, 025_revisao_do_servidor.sql): erro do banco ao conferir a sessão responde 'server'
//   (500), nunca 'unauthorized'; texto livre com link responde 'links' (400) em vez de bater na regra do banco.
//   E-mail: segredos RESEND_API_KEY e RESEND_FROM ("Chez Toi BH <app@cheztoibh.com.br>"). Sem eles, o pedido de
//   nova senha vai para a fila do painel (Acesso ao app) e a equipe manda uma senha provisória.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Validade dos tokens novos; os de 120 dias já emitidos continuam valendo até vencer (mesmo formato). */
const SESSION_DAYS = 60;
const enc = new TextEncoder();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- senha: PBKDF2-SHA256 (mesmo formato do admin: pbkdf2$iter$salt$hash) ----------
const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(await pbkdf2(password, salt, iterations))}`;
}

async function checkPassword(password: string, stored: string) {
  const [kind, iter, salt, hash] = stored.split('$');
  if (kind !== 'pbkdf2') return false;
  const given = hex(await pbkdf2(password, unhex(salt), Number(iter)));
  let diff = given.length ^ hash.length;
  for (let i = 0; i < Math.min(given.length, hash.length); i++) diff |= given.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

// ---------- sessão: token assinado (HMAC) com o aluno e a versão da sessão ----------
let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (!hmacKey) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-session:${SERVICE_KEY}`));
    hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return hmacKey;
}
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function makeToken(cp: string, version: number) {
  const payload = b64url(enc.encode(JSON.stringify({ cp, v: version, exp: Date.now() + SESSION_DAYS * 86_400_000 })));
  const sig = await crypto.subtle.sign('HMAC', await getHmacKey(), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/** O acesso terminou (saída + 30 dias): o Deno.serve responde 'accessEnded' (403) e o app sai da conta. */
class AccessEnded extends Error {}

/** O que o token diz (aluno e versão da sessão) quando a assinatura confere e ele não venceu. Não olha o banco. */
async function parseToken(req: Request) {
  const [payload, sig] = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const t = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof t?.cp !== 'string' || !Number.isInteger(t.v) || !(Date.now() <= t.exp)) return null;
    return { cp: t.cp as string, version: t.v as number };
  } catch {
    return null;
  }
}

/**
 * Devolve o aluno do token, ou null se o token for inválido, vencido, de senha antiga ou de conta desativada.
 * Acesso encerrado (app_access_until no passado, data de BH) lança AccessEnded (021: app_session_state).
 * As outras funções (app-requests, app-house, app-assistant...) têm uma cópia igual: mudou aqui, muda lá.
 */
async function readToken(req: Request) {
  const token = await parseToken(req);
  if (!token) return null;
  const { data, error } = await db.rpc('app_session_state', { p_cp: token.cp, p_version: token.version });
  // Erro do banco (reinício, cache do PostgREST recarregando depois de uma migração) não é sessão inválida:
  // lança, o Deno.serve responde 'server' (500) e o app tenta de novo. Só um 'invalid' de verdade vira 401.
  if (error) throw new Error(`app_session_state: ${error.message}`);
  if (data === 'ended') throw new AccessEnded();
  if (data === 'ok') return token;
  if (data === 'invalid') return null;
  throw new Error('app_session_state: resposta inesperada');
}

// ---------- limites (021: app_rate_take / app_rate_refund, atômicos no banco) ----------
/** IP de quem chama: o do Cloudflare quando vem, senão o primeiro do x-forwarded-for. */
function clientIp(req: Request) {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0];
  return ip.trim().toLowerCase() || 'unknown';
}
/** Chave de limite sem guardar o dado: hash com segredo do e-mail ou do IP. */
const limitKey = async (kind: string, value: string) =>
  `${kind}:${hex(await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-limit:${kind}:${SERVICE_KEY}:${value}`))).slice(0, 32)}`;

/** Reserva uma tentativa em cada chave; null quando alguma já chegou ao limite na janela. */
async function rateTake(bucket: string, keys: string[], limits: number[], windowSeconds: number) {
  const { data, error } = await db.rpc('app_rate_take', {
    p_bucket: bucket,
    p_keys: keys,
    p_limits: limits,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  return (data as number[] | null) ?? null;
}
/** Devolve tentativas reservadas que não foram erro (login certo, ficha que conferiu). */
async function rateRefund(ids: number[] | null) {
  if (ids?.length) await db.rpc('app_rate_refund', { p_ids: ids });
}

// ---------- nenhum link no que o aluno escreve ----------
// A MESMA regra em app_has_link (025_revisao_do_servidor.sql), nas funções app-community, app-house, app-requests,
// app-feedback e app-assistant e no app (src/lib/no-links.ts): mudou uma, mudam todas.
const LINK_RULES = [
  // A: esquema ou www.
  /(?:https?|ftp):\/\/|\bwww\.[a-z0-9-]/i,
  // B: qualquer domínio seguido de caminho (evil.ru/x, linktr.ee/abc)
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\/[^\s]/i,
  // C: endereço IP
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
  // D: domínio sem caminho, só com as terminações mais comuns. Diferencia maiúsculas de propósito: maiúscula depois
  // do ponto é frase nova ("Merci.De rien"), e de/me/to/be/us/es/it/co deixaram de valer como terminação.
  /\b[A-Za-z0-9-]{2,}\.(?:com|net|org|io|fr|br|eu|uk|pt|ru|cn|xyz|info|online|link|shop|store|site|app|ly|gg|ee|gy)(?![A-Za-z0-9À-ÿ-])/,
];
const hasLink = (...texts: unknown[]) =>
  texts.some((t) => typeof t === 'string' && LINK_RULES.some((rule) => rule.test(t)));
const noLinks = () => json({ error: 'links' }, 400);

// ---------- rotas ----------
/** Erros de login aceitos em LOGIN_WINDOW segundos: por e-mail e por IP (o IP é mais alto: Wi‑Fi da escola e da casa). */
const LOGIN_FAILS_PER_EMAIL = 10;
const LOGIN_FAILS_PER_IP = 30;
const LOGIN_WINDOW = 15 * 60;
/** Hash que nunca confere: e-mail sem conta também gasta um PBKDF2, para o tempo de resposta não dizer quem existe. */
const DUMMY_HASH = `pbkdf2$100000$${'5a'.repeat(16)}$${'0'.repeat(64)}`;

async function login(req: Request, body: { email?: string; password?: string }) {
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) return json({ error: 'wrongCredentials' }, 401);

  const attempt = await rateTake(
    'login',
    [await limitKey('email', email.toLowerCase()), await limitKey('ip', clientIp(req))],
    [LOGIN_FAILS_PER_EMAIL, LOGIN_FAILS_PER_IP],
    LOGIN_WINDOW,
  );
  if (!attempt) return json({ error: 'tooMany' }, 429);

  const { data: rows, error } = await db.rpc('app_login_lookup', { p_email: email });
  if (error) {
    await rateRefund(attempt);
    return json({ error: 'server' }, 500);
  }
  // e-mail repetido em dois cadastros: não adivinha qual é
  const account = rows?.length === 1 ? rows[0] : null;
  const passwordOk = await checkPassword(password, account?.password_hash || DUMMY_HASH);
  if (!account || account.status !== 'active' || !account.password_hash || !passwordOk) {
    return json({ error: 'wrongCredentials' }, 401);
  }
  // Senha certa: a tentativa não conta como erro.
  await rateRefund(attempt);
  if (accessEnded(await accessUntil(account.counterparty_id))) return json({ error: 'accessEnded' }, 403);

  const { data: acc } = await db
    .from('app_students')
    .select('login_count')
    .eq('counterparty_id', account.counterparty_id)
    .single();
  const now = new Date().toISOString();
  await db
    .from('app_students')
    .update({ last_login_at: now, last_seen_at: now, login_count: (acc?.login_count ?? 0) + 1, updated_at: now })
    .eq('counterparty_id', account.counterparty_id);

  return json({
    token: await makeToken(account.counterparty_id, account.session_version),
    mustChangePassword: account.must_change_password,
  });
}

async function home(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const until = await accessUntil(who.cp);
  if (accessEnded(until)) return json({ error: 'accessEnded' }, 403);
  const { data, error } = await db.rpc('app_home_for', { p_cp: who.cp });
  if (error) return json({ error: 'server' }, 500);
  await db.from('app_students').update({ last_seen_at: new Date().toISOString() }).eq('counterparty_id', who.cp);
  if (!data) return json({ error: 'noRental' }, 404);
  return json({ ...data, ...(await arrivalAndDeparture(who.cp)), accessUntil: until });
}

// ---------- acesso que termina sozinho e conta (todayBH: ver a avaliação das faxinas, mais abaixo) ----------

/** Último dia em que o aluno entra (saída + 30 dias), ou null quando não há locação ativa. */
async function accessUntil(cp: string): Promise<string | null> {
  const { data } = await db.rpc('app_access_until', { p_cp: cp });
  return typeof data === 'string' ? data : null;
}
const accessEnded = (until: string | null) => until !== null && until < todayBH();

const EMAIL_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('RESEND_FROM') ?? '';
const emailEnabled = () => !!EMAIL_KEY && !!EMAIL_FROM;

async function sendEmail(to: string, subject: string, text: string) {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${EMAIL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const RESET_MINUTES = 15;
const RESET_ATTEMPTS = 5;
/** Pedidos de nova senha por conta: por hora e por 24 h (3 códigos × 5 tentativas por hora, sem teto, era muito). */
const RESETS_PER_HOUR = 3;
const RESETS_PER_DAY = 5;
/** Por IP, por hora: pedidos de nova senha, e confirmações que não deram certo (quem testa e-mails ou códigos em série). */
const RESET_PER_IP = 20;

/** Trabalho que continua depois da resposta: o Edge Runtime mantém a função viva até a promessa terminar. */
function background(work: Promise<unknown>) {
  const safe = work.catch((e) => console.error('background', String(e).slice(0, 300)));
  // fora do Edge Runtime (teste local) não há EdgeRuntime e a promessa segue sozinha
  (globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(safe);
}

async function codeHash(id: string, code: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-reset:${SERVICE_KEY}:${id}:${code}`)));
}

function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function lookupActive(email: string) {
  const { data: rows } = await db.rpc('app_login_lookup', { p_email: email });
  const account = rows?.length === 1 ? rows[0] : null;
  return account && account.status === 'active' ? (account as { counterparty_id: string; session_version: number }) : null;
}

async function passwordResetRequest(req: Request, body: { email?: string; lang?: string }) {
  const email = String(body.email ?? '').trim();
  const lang = body.lang === 'en' ? 'en' : 'fr';
  if (!email.includes('@')) return json({ error: 'invalid' }, 400);
  // Por IP, antes de olhar a conta: o limite não depende de o e-mail existir.
  const ipTake = await rateTake('reset_request_ip', [await limitKey('ip', clientIp(req))], [RESET_PER_IP], 3600);
  if (!ipTake) return json({ error: 'tooMany' }, 429);
  const channel = emailEnabled() ? 'email' : 'team';
  // A resposta é a mesma exista ou não a conta, e sai ANTES de o banco e o e-mail trabalharem: nem o conteúdo nem o
  // tempo de resposta revelam quem tem acesso. O resto roda em segundo plano (EdgeRuntime.waitUntil).
  background(passwordResetWork(email, lang, channel));
  return json({ ok: true, channel });
}

/** O pedido de nova senha em si: limites por conta, o código por e-mail ou o pedido na fila do painel. */
async function passwordResetWork(email: string, lang: 'fr' | 'en', channel: 'email' | 'team') {
  const account = await lookupActive(email);
  if (!account) return;
  const cp = account.counterparty_id;
  // Atômico (021): dois pedidos ao mesmo tempo não passam juntos do limite. Por dia e por hora.
  const day = await rateTake('reset_request_day', [cp], [RESETS_PER_DAY], 86_400);
  if (!day) return;
  if (!(await rateTake('reset_request', [cp], [RESETS_PER_HOUR], 3600))) {
    await rateRefund(day);
    return;
  }

  const id = crypto.randomUUID();
  if (channel === 'email') {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const { error } = await db.from('app_password_resets').insert({
      id,
      counterparty_id: cp,
      channel,
      code_hash: await codeHash(id, code),
      expires_at: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(),
      lang,
    });
    if (error) {
      console.error('password reset', error.message);
      return;
    }
    await sendEmail(
      email,
      lang === 'en' ? `Chez Toi BH: your code ${code}` : `Chez Toi BH : votre code ${code}`,
      lang === 'en'
        ? `Your code to choose a new password in the Chez Toi BH app: ${code}\n\nIt is valid for ${RESET_MINUTES} minutes. If you did not ask for it, ignore this e-mail: your password does not change.`
        : `Votre code pour choisir un nouveau mot de passe dans l'app Chez Toi BH : ${code}\n\nIl est valable ${RESET_MINUTES} minutes. Si vous ne l'avez pas demandé, ignorez cet e-mail : votre mot de passe ne change pas.`,
    );
    return;
  }

  // Sem e-mail configurado: o pedido aparece no painel (Acesso ao app) e a equipe manda uma senha provisória.
  const { data: open } = await db
    .from('app_password_resets')
    .select('id')
    .eq('counterparty_id', cp)
    .eq('channel', 'team')
    .is('handled_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  if (!open?.length) {
    const { error } = await db.from('app_password_resets').insert({
      id,
      counterparty_id: cp,
      channel,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      lang,
    });
    if (error) console.error('password reset', error.message);
  }
}

async function passwordResetConfirm(req: Request, body: { email?: string; code?: string; password?: string }) {
  const email = String(body.email ?? '').trim();
  const code = String(body.code ?? '').replace(/\D/g, '');
  const password = String(body.password ?? '');
  if (password.length < 8) return json({ error: 'tooShort' }, 400);
  if (code.length !== 6) return json({ error: 'invalidCode' }, 400);
  // Por IP: a tentativa é reservada antes e devolvida quando o código confere; só as que não deram certo contam.
  const ipTake = await rateTake('reset_confirm_ip', [await limitKey('ip', clientIp(req))], [RESET_PER_IP], 3600);
  if (!ipTake) return json({ error: 'tooMany' }, 429);
  const account = await lookupActive(email);
  if (!account) return json({ error: 'invalidCode' }, 400);
  const cp = account.counterparty_id;

  const { data: reset } = await db
    .from('app_password_resets')
    .select('id, code_hash, attempts, expires_at, created_at')
    .eq('counterparty_id', cp)
    .eq('channel', 'email')
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // Conta sem código pedido no último dia responde como e-mail sem conta ('invalidCode'): a rota não diz quem existe.
  if (!reset || Date.parse(reset.created_at) < Date.now() - 86_400_000) return json({ error: 'invalidCode' }, 400);
  if (Date.parse(reset.expires_at) < Date.now() || reset.attempts >= RESET_ATTEMPTS) {
    return json({ error: 'expired' }, 400);
  }
  // A tentativa é gasta ANTES de comparar e no banco (021: app_reset_take_attempt): pedidos em paralelo não
  // ganham tentativas a mais.
  const { data: allowed, error: takeError } = await db.rpc('app_reset_take_attempt', { p_id: reset.id, p_max: RESET_ATTEMPTS });
  if (takeError) return json({ error: 'server' }, 500);
  if (!allowed) return json({ error: 'expired' }, 400);
  if (!sameText(await codeHash(reset.id, code), reset.code_hash)) return json({ error: 'invalidCode' }, 400);
  if (accessEnded(await accessUntil(cp))) return json({ error: 'accessEnded' }, 403);

  // O código vale uma vez só: quem marcar primeiro leva.
  const now = new Date().toISOString();
  const { data: used } = await db
    .from('app_password_resets')
    .update({ used_at: now })
    .eq('id', reset.id)
    .is('used_at', null)
    .select('id');
  if (!used?.length) return json({ error: 'expired' }, 400);
  // Os outros códigos ainda abertos da conta (pedidos antes) deixam de valer junto com este.
  const { error: closeError } = await db
    .from('app_password_resets')
    .update({ used_at: now })
    .eq('counterparty_id', cp)
    .eq('channel', 'email')
    .is('used_at', null);
  if (closeError) return json({ error: 'server' }, 500);

  const version = account.session_version + 1;
  const { error } = await db
    .from('app_students')
    .update({ password_hash: await hashPassword(password), must_change_password: false, session_version: version, updated_at: now })
    .eq('counterparty_id', cp);
  if (error) return json({ error: 'server' }, 500);
  await rateRefund(ipTake);
  return json({ token: await makeToken(cp, version) });
}

// ---------- primeiro acesso (020_primeiro_acesso.sql) ----------
const FIRST_ACCESS_FAILS_PER_HOUR = 5;
/** Por IP só os erros contam (o acerto devolve a tentativa). 60 por hora: dia de chegada, vários alunos no mesmo Wi-Fi. */
const FIRST_ACCESS_FAILS_PER_IP = 60;
const TICKET_MINUTES = 20;

let ticketKey: CryptoKey | null = null;
async function getTicketKey() {
  if (!ticketKey) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-activate:${SERVICE_KEY}`));
    ticketKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return ticketKey;
}

/** Bilhete curto entre "provei quem sou" e "escolhi a senha": não abre sessão nenhuma. */
async function makeTicket(cp: string) {
  const payload = b64url(enc.encode(JSON.stringify({ cp, p: 'activate', exp: Date.now() + TICKET_MINUTES * 60_000 })));
  const sig = await crypto.subtle.sign('HMAC', await getTicketKey(), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

async function readTicket(ticket: string): Promise<string | null> {
  const [payload, sig] = ticket.split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await getTicketKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const { cp, p, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return p === 'activate' && Date.now() <= exp ? (cp as string) : null;
  } catch {
    return null;
  }
}

const emailHash = async (email: string) =>
  hex(await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-first:${SERVICE_KEY}:${email}`)));
/** "21 fr-00102 " → "21FR00102": o aluno digita como está no passaporte, com ou sem espaços e traços. */
const normPassport = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

type Ficha = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  arrival_date: string | null;
  emergency_contact_1_name: string | null;
  emergency_contact_1_contact: string | null;
  emergency_contact_2_name: string | null;
  emergency_contact_2_contact: string | null;
};

/** A ficha do aluno com este e-mail e uma estadia ainda aberta (até 30 dias depois da saída). Só uma, senão nenhuma. */
async function fichaByEmail(email: string): Promise<Ficha | null> {
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await db
    .from('finance_counterparties')
    .select(
      'id, name, email, phone, nationality, passport_number, date_of_birth, arrival_date, emergency_contact_1_name, emergency_contact_1_contact, emergency_contact_2_name, emergency_contact_2_contact',
    )
    .ilike('email', pattern);
  const open: Ficha[] = [];
  for (const c of (data ?? []) as Ficha[]) {
    const until = await accessUntil(c.id);
    if (until && !accessEnded(until)) open.push(c);
  }
  return open.length === 1 ? open[0] : null;
}

/**
 * Telefone e contato de emergência aparecem só em parte: quem souber nascimento e passaporte de alguém não leva
 * os números. "+33 6 12 34 56 78" → "+33 6 •• •• •• 78"; "marie.b@mail.fr" → "m•••@mail.fr".
 */
function maskContact(raw: string | null) {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const at = s.indexOf('@');
  if (at > 0) return `${s[0]}•••${s.slice(at)}`;
  const total = s.replace(/\D/g, '').length;
  if (total < 6) return '•'.repeat(Math.max(total, 3));
  const keepStart = Math.min(3, total - 4);
  let seen = 0;
  return s.replace(/\d/g, (d) => {
    seen++;
    return seen <= keepStart || seen > total - 2 ? d : '•';
  });
}

/** O que o aluno confere antes de entrar: só o que ele mesmo informou e a estadia (nunca passaporte nem CPF). */
async function fichaSummary(c: Ficha) {
  const { data: tenants } = await db
    .from('rental_tenants')
    .select('rental_id, move_in_date, move_out_date, arrival_confirmed_date, arrival_time, flight_number')
    .eq('counterparty_id', c.id)
    .eq('is_active', true);
  const ids = (tenants ?? []).map((t) => t.rental_id);
  const { data: rentals } = ids.length
    ? await db
        .from('apartment_rentals')
        .select('id, apartment_id, start_date, end_date')
        .in('id', ids)
        // 'finished': o check-out terminou; a estadia ainda conta até 30 dias depois do fim (app_access_until)
        .in('status', ['active', 'finished'])
    : { data: [] as { id: string; apartment_id: string; start_date: string; end_date: string }[] };
  const r = [...(rentals ?? [])].sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
  const t = r ? (tenants ?? []).find((x) => x.rental_id === r.id) : undefined;
  const { data: apt } = r
    ? await db.from('apartments').select('title').eq('id', r.apartment_id).maybeSingle()
    : { data: null as { title: string } | null };
  return {
    name: c.name,
    email: c.email,
    phone: maskContact(c.phone),
    nationality: c.nationality,
    apartment: apt?.title ?? null,
    stayStart: t?.move_in_date ?? r?.start_date ?? null,
    stayEnd: t?.move_out_date ?? r?.end_date ?? null,
    arrival: {
      date: t?.arrival_confirmed_date ?? c.arrival_date ?? null,
      time: t?.arrival_time ? String(t.arrival_time).slice(0, 5) : null,
      flight: t?.flight_number ?? null,
    },
    emergency: [
      [c.emergency_contact_1_name, c.emergency_contact_1_contact],
      [c.emergency_contact_2_name, c.emergency_contact_2_contact],
    ]
      .filter(([n, k]) => n || k)
      .map(([name, contact]) => ({ name: name ?? null, contact: maskContact(contact) })),
  };
}

async function firstAccessVerify(req: Request, body: { email?: unknown; birthDate?: unknown; passport?: unknown }) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const birth = String(body.birthDate ?? '');
  const passport = normPassport(body.passport);
  if (!email.includes('@') || !isIsoDate(birth) || passport.length < 5) return json({ error: 'invalid' }, 400);

  // Cada tentativa é reservada antes de conferir (021: app_rate_take, atômico) e devolvida quando a ficha confere:
  // só os erros contam. Por e-mail (5/h) e por IP (FIRST_ACCESS_FAILS_PER_IP/h, contra quem testa vários e-mails).
  const attempt = await rateTake(
    'first_access',
    [`e:${await emailHash(email)}`, await limitKey('ip', clientIp(req))],
    [FIRST_ACCESS_FAILS_PER_HOUR, FIRST_ACCESS_FAILS_PER_IP],
    3600,
  );
  if (!attempt) return json({ error: 'tooMany' }, 429);
  const fail = () => json({ error: 'noMatch' }, 400);

  const c = await fichaByEmail(email);
  if (!c || c.date_of_birth !== birth) return fail();
  // Data de nascimento certa, mas a ficha não tem passaporte: a equipe libera pelo painel (Acesso ao app).
  if (!normPassport(c.passport_number)) {
    await rateRefund(attempt);
    const { data: openReq } = await db
      .from('app_password_resets')
      .select('id')
      .eq('counterparty_id', c.id)
      .eq('channel', 'team')
      .is('handled_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);
    if (!openReq?.length) {
      await db.from('app_password_resets').insert({
        counterparty_id: c.id,
        channel: 'team',
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
    }
    return json({ error: 'incomplete' }, 409);
  }
  if (normPassport(c.passport_number) !== passport) return fail();
  // Nascimento e passaporte conferem: daqui em diante nada conta como erro.
  await rateRefund(attempt);

  const { data: acc } = await db
    .from('app_students')
    .select('status, password_hash, deleted_at')
    .eq('counterparty_id', c.id)
    .maybeSingle();
  if (acc?.status === 'disabled' && !acc.deleted_at) return json({ error: 'disabled' }, 403);
  // O primeiro acesso é só para quem ainda não tem senha. Quem tem usa "esqueci a senha" (o código vai para o
  // e-mail dele): senão bastaria saber nascimento e passaporte de alguém para tomar a conta.
  if (acc?.password_hash) return json({ error: 'hasAccount' }, 409);
  return json({
    ticket: await makeTicket(c.id),
    alreadyActive: false,
    profile: await fichaSummary(c),
  });
}

async function firstAccessComplete(body: { ticket?: unknown; password?: unknown; correction?: unknown }) {
  const cp = await readTicket(String(body.ticket ?? ''));
  if (!cp) return json({ error: 'expired' }, 400);
  const password = String(body.password ?? '');
  if (password.length < 8) return json({ error: 'tooShort' }, 400);
  const correction = String(body.correction ?? '').trim().slice(0, 1000);
  if (hasLink(correction)) return noLinks();
  if (accessEnded(await accessUntil(cp))) return json({ error: 'accessEnded' }, 403);

  const { data: acc } = await db
    .from('app_students')
    .select('session_version, status, deleted_at, password_hash')
    .eq('counterparty_id', cp)
    .maybeSingle();
  if (acc?.status === 'disabled' && !acc.deleted_at) return json({ error: 'disabled' }, 403);
  if (acc?.password_hash) return json({ error: 'hasAccount' }, 409);
  const version = (acc?.session_version ?? 0) + 1;
  const now = new Date().toISOString();
  const row = {
    counterparty_id: cp,
    status: 'active',
    password_hash: await hashPassword(password),
    must_change_password: false,
    session_version: version,
    activated_at: now,
    deleted_at: null,
    updated_at: now,
  };
  // Só grava se a conta continua sem senha (dois bilhetes ao mesmo tempo: o segundo recebe 'hasAccount').
  if (acc) {
    const { data: saved, error } = await db
      .from('app_students')
      .update(row)
      .eq('counterparty_id', cp)
      .is('password_hash', null)
      .select('counterparty_id');
    if (error) return json({ error: 'server' }, 500);
    if (!saved?.length) return json({ error: 'hasAccount' }, 409);
  } else {
    const { error } = await db.from('app_students').insert(row);
    if (error?.code === '23505') return json({ error: 'hasAccount' }, 409);
    if (error) return json({ error: 'server' }, 500);
  }
  await db
    .from('app_password_resets')
    .update({ handled_at: now })
    .eq('counterparty_id', cp)
    .eq('channel', 'team')
    .is('handled_at', null);
  if (correction) await db.from('app_profile_corrections').insert({ counterparty_id: cp, message: correction });
  return json({ token: await makeToken(cp, version) });
}

/**
 * Excluir a conta (exigência das lojas). Apaga o que é só do app e do aluno: perfil, aparelhos, o que ele
 * publicou na comunidade, avisos, avaliações, visitas e encomendas. Ficam com a Chez Toi o contrato, os
 * pagamentos, os pedidos (faturados), as despesas divididas com os colegas e o aceite das regras.
 */
async function accountDelete(req: Request, body: { password?: string; reason?: string }) {
  const who = await readToken(req);
  if (!who) {
    // O mesmo pedido de novo, depois de uma resposta que se perdeu: se foi a sessão deste token que apagou a conta
    // (conta apagada, versão seguinte à do token), a resposta é a mesma de antes, e não 'unauthorized'.
    const token = await parseToken(req);
    if (token) {
      const { data: gone } = await db
        .from('app_students')
        .select('counterparty_id')
        .eq('counterparty_id', token.cp)
        .eq('session_version', token.version + 1)
        .is('password_hash', null)
        .not('deleted_at', 'is', null)
        .maybeSingle();
      if (gone) {
        await removeRequestPhotos(token.cp);
        return json({ ok: true });
      }
    }
    return json({ error: 'unauthorized' }, 401);
  }
  const cp = who.cp;
  const reason = String(body.reason ?? '').trim().slice(0, 500);
  if (hasLink(reason)) return noLinks();
  const { data: acc, error: accError } = await db
    .from('app_students')
    .select('password_hash')
    .eq('counterparty_id', cp)
    .maybeSingle();
  if (accError) return json({ error: 'server' }, 500);
  const refused = await checkCurrentPassword(cp, body.password, acc?.password_hash, 403);
  if (refused) return refused;

  // Privacidade primeiro: as fotos dos chamados saem do bucket ANTES de o banco esquecer os caminhos (uma foto órfã é
  // pior que uma miniatura quebrada). Se falhar aqui, nada mais foi apagado e o aluno pode pedir de novo.
  if (!(await removeRequestPhotos(cp))) return json({ error: 'server' }, 500);

  // Tudo ou nada, numa transação (021 e 025: app_account_delete). false: a sessão já não é a atual.
  const { data: deleted, error } = await db.rpc('app_account_delete', {
    p_cp: cp,
    p_version: who.version,
    p_reason: reason,
  });
  if (error) return json({ error: 'server' }, 500);
  if (!deleted) return json({ error: 'unauthorized' }, 401);
  return json({ ok: true });
}

/** Fotos dos chamados do aluno (bucket app-request-photos, pasta = id do aluno). true quando a pasta ficou vazia. */
async function removeRequestPhotos(cp: string) {
  const bucket = db.storage.from('app-request-photos');
  for (let round = 0; round < 50; round++) {
    const { data: files, error } = await bucket.list(cp, { limit: 100 });
    if (error) return false;
    if (!files?.length) return true;
    const { error: removeError } = await bucket.remove(files.map((f) => `${cp}/${f.name}`));
    if (removeError) return false;
  }
  return false;
}

/** Sair: derruba as sessões abertas do aluno (todas as do aparelho e dos outros). */
async function logout(req: Request) {
  // Acesso já encerrado: as sessões dele já não valem, não há o que derrubar.
  const who = await readToken(req).catch((e) => {
    if (e instanceof AccessEnded) return null;
    throw e;
  });
  if (!who) return json({ ok: true });
  const { error } = await db
    .from('app_students')
    .update({ session_version: who.version + 1, updated_at: new Date().toISOString() })
    .eq('counterparty_id', who.cp)
    .eq('session_version', who.version);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

/**
 * Chegada e saída reais do aluno, preenchidas em Chegada e Saída no site. Sem data preenchida vem
 * null: o início do contrato não é a chegada, e o app mostra o fim do contrato com esse nome.
 */
async function arrivalAndDeparture(cp: string) {
  const { data: rentals } = await db.rpc('app_rentals_for', { p_cp: cp });
  const { data: tenants } = await db
    .from('rental_tenants')
    .select('id, arrival_confirmed_date, arrival_time')
    .eq('counterparty_id', cp)
    .eq('is_active', true)
    .in('rental_id', rentals ?? []);
  // apartment_departures.tenant_id é a PESSOA (finance_counterparties.id), não rental_tenants.id:
  // conferido no banco do site em 08/11/2026 (157 de 157 saídas). Busca pela pessoa nos contratos do aluno.
  const { data: departures } = await db
    .from('apartment_departures')
    .select('departure_date, checkout_datetime')
    .eq('tenant_id', cp)
    .in('rental_id', rentals ?? []);

  const first = (tenants ?? [])
    .filter((t) => t.arrival_confirmed_date)
    .sort((a, b) => a.arrival_confirmed_date.localeCompare(b.arrival_confirmed_date))[0];
  const timeZone = 'America/Sao_Paulo';
  const last = (departures ?? [])
    .map((d) => {
      const at = d.checkout_datetime ? new Date(d.checkout_datetime) : null;
      const day = at?.toLocaleDateString('en-CA', { timeZone }) ?? null;
      const date = (d.departure_date ?? day) as string | null;
      const time = at && day === date
        ? at.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' })
        : null;
      return { date, time };
    })
    .filter((d) => d.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];

  return {
    arrival: first ? { date: first.arrival_confirmed_date, time: first.arrival_time?.slice(0, 5) ?? null } : null,
    departure: last ?? null,
  };
}

/** Confere e já marca: quem recebe show = true não recebe de novo no mesmo ano. */
async function birthday(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db.rpc('app_claim_birthday', { p_cp: who.cp });
  if (error) return json({ error: 'server' }, 500);
  return json({ show: data === true });
}

/** Recebe um lote de uso. A data vem do aparelho; se vier estranha, vale a hora em que chegou. */
async function track(req: Request, body: { events?: unknown; searches?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);

  const now = Date.now();
  const when = (value: unknown) => {
    const t = Date.parse(String(value));
    return new Date(Number.isFinite(t) && t <= now && t >= now - 7 * 86_400_000 ? t : now).toISOString();
  };
  const text = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 100) : '');
  const list = (value: unknown) => (Array.isArray(value) ? (value.slice(0, 100) as Record<string, unknown>[]) : []);

  const events = list(body.events)
    .filter((e) => (e?.kind === 'screen' || e?.kind === 'action') && text(e.name))
    .map((e) => ({
      counterparty_id: who.cp,
      kind: e.kind,
      name: text(e.name),
      item: text(e.item) || null,
      occurred_at: when(e.at),
    }));
  const searches = list(body.searches)
    .filter((s) => text(s?.query).length >= 2)
    .map((s) => ({
      query: text(s.query).toLowerCase(),
      results: Math.max(0, Math.floor(Number(s.results) || 0)),
      occurred_at: when(s.at),
    }));

  if (events.length > 0) {
    const { error } = await db.from('app_events').insert(events);
    if (error) return json({ error: 'server' }, 500);
  }
  if (searches.length > 0) {
    const { error } = await db.from('app_searches').insert(searches);
    if (error) return json({ error: 'server' }, 500);
  }
  return json({ ok: true });
}

/** Senhas atuais erradas aceitas por aluno, em PASSWORD_CHECK_WINDOW segundos, nas rotas que a pedem com a sessão aberta. */
const PASSWORD_CHECK_FAILS = 10;
const PASSWORD_CHECK_WINDOW = 15 * 60;

/**
 * Confere a senha atual de quem já está logado (trocar a senha, excluir a conta). Cada tentativa é reservada antes
 * (app_rate_take, chave pw:<aluno>) e devolvida quando a senha confere: só os erros contam. null quando confere;
 * senão a resposta de erro ('wrongCredentials' com wrongStatus, ou 'tooMany' 429).
 */
async function checkCurrentPassword(cp: string, given: unknown, stored: string | null | undefined, wrongStatus: number) {
  const attempt = await rateTake('password_check', [`pw:${cp}`], [PASSWORD_CHECK_FAILS], PASSWORD_CHECK_WINDOW);
  if (!attempt) return json({ error: 'tooMany' }, 429);
  if (!(await checkPassword(String(given ?? ''), stored || DUMMY_HASH))) {
    return json({ error: 'wrongCredentials' }, wrongStatus);
  }
  await rateRefund(attempt);
  return null;
}

async function changePassword(req: Request, body: { password?: string; currentPassword?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const password = String(body.password ?? '');
  if (password.length < 8) return json({ error: 'tooShort' }, 400);
  const { data: acc, error: accError } = await db
    .from('app_students')
    .select('password_hash, must_change_password')
    .eq('counterparty_id', who.cp)
    .maybeSingle();
  if (accError || !acc) return json({ error: 'server' }, 500);
  // Troca obrigatória (logo depois da senha provisória da equipe): o token basta. Troca por vontade própria: a senha
  // atual é exigida, para um telefone destravado na mão de outra pessoa não virar a conta dela.
  if (!acc.must_change_password) {
    const refused = await checkCurrentPassword(who.cp, body.currentPassword, acc.password_hash, 401);
    if (refused) return refused;
  }
  const version = who.version + 1; // derruba sessões abertas com a senha antiga
  const { data: saved, error } = await db
    .from('app_students')
    .update({
      password_hash: await hashPassword(password),
      must_change_password: false,
      session_version: version,
      updated_at: new Date().toISOString(),
    })
    .eq('counterparty_id', who.cp)
    .eq('session_version', who.version)
    .select('counterparty_id');
  if (error) return json({ error: 'server' }, 500);
  // a sessão mudou entre a conferência e a gravação (outra troca ao mesmo tempo)
  if (!saved?.length) return json({ error: 'unauthorized' }, 401);
  return json({ token: await makeToken(who.cp, version) });
}

async function contract(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { data: k } = await db
    .from('rental_contracts')
    .select('file_path, file_name')
    .eq('rental_id', rentalId)
    // rental_contracts tem duas linhas por locação: 'owner' (proprietário) e 'tenant'. Do aluno é só a 'tenant'.
    .eq('contract_type', 'tenant')
    .not('file_path', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!k) return json({ error: 'noContract' }, 404);
  const { data: signed, error } = await db.storage.from('rental-contracts').createSignedUrl(k.file_path, 600);
  if (error || !signed) return json({ error: 'server' }, 500);
  return json({ url: signed.signedUrl, fileName: k.file_name });
}

// ---------- despesas compartilhadas ----------
const MAX_CENTS = 10_000_000; // R$ 100 000, trava contra erro de digitação
const isCents = (n: unknown, min: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= MAX_CENTS;
const isCurrency = (c: unknown) => c === 'BRL' || c === 'EUR';
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

/** Locação do aluno e todos os colegas dela (inquilinos ativos, com ou sem acesso ao app). */
async function group(cp: string) {
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: cp });
  if (!rentalId) return null;
  const { data: tenants } = await db
    .from('rental_tenants')
    .select('counterparty_id')
    .eq('rental_id', rentalId)
    .eq('is_active', true);
  const ids = [...new Set<string>((tenants ?? []).map((t: { counterparty_id: string }) => t.counterparty_id))];
  const [{ data: people }, { data: accounts }] = await Promise.all([
    db.from('finance_counterparties').select('id, name').in('id', ids),
    db.from('app_students').select('counterparty_id, display_name').in('counterparty_id', ids),
  ]);
  const shown = new Map((accounts ?? []).map((a) => [a.counterparty_id, (a.display_name ?? '').trim()]));
  const members = (people ?? [])
    .map((p) => ({ id: p.id as string, name: shown.get(p.id) || (p.name as string) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { rentalId: rentalId as string, members, ids: new Set<string>(ids) };
}

type ExpenseRow = {
  id: string;
  description: string;
  amount_cents: number;
  currency: string;
  paid_by: string;
  spent_on: string;
  split_mode: string;
  created_by: string;
  created_at: string;
  app_expense_shares: { counterparty_id: string; amount_cents: number }[] | null;
};
type SettlementRow = {
  id: string;
  from_cp: string;
  to_cp: string;
  amount_cents: number;
  currency: string;
  paid_on: string;
  created_by: string;
  created_at: string;
};

/** As despesas e os acertos da locação, do mais novo para o mais antigo. */
async function ledger(rentalId: string) {
  const [{ data: rows, error: e1 }, { data: settlements, error: e2 }] = await Promise.all([
    db
      .from('app_expenses')
      .select('id, description, amount_cents, currency, paid_by, spent_on, split_mode, created_by, created_at, app_expense_shares(counterparty_id, amount_cents)')
      .eq('rental_id', rentalId)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
    db
      .from('app_settlements')
      .select('id, from_cp, to_cp, amount_cents, currency, paid_on, created_by, created_at')
      .eq('rental_id', rentalId)
      .order('paid_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (e1 || e2) return null;
  return { expenses: (rows ?? []) as ExpenseRow[], settlements: (settlements ?? []) as SettlementRow[] };
}

/** Todo mundo citado nas contas da locação: quem pagou, quem lançou, quem divide, quem acertou com quem. */
function cited(l: { expenses: ExpenseRow[]; settlements: SettlementRow[] }) {
  const ids = new Set<string>();
  for (const e of l.expenses) {
    ids.add(e.paid_by);
    ids.add(e.created_by);
    for (const sh of e.app_expense_shares ?? []) ids.add(sh.counterparty_id);
  }
  for (const st of l.settlements) {
    ids.add(st.from_cp);
    ids.add(st.to_cp);
    ids.add(st.created_by);
  }
  return ids;
}

/**
 * Já morou nesta locação e saiu: tem linha (desativada) em rental_tenants ou aparece nas contas dela. Serve para o
 * colega que ficou poder acertar com quem foi embora.
 */
async function isFormer(g: { rentalId: string; ids: Set<string> }, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id) || g.ids.has(id)) return false;
  const { data: tenant } = await db
    .from('rental_tenants')
    .select('id')
    .eq('rental_id', g.rentalId)
    .eq('counterparty_id', id)
    .limit(1);
  if (tenant?.length) return true;
  const l = await ledger(g.rentalId);
  return !!l && cited(l).has(id);
}

/** Lugares e distâncias do apartamento do aluno; null enquanto o apartamento não foi calculado. */
async function places(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { data: rental } = await db.from('apartment_rentals').select('apartment_id').eq('id', rentalId).maybeSingle();
  if (!rental?.apartment_id) return json({ places: null });
  const { data, error } = await db
    .from('app_apartment_places')
    .select('nearby, times')
    .eq('apartment_id', rental.apartment_id)
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  return json({ places: data });
}

async function expenses(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const l = await ledger(g.rentalId);
  if (!l) return json({ error: 'server' }, 500);

  // Quem aparece nas contas e já não é inquilino ativo (saiu no meio do semestre): o app mostra o nome em vez de "?"
  // e o colega que ficou consegue acertar com ele (settlement-save).
  const formerIds = [...cited(l)].filter((id) => !g.ids.has(id));
  let former: { id: string; name: string }[] = [];
  if (formerIds.length) {
    const [{ data: people }, { data: accounts }] = await Promise.all([
      db.from('finance_counterparties').select('id, name').in('id', formerIds),
      db.from('app_students').select('counterparty_id, display_name').in('counterparty_id', formerIds),
    ]);
    const shown = new Map((accounts ?? []).map((a) => [a.counterparty_id, (a.display_name ?? '').trim()]));
    former = (people ?? [])
      .map((p) => ({ id: p.id as string, name: shown.get(p.id) || (p.name as string) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return json({
    me: who.cp,
    members: g.members,
    former,
    expenses: l.expenses.map((r) => ({
      id: r.id,
      description: r.description,
      amountCents: r.amount_cents,
      currency: r.currency,
      paidBy: r.paid_by,
      spentOn: r.spent_on,
      splitMode: r.split_mode,
      createdBy: r.created_by,
      createdAt: r.created_at,
      shares: (r.app_expense_shares ?? []).map((sh) => ({
        cp: sh.counterparty_id,
        amountCents: sh.amount_cents,
      })),
    })),
    settlements: l.settlements.map((st) => ({
      id: st.id,
      from: st.from_cp,
      to: st.to_cp,
      amountCents: st.amount_cents,
      currency: st.currency,
      paidOn: st.paid_on,
      createdBy: st.created_by,
      createdAt: st.created_at,
    })),
  });
}

type ExpenseBody = {
  id?: string;
  description?: string;
  amountCents?: number;
  currency?: string;
  paidBy?: string;
  spentOn?: string;
  splitMode?: string;
  shares?: { cp?: string; amountCents?: number }[];
};

async function expenseSave(req: Request, body: ExpenseBody) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);

  // Edição: a despesa tem de ser da locação, de quem lançou e só de quem ainda mora. Com alguém que já saiu no meio
  // ('former'), editar tiraria a parte dele da conta: o app esconde a edição; apagar continua valendo.
  type Old = { id: string; created_by: string; rental_id: string; paid_by: string; app_expense_shares: { counterparty_id: string; amount_cents: number }[] | null };
  let old: Old | null = null;
  if (body.id) {
    const { data } = await db
      .from('app_expenses')
      .select('id, created_by, rental_id, paid_by, app_expense_shares(counterparty_id, amount_cents)')
      .eq('id', String(body.id))
      .maybeSingle();
    old = data as Old | null;
    if (!old || old.rental_id !== g.rentalId) return json({ error: 'notFound' }, 404);
    if (old.created_by !== who.cp) return json({ error: 'forbidden' }, 403);
    const involved = [old.paid_by, ...(old.app_expense_shares ?? []).map((sh) => sh.counterparty_id)];
    if (involved.some((id) => !g.ids.has(id))) return json({ error: 'former' }, 409);
  }

  const description = String(body.description ?? '').trim();
  const shares = Array.isArray(body.shares) ? body.shares : [];
  const sharesOk =
    shares.length > 0 &&
    new Set(shares.map((s) => s.cp)).size === shares.length &&
    shares.every((s) => g.ids.has(String(s.cp)) && isCents(s.amountCents, 0)) &&
    shares.some((s) => (s.amountCents as number) > 0) &&
    shares.reduce((sum, s) => sum + (s.amountCents as number), 0) === body.amountCents;
  if (
    description.length < 1 ||
    description.length > 80 ||
    !isCents(body.amountCents, 1) ||
    !isCurrency(body.currency ?? 'BRL') ||
    !g.ids.has(String(body.paidBy)) ||
    !isDate(body.spentOn) ||
    (body.splitMode !== 'equal' && body.splitMode !== 'exact') ||
    !sharesOk
  ) {
    return json({ error: 'invalid' }, 400);
  }
  if (hasLink(description)) return noLinks();

  const fields = {
    description,
    amount_cents: body.amountCents,
    currency: body.currency ?? 'BRL',
    paid_by: body.paidBy,
    spent_on: body.spentOn,
    split_mode: body.splitMode,
    updated_at: new Date().toISOString(),
  };
  const newShares = (expenseId: string) =>
    shares.map((s) => ({ expense_id: expenseId, counterparty_id: s.cp, amount_cents: s.amountCents }));

  if (old) {
    const { error: e1 } = await db.from('app_expenses').update(fields).eq('id', old.id);
    if (e1) return json({ error: 'server' }, 500);
    await db.from('app_expense_shares').delete().eq('expense_id', old.id);
    const { error: e2 } = await db.from('app_expense_shares').insert(newShares(old.id));
    if (e2) {
      // devolve as partes antigas para a despesa não ficar sem divisão
      await db.from('app_expense_shares').insert(
        (old.app_expense_shares ?? []).map((sh) => ({ expense_id: old.id, ...sh })),
      );
      return json({ error: 'server' }, 500);
    }
    return json({ id: old.id });
  }

  const { data: created, error: e1 } = await db
    .from('app_expenses')
    .insert({ ...fields, rental_id: g.rentalId, created_by: who.cp })
    .select('id')
    .single();
  if (e1 || !created) return json({ error: 'server' }, 500);
  const { error: e2 } = await db.from('app_expense_shares').insert(newShares(created.id));
  if (e2) {
    await db.from('app_expenses').delete().eq('id', created.id);
    return json({ error: 'server' }, 500);
  }
  return json({ id: created.id });
}

/** Apaga uma despesa ou um acerto do grupo do aluno, se foi ele quem lançou. */
async function deleteOwn(req: Request, table: 'app_expenses' | 'app_settlements', id: unknown) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const { data: row } = await db.from(table).select('created_by, rental_id').eq('id', String(id ?? '')).maybeSingle();
  if (!row || row.rental_id !== g.rentalId) return json({ error: 'notFound' }, 404);
  if (row.created_by !== who.cp) return json({ error: 'forbidden' }, 403);
  const { error } = await db.from(table).delete().eq('id', String(id));
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

async function settlementSave(req: Request, body: { from?: string; to?: string; amountCents?: number; currency?: string; paidOn?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const from = String(body.from ?? '');
  const to = String(body.to ?? '');
  if (
    from === to ||
    (from !== who.cp && to !== who.cp) ||
    !isCents(body.amountCents, 1) ||
    !isCurrency(body.currency ?? 'BRL') ||
    !isDate(body.paidOn)
  ) {
    return json({ error: 'invalid' }, 400);
  }
  // Quem lança é inquilino ativo (g vem da locação dele). O outro lado: um colega ativo ou alguém que já saiu desta
  // mesma locação (senão quem ficou nunca zera a conta com quem foi embora).
  const other = from === who.cp ? to : from;
  if (!g.ids.has(other) && !(await isFormer(g, other))) return json({ error: 'invalid' }, 400);
  const { data, error } = await db
    .from('app_settlements')
    .insert({
      rental_id: g.rentalId,
      from_cp: from,
      to_cp: to,
      amount_cents: body.amountCents,
      currency: body.currency ?? 'BRL',
      paid_on: body.paidOn,
      created_by: who.cp,
    })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

const FEEDBACK_DAYS = 7;

/** Data de hoje em BH (AAAA-MM-DD), para o prazo da avaliação não depender do fuso do servidor. */
const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Grava (ou atualiza) a avaliação do aluno para uma faxina realizada da sua locação, dentro do prazo. */
async function cleaningFeedback(req: Request, body: { cleaningId?: string; rating?: number; comment?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  // Contrato principal + continuação (Chada e Jorge em 2027/1): as faxinas de maio também valem.
  const { data: rentalIds } = await db.rpc('app_rentals_for', { p_cp: who.cp });
  if (!rentalIds?.length) return json({ error: 'noRental' }, 404);

  const rating = body.rating;
  const comment = String(body.comment ?? '').trim();
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5 || comment.length > 500) {
    return json({ error: 'invalid' }, 400);
  }
  if (hasLink(comment)) return noLinks();

  const { data: k } = await db
    .from('cleaning_records')
    .select('id, rental_id, scheduled_date, completed, completed_at')
    .eq('id', String(body.cleaningId ?? ''))
    .maybeSingle();
  if (!k || !(rentalIds as string[]).includes(k.rental_id) || !k.completed || !k.scheduled_date) {
    return json({ error: 'notFound' }, 404);
  }
  const doneOn = k.completed_at
    ? new Date(k.completed_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    : k.scheduled_date;
  const start = doneOn > k.scheduled_date ? doneOn : k.scheduled_date;
  if (todayBH() > plusDays(start, FEEDBACK_DAYS)) return json({ error: 'forbidden' }, 403);

  const { error } = await db.from('app_cleaning_feedback').upsert({
    cleaning_id: k.id,
    counterparty_id: who.cp,
    rental_id: k.rental_id,
    rating,
    comment,
    updated_at: new Date().toISOString(),
  });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- check-in / check-out ----------
// Check-in: checkin_inspections (site), etapas "Apartamento entregue" (delivered_at, delivered_to_tenant_id)
// e "Vistoria assinada" (signed_pdf_url, bucket checkin-documents). As etapas antes do aluno ficam de fora.
// Check-out: checkout_handovers (a criar no site, mesmo formato): returned_at, returned_by_tenant_id,
// signed_pdf_url. Enquanto a tabela não existir, o check-out aparece como "ainda não feito".
// Com continuação (Chada e Jorge), o check-in é o do contrato principal e o check-out o do último contrato.
type Handover = { date: string | null; by: string | null; byMe: boolean; hasDocument: boolean };
const HANDOVER = {
  checkin: { table: 'checkin_inspections', date: 'delivered_at', by: 'delivered_to_tenant_id' },
  checkout: { table: 'checkout_handovers', date: 'returned_at', by: 'returned_by_tenant_id' },
} as const;
const HANDOVER_BUCKET = 'checkin-documents';

/** Contrato que vale para cada momento: o primeiro para o check-in, o que termina por último para o check-out. */
async function handoverRentals(cp: string) {
  const { data: ids } = await db.rpc('app_rentals_for', { p_cp: cp });
  if (!ids?.length) return null;
  const { data: rentals } = await db.from('apartment_rentals').select('id, end_date').in('id', ids);
  const last = [...(rentals ?? [])].sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0];
  return { checkin: ids[0] as string, checkout: (last?.id as string) ?? (ids[0] as string) };
}

async function handoverRow(kind: keyof typeof HANDOVER, rentalId: string) {
  const h = HANDOVER[kind];
  const { data } = await db
    .from(h.table)
    .select(`${h.date}, ${h.by}, signed_pdf_url`)
    .eq('rental_id', rentalId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // tabela ainda não criada (check-out) ou sem registro: data é null
  return data as Record<string, string | null> | null;
}

async function handovers(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const rentals = await handoverRentals(who.cp);
  if (!rentals) return json({ error: 'noRental' }, 404);

  const out: Record<string, Handover> = {};
  for (const kind of ['checkin', 'checkout'] as const) {
    const row = await handoverRow(kind, rentals[kind]);
    const tenantId = row?.[HANDOVER[kind].by] ?? null;
    let by: string | null = null;
    let byMe = false;
    if (tenantId) {
      const { data: t } = await db.from('rental_tenants').select('counterparty_id').eq('id', tenantId).maybeSingle();
      if (t) {
        byMe = t.counterparty_id === who.cp;
        const [{ data: c }, { data: s }] = await Promise.all([
          db.from('finance_counterparties').select('name').eq('id', t.counterparty_id).maybeSingle(),
          db.from('app_students').select('display_name').eq('counterparty_id', t.counterparty_id).maybeSingle(),
        ]);
        by = (s?.display_name ?? '').trim() || c?.name || null;
      }
    }
    out[kind] = { date: row?.[HANDOVER[kind].date] ?? null, by, byMe, hasDocument: !!row?.signed_pdf_url };
  }
  return json(out);
}

async function handoverDocument(req: Request, body: { kind?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (body.kind !== 'checkin' && body.kind !== 'checkout') return json({ error: 'invalid' }, 400);
  const rentals = await handoverRentals(who.cp);
  if (!rentals) return json({ error: 'noRental' }, 404);
  const row = await handoverRow(body.kind, rentals[body.kind]);
  if (!row?.signed_pdf_url) return json({ error: 'notFound' }, 404);
  const { data: signed, error } = await db.storage.from(HANDOVER_BUCKET).createSignedUrl(row.signed_pdf_url, 600);
  if (error || !signed) return json({ error: 'server' }, 500);
  return json({ url: signed.signedUrl });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'login':
        return await login(req, body);
      case 'logout':
        return await logout(req);
      case 'home':
        return await home(req);
      case 'change-password':
        return await changePassword(req, body);
      case 'contract':
        return await contract(req);
      case 'expenses':
        return await expenses(req);
      case 'expense-save':
        return await expenseSave(req, body);
      case 'expense-delete':
        return await deleteOwn(req, 'app_expenses', body.id);
      case 'settlement-save':
        return await settlementSave(req, body);
      case 'settlement-delete':
        return await deleteOwn(req, 'app_settlements', body.id);
      case 'cleaning-feedback':
        return await cleaningFeedback(req, body);
      case 'handovers':
        return await handovers(req);
      case 'handover-document':
        return await handoverDocument(req, body);
      case 'birthday':
        return await birthday(req);
      case 'track':
        return await track(req, body);
      case 'places':
        return await places(req);
      case 'password-reset-request':
        return await passwordResetRequest(req, body);
      case 'password-reset-confirm':
        return await passwordResetConfirm(req, body);
      case 'account-delete':
        return await accountDelete(req, body);
      case 'first-access-verify':
        return await firstAccessVerify(req, body);
      case 'first-access-complete':
        return await firstAccessComplete(body);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
