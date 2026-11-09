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
//   /app-house/device        { token, platform, lang? }   (onda 9: push; lang 'fr' | 'en' = língua do app, 022)
//   /app-house/rules-status  → { accepted: string | null }  (versão das regras já aceita nesta locação)
//   /app-house/rules-accept  { version: 'AAAA-MM', lang }    (introdução obrigatória das regras)
//   A vida no prédio (012_visitas_encomendas_perfis.sql):
//   /app-house/visitors          → { visitors: [{ id, name, date, time, note, notifiedAt }], portaria: { whatsapp } }
//   /app-house/visitor-save      { id?, name, date, time?, note? }   → { id }   (muda nome/dia/hora = avisar de novo)
//   /app-house/visitor-cancel    { id }
//   /app-house/visitor-notified  { id }                              (o aluno abriu o WhatsApp da portaria)
//   /app-house/packages          → { packages: [{ id, description, carrier, expectedDate, status, teamNote, arrivedAt, pickedUpAt, createdAt }] }
//   /app-house/package-save      { id?, description, carrier?, expectedDate? }  → { id }   (só enquanto 'expected')
//   /app-house/package-picked    { id }                              (expected ou arrived → picked_up)
//   /app-house/package-cancel    { id }                              (só 'expected')
//   /app-house/profile           → { profile: { school, hometown, languages, instagram, about, visible } | null }
//   /app-house/profile-save      { school?, hometown?, languages: string[], instagram?, about?, visible: boolean }
//   /app-house/roommate-profiles → { roommates: [{ id, name, profile | null }] }  (só perfis com visible = true)
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

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

/** O acesso terminou (saída + 30 dias): o Deno.serve responde 'accessEnded' (403) e o app sai da conta. */
class AccessEnded extends Error {}

/**
 * Devolve o aluno do token, ou null se o token for inválido, vencido, de senha antiga ou de conta desativada.
 * Acesso encerrado (app_access_until no passado, data de BH) lança AccessEnded (021: app_session_state).
 */
async function readToken(req: Request) {
  const [payload, sig] = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.');
  if (!payload || !sig) return null;
  let cp: string;
  let v: number;
  try {
    const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const t = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof t?.cp !== 'string' || !Number.isInteger(t.v) || !(Date.now() <= t.exp)) return null;
    cp = t.cp;
    v = t.v;
  } catch {
    return null;
  }
  const { data, error } = await db.rpc('app_session_state', { p_cp: cp, p_version: v });
  if (!error && data === 'ended') throw new AccessEnded();
  if (error || data !== 'ok') return null;
  return { cp, version: v };
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

async function device(req: Request, body: { token?: unknown; platform?: unknown; lang?: unknown }) {
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
    lang: body.lang === 'en' || body.lang === 'fr' ? body.lang : null,
    enabled: true,
    last_seen_at: new Date().toISOString(),
  });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- regras da casa (aceite obrigatório) ----------
async function rulesStatus(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ accepted: null });
  const { data, error } = await db
    .from('app_rules_acceptances')
    .select('version')
    .eq('counterparty_id', who.cp)
    .eq('rental_id', rentalId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  return json({ accepted: (data?.version as string | undefined) ?? null });
}

async function rulesAccept(req: Request, body: { version?: unknown; lang?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (typeof body.version !== 'string' || !/^\d{4}-\d{2}$/.test(body.version)) return json({ error: 'invalid' }, 400);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { error } = await db.from('app_rules_acceptances').upsert(
    {
      counterparty_id: who.cp,
      rental_id: rentalId,
      version: body.version,
      lang: body.lang === 'en' ? 'en' : 'fr',
    },
    { onConflict: 'counterparty_id,rental_id,version', ignoreDuplicates: true },
  );
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- a vida no prédio: visitas, encomendas, perfis ----------

/**
 * Texto livre de uma linha: sem caracteres de controle, espaços juntados. null = vazio;
 * undefined = inválido (tipo errado ou longo demais).
 */
function line(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  // deno-lint-ignore no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) return undefined;
  return s || null;
}
const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Número de WhatsApp da portaria (app_apartment_info.building_info.portaria_whatsapp), só dígitos, com o 55. */
async function portariaWhatsApp(rentalId: string | null) {
  if (!rentalId) return null;
  const { data: rental } = await db.from('apartment_rentals').select('apartment_id').eq('id', rentalId).maybeSingle();
  if (!rental?.apartment_id) return null;
  const { data: info } = await db
    .from('app_apartment_info')
    .select('building_info')
    .eq('apartment_id', rental.apartment_id)
    .maybeSingle();
  const raw = (info?.building_info as Record<string, unknown> | null)?.portaria_whatsapp;
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  return /^55\d{10,11}$/.test(full) ? full : null;
}

const VISIT_PAST_DAYS = 60;
const VISIT_AHEAD_DAYS = 180;
const MAX_UPCOMING_VISITS = 30;

async function visitors(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  const [{ data, error }, whatsapp] = await Promise.all([
    db
      .from('app_visitors')
      .select('id, name, visit_date, visit_time, note, notified_at')
      .eq('counterparty_id', who.cp)
      .eq('status', 'planned')
      .gte('visit_date', addDays(todayBH(), -VISIT_PAST_DAYS))
      .order('visit_date')
      .order('visit_time', { nullsFirst: true })
      .limit(200),
    portariaWhatsApp((rentalId as string | null) ?? null),
  ]);
  if (error) return json({ error: 'server' }, 500);
  return json({
    visitors: (data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      date: v.visit_date,
      time: hhmm(v.visit_time),
      note: v.note,
      notifiedAt: v.notified_at,
    })),
    portaria: { whatsapp },
  });
}

async function visitorSave(req: Request, body: { id?: unknown; name?: unknown; date?: unknown; time?: unknown; note?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const today = todayBH();
  const name = line(body.name, 80);
  const note = line(body.note, 200);
  const time = body.time === null || body.time === undefined || body.time === '' ? null : body.time;
  if (
    !name ||
    note === undefined ||
    !isDate(body.date) ||
    body.date < today ||
    body.date > addDays(today, VISIT_AHEAD_DAYS) ||
    (time !== null && !isTime(time))
  ) {
    return json({ error: 'invalid' }, 400);
  }
  const fields = { name, visit_date: body.date, visit_time: time, note, updated_at: new Date().toISOString() };

  if (body.id !== undefined && body.id !== null) {
    if (!isUuid(body.id)) return json({ error: 'invalid' }, 400);
    const { data: current } = await db
      .from('app_visitors')
      .select('id, name, visit_date, visit_time, notified_at')
      .eq('id', body.id)
      .eq('counterparty_id', who.cp)
      .eq('status', 'planned')
      .gte('visit_date', today)
      .maybeSingle();
    if (!current) return json({ error: 'notFound' }, 404);
    // Outro nome, dia ou hora: a portaria precisa ser avisada de novo.
    const changed = current.name !== name || current.visit_date !== body.date || hhmm(current.visit_time) !== time;
    const { error } = await db
      .from('app_visitors')
      .update({ ...fields, ...(changed ? { notified_at: null } : {}) })
      .eq('id', current.id);
    if (error) return json({ error: 'server' }, 500);
    return json({ id: current.id });
  }

  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { count } = await db
    .from('app_visitors')
    .select('id', { count: 'exact', head: true })
    .eq('counterparty_id', who.cp)
    .eq('status', 'planned')
    .gte('visit_date', today);
  if ((count ?? 0) >= MAX_UPCOMING_VISITS) return json({ error: 'limit' }, 429);
  const { data, error } = await db
    .from('app_visitors')
    .insert({ ...fields, counterparty_id: who.cp, rental_id: rentalId })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

async function visitorUpdate(req: Request, body: { id?: unknown }, action: 'cancel' | 'notified') {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (!isUuid(body.id)) return json({ error: 'invalid' }, 400);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('app_visitors')
    .update(action === 'cancel' ? { status: 'cancelled', updated_at: now } : { notified_at: now, updated_at: now })
    .eq('id', body.id)
    .eq('counterparty_id', who.cp)
    .eq('status', 'planned')
    .gte('visit_date', todayBH())
    .select('id')
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  if (!data) return json({ error: 'notFound' }, 404);
  return json({ ok: true });
}

const PACKAGES_KEEP_DAYS = 30;
const MAX_EXPECTED_PACKAGES = 30;

async function packages(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const since = new Date(Date.now() - PACKAGES_KEEP_DAYS * 86_400_000).toISOString();
  const { data, error } = await db
    .from('app_packages')
    .select('id, description, carrier, expected_date, status, team_note, arrived_at, picked_up_at, created_at')
    .eq('counterparty_id', who.cp)
    .in('status', ['expected', 'arrived', 'picked_up'])
    // Récupérés: só os do último mês.
    .or(`status.neq.picked_up,picked_up_at.gte."${since}"`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return json({ error: 'server' }, 500);
  return json({
    packages: (data ?? []).map((p) => ({
      id: p.id,
      description: p.description,
      carrier: p.carrier,
      expectedDate: p.expected_date,
      status: p.status,
      teamNote: p.team_note,
      arrivedAt: p.arrived_at,
      pickedUpAt: p.picked_up_at,
      createdAt: p.created_at,
    })),
  });
}

async function packageSave(
  req: Request,
  body: { id?: unknown; description?: unknown; carrier?: unknown; expectedDate?: unknown },
) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const today = todayBH();
  const description = line(body.description, 80);
  const carrier = line(body.carrier, 60);
  const expected = body.expectedDate === null || body.expectedDate === undefined || body.expectedDate === '' ? null : body.expectedDate;
  if (
    !description ||
    carrier === undefined ||
    (expected !== null && (!isDate(expected) || expected < addDays(today, -30) || expected > addDays(today, 180)))
  ) {
    return json({ error: 'invalid' }, 400);
  }
  const fields = { description, carrier, expected_date: expected };

  if (body.id !== undefined && body.id !== null) {
    if (!isUuid(body.id)) return json({ error: 'invalid' }, 400);
    const { data, error } = await db
      .from('app_packages')
      .update(fields)
      .eq('id', body.id)
      .eq('counterparty_id', who.cp)
      .eq('status', 'expected')
      .select('id')
      .maybeSingle();
    if (error) return json({ error: 'server' }, 500);
    if (!data) return json({ error: 'notFound' }, 404);
    return json({ id: data.id });
  }

  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { count } = await db
    .from('app_packages')
    .select('id', { count: 'exact', head: true })
    .eq('counterparty_id', who.cp)
    .eq('status', 'expected');
  if ((count ?? 0) >= MAX_EXPECTED_PACKAGES) return json({ error: 'limit' }, 429);
  const { data, error } = await db
    .from('app_packages')
    .insert({ ...fields, counterparty_id: who.cp, rental_id: rentalId })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

async function packageUpdate(req: Request, body: { id?: unknown }, action: 'picked' | 'cancel') {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (!isUuid(body.id)) return json({ error: 'invalid' }, 400);
  // picked_up_at e updated_at vêm do gatilho app_packages_stamp.
  const { data, error } = await db
    .from('app_packages')
    .update({ status: action === 'picked' ? 'picked_up' : 'cancelled' })
    .eq('id', body.id)
    .eq('counterparty_id', who.cp)
    .in('status', action === 'picked' ? ['expected', 'arrived'] : ['expected'])
    .select('id')
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  if (!data) return json({ error: 'notFound' }, 404);
  return json({ ok: true });
}

type ProfileRow = {
  counterparty_id: string;
  school: string | null;
  hometown: string | null;
  languages: string[] | null;
  instagram: string | null;
  about: string | null;
  visible: boolean;
};
const PROFILE_COLUMNS = 'counterparty_id, school, hometown, languages, instagram, about, visible';
const toProfile = (p: ProfileRow) => ({
  school: p.school,
  hometown: p.hometown,
  languages: p.languages ?? [],
  instagram: p.instagram,
  about: p.about,
  visible: p.visible,
});

async function profile(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db.from('app_profiles').select(PROFILE_COLUMNS).eq('counterparty_id', who.cp).maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  return json({ profile: data ? toProfile(data as ProfileRow) : null });
}

async function profileSave(
  req: Request,
  body: { school?: unknown; hometown?: unknown; languages?: unknown; instagram?: unknown; about?: unknown; visible?: unknown },
) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const school = line(body.school, 80);
  const hometown = line(body.hometown, 80);
  const about = line(body.about, 140);
  // "@lea.m", "instagram.com/lea.m" ou "lea.m" → "lea.m"
  const handle = line(body.instagram, 80);
  const instagram =
    typeof handle === 'string'
      ? handle.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '').replace(/\?.*$/, '') ||
        null
      : handle;
  const languages = Array.isArray(body.languages) ? [...new Set(body.languages)] : null;
  if (
    school === undefined ||
    hometown === undefined ||
    about === undefined ||
    instagram === undefined ||
    (instagram !== null && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) ||
    !languages ||
    languages.length > 8 ||
    !languages.every((l) => typeof l === 'string' && /^[a-z]{2}$/.test(l)) ||
    typeof body.visible !== 'boolean'
  ) {
    return json({ error: 'invalid' }, 400);
  }
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  const { data, error } = await db
    .from('app_profiles')
    .upsert({
      counterparty_id: who.cp,
      rental_id: (rentalId as string | null) ?? null,
      school,
      hometown,
      languages,
      instagram,
      about,
      visible: body.visible,
      updated_at: new Date().toISOString(),
    })
    .select(PROFILE_COLUMNS)
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ profile: toProfile(data as ProfileRow) });
}

/** Os colegas da locação atual; o perfil só vem quando o colega ligou "visível". */
async function roommateProfiles(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const others = g.members.filter((m) => m.id !== who.cp);
  const { data, error } = others.length
    ? await db
        .from('app_profiles')
        .select(PROFILE_COLUMNS)
        .in('counterparty_id', others.map((m) => m.id))
        .eq('visible', true)
    : { data: [], error: null };
  if (error) return json({ error: 'server' }, 500);
  const byId = new Map(((data ?? []) as ProfileRow[]).map((p) => [p.counterparty_id, p]));
  return json({
    roommates: others.map((m) => {
      const p = byId.get(m.id);
      return { id: m.id, name: m.name, profile: p ? toProfile(p) : null };
    }),
  });
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
      case 'rules-status':
        return await rulesStatus(req);
      case 'rules-accept':
        return await rulesAccept(req, body);
      case 'visitors':
        return await visitors(req);
      case 'visitor-save':
        return await visitorSave(req, body);
      case 'visitor-cancel':
        return await visitorUpdate(req, body, 'cancel');
      case 'visitor-notified':
        return await visitorUpdate(req, body, 'notified');
      case 'packages':
        return await packages(req);
      case 'package-save':
        return await packageSave(req, body);
      case 'package-picked':
        return await packageUpdate(req, body, 'picked');
      case 'package-cancel':
        return await packageUpdate(req, body, 'cancel');
      case 'profile':
        return await profile(req);
      case 'profile-save':
        return await profileSave(req, body);
      case 'roommate-profiles':
        return await roommateProfiles(req);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
