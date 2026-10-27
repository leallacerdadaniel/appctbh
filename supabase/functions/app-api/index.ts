// Supabase Edge Function "app-api": a única porta do app do estudante para o banco.
// Login PRÓPRIO do app (não usa o login do site / auth.users).
// Publicar pelo painel: Edge Functions → Deploy a new function → Via Editor, nome "app-api",
// colar este arquivo e DESLIGAR "Verify JWT" (o app usa o token próprio abaixo).
// Usa as variáveis que o Supabase já fornece: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Rotas (POST, JSON):
//   /app-api/login            { email, password }      → { token, mustChangePassword }
//   /app-api/home             (Authorization: Bearer)  → dados do aluno (app_home_for)
//   /app-api/change-password  { password }             → { token }
//   /app-api/contract         (Authorization: Bearer)  → { url } link temporário do PDF
import { createClient } from 'npm:@supabase/supabase-js@2';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SESSION_DAYS = 120;
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

/** Devolve o aluno do token, ou null se o token for inválido, vencido, de senha antiga ou conta desativada. */
async function readToken(req: Request) {
  const [payload, sig] = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.');
  if (!payload || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(sig), enc.encode(payload));
  if (!ok) return null;
  const { cp, v, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  if (Date.now() > exp) return null;
  const { data } = await db.from('app_students').select('status, session_version').eq('counterparty_id', cp).maybeSingle();
  if (!data || data.status !== 'active' || data.session_version !== v) return null;
  return { cp: cp as string, version: v as number };
}

// ---------- rotas ----------
async function login(body: { email?: string; password?: string }) {
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) return json({ error: 'wrongCredentials' }, 401);

  const { data: rows, error } = await db.rpc('app_login_lookup', { p_email: email });
  if (error) return json({ error: 'server' }, 500);
  // e-mail repetido em dois cadastros: não adivinha qual é
  const account = rows?.length === 1 ? rows[0] : null;
  if (!account || account.status !== 'active' || !(await checkPassword(password, account.password_hash))) {
    return json({ error: 'wrongCredentials' }, 401);
  }

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
  const { data, error } = await db.rpc('app_home_for', { p_cp: who.cp });
  if (error) return json({ error: 'server' }, 500);
  await db.from('app_students').update({ last_seen_at: new Date().toISOString() }).eq('counterparty_id', who.cp);
  if (!data) return json({ error: 'noRental' }, 404);
  return json(data);
}

async function changePassword(req: Request, body: { password?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const password = String(body.password ?? '');
  if (password.length < 8) return json({ error: 'tooShort' }, 400);
  const version = who.version + 1; // derruba sessões abertas com a senha antiga
  const { error } = await db
    .from('app_students')
    .update({
      password_hash: await hashPassword(password),
      must_change_password: false,
      session_version: version,
      updated_at: new Date().toISOString(),
    })
    .eq('counterparty_id', who.cp);
  if (error) return json({ error: 'server' }, 500);
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
    .not('file_path', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!k) return json({ error: 'noContract' }, 404);
  const { data: signed, error } = await db.storage.from('rental-contracts').createSignedUrl(k.file_path, 600);
  if (error || !signed) return json({ error: 'server' }, 500);
  return json({ url: signed.signedUrl, fileName: k.file_name });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'login':
        return await login(body);
      case 'home':
        return await home(req);
      case 'change-password':
        return await changePassword(req, body);
      case 'contract':
        return await contract(req);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch {
    return json({ error: 'server' }, 500);
  }
});
