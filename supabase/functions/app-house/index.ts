// Supabase Edge Function "app-house": tarefas da casa, avisos (o sino), como pagar a Chez Toi e
// registro do aparelho para notificações. Usa o mesmo token de sessão da app-api.
// Publicar com "Verify JWT" desligado.
//
// Rotas (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-house/chores        { weeks?: number }  → { me, members, chores, weeks: [{ weekStart, items }] }
//   /app-house/chore-save    { id?, emoji, name, rotation: cp[] }      (qualquer morador)
//   /app-house/chore-delete  { id }                                    (desativa)
//   /app-house/chore-swap    { choreId, weekStart, cp }                (quem assume a semana)
//   /app-house/chore-done    { choreId, weekStart, done: boolean }
//   /app-house/notices       → { notices: [{ id, title, body, href, at, read }] }
//   /app-house/notices-read  { ids?: string[] }  (sem ids = todos)
//   /app-house/payment-info  → { info }
//   /app-house/device        { token, platform }   (onda 9: push)
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

// ---------- sessão: igual à app-api (manter as funções iguais) ----------
let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (!hmacKey) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-session:${SERVICE_KEY}`));
    hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return hmacKey;
}
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function readToken(req: Request) {
  const [payload, sig] = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const { cp, v, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (Date.now() > exp) return null;
    const { data } = await db.from('app_students').select('status, session_version').eq('counterparty_id', cp).maybeSingle();
    if (!data || data.status !== 'active' || data.session_version !== v) return null;
    return { cp: cp as string };
  } catch {
    return null;
  }
}

// ---------- grupo (locação do aluno e colegas ativos) ----------
async function group(cp: string) {
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: cp });
  if (!rentalId) return null;
  const { data: tenants } = await db
    .from('rental_tenants')
    .select('counterparty_id')
    .eq('rental_id', rentalId)
    .eq('is_active', true);
  const ids = [...new Set((tenants ?? []).map((t) => t.counterparty_id as string))];
  const [{ data: people }, { data: accounts }] = await Promise.all([
    db.from('finance_counterparties').select('id, name').in('id', ids),
    db.from('app_students').select('counterparty_id, display_name').in('counterparty_id', ids),
  ]);
  const shown = new Map((accounts ?? []).map((a) => [a.counterparty_id, (a.display_name ?? '').trim()]));
  const members = (people ?? [])
    .map((p) => ({ id: p.id as string, name: shown.get(p.id) || (p.name as string) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { rentalId: rentalId as string, members, ids: new Set(ids) };
}

// ---------- semanas (segunda-feira, horário de BH) ----------
const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
};
const weeksBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / (7 * 86_400_000));
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);

type Chore = { id: string; emoji: string; name: string; rotation: string[]; start_week: string };

async function chores(req: Request, body: { weeks?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const count = Math.min(Math.max(Math.floor(Number(body.weeks) || 4), 1), 8);
  const first = mondayOf(todayBH());
  const last = addDays(first, 7 * (count - 1));

  const { data: list } = await db
    .from('app_chores')
    .select('id, emoji, name, rotation, start_week')
    .eq('rental_id', g.rentalId)
    .eq('active', true)
    .order('created_at');
  const ids = (list ?? []).map((c) => c.id);
  const [{ data: swaps }, { data: done }] = await Promise.all([
    db.from('app_chore_swaps').select('chore_id, week_start, counterparty_id').in('chore_id', ids).gte('week_start', first).lte('week_start', last),
    db.from('app_chore_completions').select('chore_id, week_start, done_by, done_at').in('chore_id', ids).gte('week_start', first).lte('week_start', last),
  ]);

  const weeks = Array.from({ length: count }, (_, i) => {
    const weekStart = addDays(first, 7 * i);
    return {
      weekStart,
      items: ((list ?? []) as Chore[]).map((c) => {
        const swap = (swaps ?? []).find((s) => s.chore_id === c.id && s.week_start === weekStart);
        const n = c.rotation.length;
        const k = ((weeksBetween(c.start_week, weekStart) % n) + n) % n;
        const completion = (done ?? []).find((d) => d.chore_id === c.id && d.week_start === weekStart);
        return {
          choreId: c.id,
          assignee: swap?.counterparty_id ?? c.rotation[k],
          swapped: !!swap,
          done: !!completion,
          doneBy: completion?.done_by ?? null,
        };
      }),
    };
  });

  return json({
    me: who.cp,
    members: g.members,
    chores: (list ?? []).map((c) => ({ id: c.id, emoji: c.emoji, name: c.name, rotation: c.rotation })),
    weeks,
  });
}

async function choreSave(req: Request, body: { id?: unknown; emoji?: unknown; name?: unknown; rotation?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const name = String(body.name ?? '').trim();
  const emoji = String(body.emoji ?? '🧹').trim().slice(0, 8) || '🧹';
  const rotation = Array.isArray(body.rotation) ? body.rotation.map(String) : [];
  if (
    name.length < 1 ||
    name.length > 60 ||
    rotation.length < 1 ||
    rotation.length > 12 ||
    new Set(rotation).size !== rotation.length ||
    !rotation.every((cp) => g.ids.has(cp))
  ) {
    return json({ error: 'invalid' }, 400);
  }
  const fields = { emoji, name, rotation, updated_at: new Date().toISOString() };
  if (body.id) {
    if (!isUuid(body.id)) return json({ error: 'invalid' }, 400);
    const { data, error } = await db
      .from('app_chores')
      .update(fields)
      .eq('id', body.id)
      .eq('rental_id', g.rentalId)
      .select('id')
      .maybeSingle();
    if (error) return json({ error: 'server' }, 500);
    if (!data) return json({ error: 'notFound' }, 404);
    return json({ id: data.id });
  }
  const { data, error } = await db
    .from('app_chores')
    .insert({ ...fields, rental_id: g.rentalId, start_week: mondayOf(todayBH()), created_by: who.cp })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

async function ownChore(cp: string, id: unknown) {
  const g = await group(cp);
  if (!g || !isUuid(id)) return null;
  const { data } = await db.from('app_chores').select('id, rental_id').eq('id', id).eq('active', true).maybeSingle();
  if (!data || data.rental_id !== g.rentalId) return null;
  return { g, id: data.id as string };
}

async function choreDelete(req: Request, body: { id?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const c = await ownChore(who.cp, body.id);
  if (!c) return json({ error: 'notFound' }, 404);
  const { error } = await db.from('app_chores').update({ active: false, updated_at: new Date().toISOString() }).eq('id', c.id);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

async function choreSwap(req: Request, body: { choreId?: unknown; weekStart?: unknown; cp?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const c = await ownChore(who.cp, body.choreId);
  if (!c) return json({ error: 'notFound' }, 404);
  if (!isDate(body.weekStart) || mondayOf(body.weekStart) !== body.weekStart || body.weekStart < mondayOf(todayBH())) {
    return json({ error: 'invalid' }, 400);
  }
  if (!c.g.ids.has(String(body.cp))) return json({ error: 'invalid' }, 400);
  const { error } = await db
    .from('app_chore_swaps')
    .upsert({ chore_id: c.id, week_start: body.weekStart, counterparty_id: body.cp, created_by: who.cp });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

async function choreDone(req: Request, body: { choreId?: unknown; weekStart?: unknown; done?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const c = await ownChore(who.cp, body.choreId);
  if (!c) return json({ error: 'notFound' }, 404);
  if (!isDate(body.weekStart) || mondayOf(body.weekStart) !== body.weekStart) return json({ error: 'invalid' }, 400);
  const q = body.done
    ? db.from('app_chore_completions').upsert({ chore_id: c.id, week_start: body.weekStart, done_by: who.cp })
    : db.from('app_chore_completions').delete().eq('chore_id', c.id).eq('week_start', body.weekStart);
  const { error } = await q;
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- avisos ----------
async function notices(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentals } = await db.rpc('app_rentals_for', { p_cp: who.cp });
  const rentalList = (rentals as string[] | null) ?? [];
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const filter = [
    'audience.eq.all',
    `and(audience.eq.student,counterparty_id.eq.${who.cp})`,
    ...(rentalList.length ? [`and(audience.eq.rental,rental_id.in.(${rentalList.join(',')}))`] : []),
  ].join(',');
  const { data: rows, error } = await db
    .from('app_notices')
    .select('id, title, body, href, created_at')
    .or(filter)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return json({ error: 'server' }, 500);
  const ids = (rows ?? []).map((r) => r.id);
  const { data: reads } = ids.length
    ? await db.from('app_notice_reads').select('notice_id').eq('counterparty_id', who.cp).in('notice_id', ids)
    : { data: [] };
  const read = new Set((reads ?? []).map((r) => r.notice_id));
  return json({
    notices: (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      href: r.href,
      at: r.created_at,
      read: read.has(r.id),
    })),
  });
}

async function noticesRead(req: Request, body: { ids?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  let ids = Array.isArray(body.ids) ? body.ids.filter(isUuid) : null;
  if (!ids) {
    const res = await notices(req);
    const { notices: list } = (await res.json()) as { notices?: { id: string; read: boolean }[] };
    ids = (list ?? []).filter((n) => !n.read).map((n) => n.id);
  }
  if (ids.length === 0) return json({ ok: true });
  const { error } = await db
    .from('app_notice_reads')
    .upsert(ids.slice(0, 200).map((id) => ({ notice_id: id, counterparty_id: who.cp })), { ignoreDuplicates: true });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- pagamento e aparelho ----------
async function paymentInfo(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db
    .from('app_payment_info')
    .select('beneficiary, document, pix_key, pix_key_type, bank, agency, account, eur_account_holder, eur_iban, eur_swift, notes')
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  return json({
    info: data && {
      beneficiary: data.beneficiary,
      document: data.document,
      pixKey: data.pix_key,
      pixKeyType: data.pix_key_type,
      bank: data.bank,
      agency: data.agency,
      account: data.account,
      eurAccountHolder: data.eur_account_holder,
      eurIban: data.eur_iban,
      eurSwift: data.eur_swift,
      notes: data.notes,
    },
  });
}

async function device(req: Request, body: { token?: unknown; platform?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const token = String(body.token ?? '');
  if (!/^ExponentPushToken\[[\w-]+\]$/.test(token) || (body.platform !== 'ios' && body.platform !== 'android')) {
    return json({ error: 'invalid' }, 400);
  }
  const { error } = await db.from('app_devices').upsert({
    expo_token: token,
    counterparty_id: who.cp,
    platform: body.platform,
    enabled: true,
    last_seen_at: new Date().toISOString(),
  });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'chores':
        return await chores(req, body);
      case 'chore-save':
        return await choreSave(req, body);
      case 'chore-delete':
        return await choreDelete(req, body);
      case 'chore-swap':
        return await choreSwap(req, body);
      case 'chore-done':
        return await choreDone(req, body);
      case 'notices':
        return await notices(req);
      case 'notices-read':
        return await noticesRead(req, body);
      case 'payment-info':
        return await paymentInfo(req);
      case 'device':
        return await device(req, body);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch {
    return json({ error: 'server' }, 500);
  }
});
