// Supabase Edge Function "app-admin": o que o painel do site faz com o acesso dos alunos ao app (onda 3,
// 09/11/2026). Chamada pelo painel com o login da EQUIPE (supabase.functions.invoke, JWT do site); só
// papéis admin e equipe. Publicar com "Verify JWT" LIGADO.
//
// POST JSON { action, ... }:
//   { action: 'students' }  → { students: [{ counterpartyId, name, email, phone, apartment, rentalStart, rentalEnd,
//                               status, mustChangePassword, lastLoginAt, invitedAt, deletedAt, resetRequestedAt }] }
//   { action: 'invite', counterpartyId, sendEmail? } → { tempPassword, name, email, phone, message: { fr, en }, emailed }
//       convite e nova senha são a mesma coisa: senha provisória, troca obrigatória no primeiro acesso,
//       sessões antigas caem. Resolve os pedidos de "esqueci a senha" abertos.
//   { action: 'disable' | 'enable', counterpartyId } → { ok: true }
// A senha provisória aparece uma vez no painel e nunca é guardada em texto (só o hash, como na app-api).
import { createClient } from 'npm:@supabase/supabase-js@2';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const enc = new TextEncoder();
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- senha: igual à app-api (pbkdf2$iter$salt$hash) ----------
const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(bits)}`;
}

/** 10 caracteres sem os que se confundem (0/O, 1/l/I), fácil de digitar no celular. */
function tempPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

// ---------- e-mail (opcional, mesmos segredos da app-api) ----------
const EMAIL_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('RESEND_FROM') ?? '';

async function sendEmail(to: string, subject: string, text: string) {
  if (!EMAIL_KEY || !EMAIL_FROM) return false;
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

// ---------- quem chama: um membro da equipe logado no site ----------
async function teamMember(req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return null;
  const id = data.user.id;
  const [{ data: admin }, { data: equipe }] = await Promise.all([
    db.rpc('has_role', { _user_id: id, _role: 'admin' }),
    db.rpc('has_role', { _user_id: id, _role: 'equipe' }),
  ]);
  return admin || equipe ? { id } : null;
}

const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);

/** Alunos de locações ativas que ainda não acabaram há mais de 30 dias, mais quem já tem conta no app. */
async function students() {
  const { data: rentals } = await db
    .from('apartment_rentals')
    .select('id, apartment_id, start_date, end_date')
    .eq('status', 'active')
    .gte('end_date', addDays(todayBH(), -30));
  const rentalIds = (rentals ?? []).map((r) => r.id);
  const [{ data: tenants }, { data: accounts }] = await Promise.all([
    rentalIds.length
      ? db.from('rental_tenants').select('counterparty_id, rental_id').eq('is_active', true).in('rental_id', rentalIds)
      : Promise.resolve({ data: [] as { counterparty_id: string; rental_id: string }[] }),
    db
      .from('app_students')
      .select('counterparty_id, status, must_change_password, last_login_at, invited_at, deleted_at'),
  ]);
  const ids = [...new Set([...(tenants ?? []).map((t) => t.counterparty_id), ...(accounts ?? []).map((a) => a.counterparty_id)])];
  if (!ids.length) return json({ students: [] });

  const apartmentIds = [...new Set((rentals ?? []).map((r) => r.apartment_id))];
  const [{ data: people }, { data: apartments }, { data: resets }] = await Promise.all([
    db.from('finance_counterparties').select('id, name, email, phone').in('id', ids),
    apartmentIds.length
      ? db.from('apartments').select('id, title').in('id', apartmentIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    db
      .from('app_password_resets')
      .select('counterparty_id, created_at')
      .eq('channel', 'team')
      .is('handled_at', null)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);

  const rentalOf = new Map<string, { apartment_id: string; start_date: string; end_date: string }>();
  for (const t of tenants ?? []) {
    const r = (rentals ?? []).find((x) => x.id === t.rental_id);
    const prev = rentalOf.get(t.counterparty_id);
    if (r && (!prev || r.end_date > prev.end_date)) rentalOf.set(t.counterparty_id, r);
  }
  const titleOf = new Map((apartments ?? []).map((a) => [a.id, a.title as string]));
  const accountOf = new Map((accounts ?? []).map((a) => [a.counterparty_id, a]));
  const resetOf = new Map<string, string>();
  for (const r of resets ?? []) if (!resetOf.has(r.counterparty_id)) resetOf.set(r.counterparty_id, r.created_at);

  const list = (people ?? []).map((p) => {
    const rental = rentalOf.get(p.id);
    const acc = accountOf.get(p.id);
    return {
      counterpartyId: p.id,
      name: p.name,
      email: p.email ?? null,
      phone: p.phone ?? null,
      apartment: rental ? (titleOf.get(rental.apartment_id) ?? null) : null,
      rentalStart: rental?.start_date ?? null,
      rentalEnd: rental?.end_date ?? null,
      status: acc?.status ?? 'no_access',
      mustChangePassword: acc?.must_change_password ?? true,
      lastLoginAt: acc?.last_login_at ?? null,
      invitedAt: acc?.invited_at ?? null,
      deletedAt: acc?.deleted_at ?? null,
      resetRequestedAt: resetOf.get(p.id) ?? null,
    };
  });
  list.sort((a, b) => (a.apartment ?? '~').localeCompare(b.apartment ?? '~') || a.name.localeCompare(b.name));
  return json({ students: list });
}

async function invite(team: { id: string }, body: { counterpartyId?: unknown; sendEmail?: unknown }) {
  if (!isUuid(body.counterpartyId)) return json({ error: 'notFound' }, 404);
  const cp = body.counterpartyId;
  const { data: person } = await db.from('finance_counterparties').select('id, name, email, phone').eq('id', cp).maybeSingle();
  if (!person) return json({ error: 'notFound' }, 404);
  const email = (person.email ?? '').trim();
  // O login do app é pelo e-mail do cadastro: sem e-mail, não há como entrar.
  if (!email.includes('@')) return json({ error: 'noEmail' }, 400);

  const password = tempPassword();
  const now = new Date().toISOString();
  const { data: acc } = await db.from('app_students').select('session_version').eq('counterparty_id', cp).maybeSingle();
  const row = {
    counterparty_id: cp,
    status: 'active',
    must_change_password: true,
    password_hash: await hashPassword(password),
    session_version: (acc?.session_version ?? 0) + 1,
    invited_at: now,
    invited_by: team.id,
    deleted_at: null,
    updated_at: now,
  };
  const { error } = acc
    ? await db.from('app_students').update(row).eq('counterparty_id', cp)
    : await db.from('app_students').insert(row);
  if (error) return json({ error: 'server' }, 500);
  await db
    .from('app_password_resets')
    .update({ handled_at: now, handled_by: team.id })
    .eq('counterparty_id', cp)
    .eq('channel', 'team')
    .is('handled_at', null);

  const first = String(person.name ?? '').trim().split(/\s+/)[0] || '';
  const message = {
    fr:
      `Bonjour ${first}, voici votre accès à l'app Chez Toi BH.\n` +
      `E-mail : ${email}\nMot de passe provisoire : ${password}\n` +
      `À la première connexion, vous choisirez votre propre mot de passe.`,
    en:
      `Hi ${first}, here is your access to the Chez Toi BH app.\n` +
      `E-mail: ${email}\nTemporary password: ${password}\n` +
      `When you first sign in, you will choose your own password.`,
  };
  const emailed = body.sendEmail === true
    ? await sendEmail(email, 'Chez Toi BH : votre accès à l’app / your app access', `${message.fr}\n\n---\n\n${message.en}`)
    : false;
  return json({ tempPassword: password, name: person.name, email, phone: person.phone ?? null, message, emailed });
}

async function setEnabled(body: { counterpartyId?: unknown }, enabled: boolean) {
  if (!isUuid(body.counterpartyId)) return json({ error: 'notFound' }, 404);
  const { data: acc } = await db
    .from('app_students')
    .select('session_version, password_hash, deleted_at')
    .eq('counterparty_id', body.counterpartyId)
    .maybeSingle();
  if (!acc) return json({ error: 'notFound' }, 404);
  // Conta apagada pelo aluno ou sem senha: religar é convidar de novo (senha provisória).
  if (enabled && (!acc.password_hash || acc.deleted_at)) return json({ error: 'notFound' }, 404);
  const { error } = await db
    .from('app_students')
    .update({
      status: enabled ? 'active' : 'disabled',
      session_version: acc.session_version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('counterparty_id', body.counterpartyId);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const team = await teamMember(req);
  if (!team) return json({ error: 'forbidden' }, 403);
  const body = await req.json().catch(() => ({}));
  try {
    switch (body.action) {
      case 'students':
        return await students();
      case 'invite':
        return await invite(team, body);
      case 'disable':
        return await setEnabled(body, false);
      case 'enable':
        return await setEnabled(body, true);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch {
    return json({ error: 'server' }, 500);
  }
});
