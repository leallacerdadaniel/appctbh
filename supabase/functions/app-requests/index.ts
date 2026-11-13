// Supabase Edge Function "app-requests": pedidos do aluno (onda 6).
// Separada da app-api para não mexer na função que já está no ar; usa o MESMO token de sessão
// (mesma chave HMAC derivada da SUPABASE_SERVICE_ROLE_KEY do projeto), então o login continua na app-api.
// Publicar com "Verify JWT" desligado.
//
// Rotas (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-requests/list           → { catalog, gourmet, stay, requests }
//   /app-requests/detail         { id } → { request } com a linha do tempo e links temporários das fotos
//   /app-requests/create         { kind, ... } → { request }
//       service        { serviceId, date, time, quantity, note? }
//       maintenance    { room, category, urgency, description, photoPaths?, note? }
//       late_checkout  { date, time, note? }   early_checkin { date, time, note? }
//       gourmet        { date, startTime, endTime, guests, note? }
//   /app-requests/cancel         { id }            (só enquanto recebido ou confirmado)
//   /app-requests/rate           { id, rating, comment? }  (só depois de concluído)
//   /app-requests/photo-upload   { contentType } → { path, signedUrl } para enviar uma foto (PUT)
//
// Cobrança: extra acumula e é faturado com o aluguel do mês seguinte ao serviço (billing_month).
// Revisão de 10/11/2026 (025_revisao_do_servidor.sql): texto livre com link (nota, descrição, cômodo, comentário da
// avaliação) responde 'links' (400); o espaço gourmet é do prédio: a reserva confere e grava num passo só
// (app_gourmet_book), contra as reservas de todos os apartamentos que dividem o espaço ('taken', 409); erro do banco
// ao conferir a sessão responde 'server' (500), nunca 'unauthorized'.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const enc = new TextEncoder();
const PHOTO_BUCKET = 'app-request-photos';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- sessão: igual à app-api (manter as duas iguais) ----------
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
  // Erro do banco (reinício, cache do PostgREST recarregando depois de uma migração) não é sessão inválida:
  // lança, o Deno.serve responde 'server' (500) e o app tenta de novo. Só um 'invalid' de verdade vira 401.
  if (error) throw new Error(`app_session_state: ${error.message}`);
  if (data === 'ended') throw new AccessEnded();
  if (data === 'ok') return { cp, version: v };
  if (data === 'invalid') return null;
  throw new Error('app_session_state: resposta inesperada');
}

// ---------- nenhum link no que o aluno escreve ----------
// A MESMA regra em app_has_link (025_revisao_do_servidor.sql), nas funções app-api, app-community, app-house,
// app-requests, app-feedback e app-assistant e no app (src/lib/no-links.ts): mudou uma, mudam todas.
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
/** O banco também recusa (regras *_no_links, 019), mas lá o erro viraria 'server' (500): aqui o aluno recebe o motivo. */
const noLinks = () => json({ error: 'links' }, 400);

// ---------- validação ----------
const KINDS = ['service', 'maintenance', 'late_checkout', 'early_checkin', 'gourmet'] as const;
const ROOM_CATEGORIES = ['plumbing', 'electrical', 'appliance', 'furniture', 'internet', 'other'];
const URGENCIES = ['low', 'normal', 'urgent'];
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/** Belo Horizonte não tem horário de verão: UTC−3 o ano todo. */
const bhInstant = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`).getTime();
const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const nextMonth = (date: string) => {
  const [y, m] = date.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // m já é o mês seguinte em base 0
  return d.toISOString().slice(0, 10);
};

// ---------- leitura ----------
async function rentalOf(cp: string) {
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: cp });
  if (!rentalId) return null;
  const { data: rental } = await db.from('apartment_rentals').select('id, apartment_id').eq('id', rentalId).maybeSingle();
  return rental as { id: string; apartment_id: string } | null;
}

async function gourmetOf(apartmentId: string) {
  const { data } = await db.from('app_apartment_info').select('building_info').eq('apartment_id', apartmentId).maybeSingle();
  const g = (data?.building_info as Record<string, unknown> | null)?.gourmet as Record<string, unknown> | undefined;
  if (!g) return null;
  return {
    name: g.name ?? {},
    capacity: Number(g.capacity) || 10,
    openFrom: String(g.open_from ?? '10:00'),
    openUntil: String(g.open_until ?? '22:00'),
    maxHours: Number(g.max_hours) || 4,
    rules: g.rules ?? {},
  };
}

/** Datas da estadia para late checkout e early check-in: chegada e saída do aluno, ou as do contrato. */
async function stayOf(cp: string, rentalId: string) {
  const { data: t } = await db
    .from('rental_tenants')
    .select('id, move_in_date, move_out_date, arrival_confirmed_date, arrival_time')
    .eq('rental_id', rentalId)
    .eq('counterparty_id', cp)
    .maybeSingle();
  const { data: dep } = await db
    .from('apartment_departures')
    .select('departure_date, checkout_datetime')
    .eq('rental_id', rentalId)
    .eq('tenant_id', cp)
    .maybeSingle();
  const out = dep?.checkout_datetime ? new Date(dep.checkout_datetime) : null;
  return {
    arrivalDate: t?.arrival_confirmed_date ?? t?.move_in_date ?? null,
    arrivalTime: t?.arrival_time?.slice(0, 5) ?? null,
    departureDate: dep?.departure_date ?? t?.move_out_date ?? null,
    departureTime: out
      ? out.toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
      : null,
  };
}

const SELECT =
  'id, kind, status, service_id, service_name, quantity, unit_price_cents, currency, fee_cents, billing_month, scheduled_date, start_time, end_time, guests, room, category, urgency, description, photo_paths, note, rating, rating_comment, created_at, updated_at, app_request_events(status, by_team, note, created_at)';

type Row = Record<string, unknown> & {
  app_request_events?: { status: string; by_team: boolean; note: string | null; created_at: string }[];
  photo_paths?: string[];
};

function shape(r: Row, photoUrls?: string[]) {
  const events = [...(r.app_request_events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    serviceId: r.service_id,
    serviceName: r.service_name,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    currency: r.currency,
    feeCents: r.fee_cents,
    billingMonth: r.billing_month,
    date: r.scheduled_date,
    startTime: (r.start_time as string | null)?.slice(0, 5) ?? null,
    endTime: (r.end_time as string | null)?.slice(0, 5) ?? null,
    guests: r.guests,
    room: r.room,
    category: r.category,
    urgency: r.urgency,
    description: r.description,
    note: r.note,
    photoCount: (r.photo_paths ?? []).length,
    photoUrls: photoUrls ?? [],
    rating: r.rating,
    ratingComment: r.rating_comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    events: events.map((e) => ({ status: e.status, byTeam: e.by_team, note: e.note, at: e.created_at })),
  };
}

async function list(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const rental = await rentalOf(who.cp);
  if (!rental) return json({ error: 'noRental' }, 404);

  const [{ data: catalog, error: e1 }, { data: rows, error: e2 }, gourmet, stay] = await Promise.all([
    db
      .from('app_service_catalog')
      .select('id, category, emoji, name, description, unit, price_cents, currency, lead_time_hours, allows_quantity, max_quantity')
      .eq('active', true)
      .order('sort'),
    db.from('app_requests').select(SELECT).eq('counterparty_id', who.cp).order('created_at', { ascending: false }).limit(200),
    gourmetOf(rental.apartment_id),
    stayOf(who.cp, rental.id),
  ]);
  if (e1 || e2) return json({ error: 'server' }, 500);

  return json({
    catalog: (catalog ?? []).map((c) => ({
      id: c.id,
      category: c.category,
      emoji: c.emoji,
      name: c.name,
      description: c.description,
      unit: c.unit,
      priceCents: c.price_cents,
      currency: c.currency,
      leadTimeHours: c.lead_time_hours,
      allowsQuantity: c.allows_quantity,
      maxQuantity: c.max_quantity,
    })),
    gourmet,
    stay,
    requests: (rows ?? []).map((r) => shape(r as Row)),
  });
}

async function ownRequest(cp: string, id: unknown) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db.from('app_requests').select(SELECT).eq('id', id).eq('counterparty_id', cp).maybeSingle();
  return data as Row | null;
}

async function detail(req: Request, body: { id?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const row = await ownRequest(who.cp, body.id);
  if (!row) return json({ error: 'notFound' }, 404);
  const urls: string[] = [];
  for (const path of row.photo_paths ?? []) {
    const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 600);
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  return json({ request: shape(row, urls) });
}

// ---------- escrita ----------
type CreateBody = Record<string, unknown> & { kind?: string };

async function create(req: Request, body: CreateBody) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const rental = await rentalOf(who.cp);
  if (!rental) return json({ error: 'noRental' }, 404);
  const kind = body.kind as (typeof KINDS)[number];
  if (!KINDS.includes(kind)) return json({ error: 'invalid' }, 400);

  const note = text(body.note, 500) || null;
  if (hasLink(note)) return noLinks();
  const base = { counterparty_id: who.cp, rental_id: rental.id, kind, note };
  let fields: Record<string, unknown>;

  if (kind === 'service') {
    const { data: svc } = await db
      .from('app_service_catalog')
      .select('id, name, price_cents, currency, lead_time_hours, allows_quantity, max_quantity, active')
      .eq('id', String(body.serviceId ?? ''))
      .maybeSingle();
    if (!svc || !svc.active || !isDate(body.date) || !isTime(body.time)) return json({ error: 'invalid' }, 400);
    if (bhInstant(body.date, body.time) < Date.now() + svc.lead_time_hours * 3_600_000) {
      return json({ error: 'tooSoon' }, 400);
    }
    const quantity = svc.allows_quantity ? Math.floor(Number(body.quantity)) : 1;
    if (!(quantity >= 1 && quantity <= svc.max_quantity)) return json({ error: 'invalid' }, 400);
    fields = {
      service_id: svc.id,
      service_name: svc.name,
      unit_price_cents: svc.price_cents,
      currency: svc.currency,
      quantity,
      scheduled_date: body.date,
      start_time: body.time,
      billing_month: nextMonth(body.date),
    };
  } else if (kind === 'maintenance') {
    const description = text(body.description, 1000);
    const room = text(body.room, 40);
    const photos = Array.isArray(body.photoPaths) ? body.photoPaths.map(String) : [];
    if (
      !description ||
      !room ||
      !ROOM_CATEGORIES.includes(String(body.category)) ||
      !URGENCIES.includes(String(body.urgency)) ||
      photos.length > 3 ||
      !photos.every((p) => p.startsWith(`${who.cp}/`) && !p.includes('..'))
    ) {
      return json({ error: 'invalid' }, 400);
    }
    if (hasLink(description, room)) return noLinks();
    fields = { description, room, category: body.category, urgency: body.urgency, photo_paths: photos };
  } else if (kind === 'late_checkout' || kind === 'early_checkin') {
    if (!isDate(body.date) || !isTime(body.time) || body.date < todayBH()) return json({ error: 'invalid' }, 400);
    fields = { scheduled_date: body.date, start_time: body.time };
  } else {
    const g = await gourmetOf(rental.apartment_id);
    const guests = Math.floor(Number(body.guests));
    const { date, startTime, endTime } = body as { date?: unknown; startTime?: unknown; endTime?: unknown };
    if (!g || !isDate(date) || !isTime(startTime) || !isTime(endTime) || date <= todayBH()) {
      return json({ error: 'invalid' }, 400);
    }
    const start = minutes(startTime);
    const end = minutes(endTime);
    if (
      end <= start ||
      start < minutes(g.openFrom) ||
      end > minutes(g.openUntil) ||
      end - start > g.maxHours * 60 ||
      !(guests >= 1 && guests <= g.capacity)
    ) {
      return json({ error: 'invalid' }, 400);
    }
    // O espaço é do prédio: o horário é conferido contra as reservas de TODOS os apartamentos que o dividem
    // (app_gourmet_space: building_info.gourmet.space ou o mesmo endereço) e gravado no mesmo passo, com a trava do
    // espaço e do dia (025): duas reservas ao mesmo tempo não passam juntas. null = horário ocupado.
    const { data: id, error } = await db.rpc('app_gourmet_book', {
      p_cp: who.cp,
      p_rental: rental.id,
      p_date: date,
      p_start: startTime,
      p_end: endTime,
      p_guests: guests,
      p_note: note,
    });
    if (error) return json({ error: 'server' }, 500);
    if (!id) return json({ error: 'taken' }, 409);
    const { data: booked, error: readError } = await db.from('app_requests').select(SELECT).eq('id', id).single();
    if (readError || !booked) return json({ error: 'server' }, 500);
    return json({ request: shape(booked as Row) });
  }

  const { data, error } = await db.from('app_requests').insert({ ...base, ...fields }).select(SELECT).single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ request: shape(data as Row) });
}

async function cancel(req: Request, body: { id?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const row = await ownRequest(who.cp, body.id);
  if (!row) return json({ error: 'notFound' }, 404);
  if (row.status !== 'received' && row.status !== 'scheduled') return json({ error: 'forbidden' }, 403);
  const { data, error } = await db
    .from('app_requests')
    .update({ status: 'cancelled' })
    .eq('id', row.id as string)
    .in('status', ['received', 'scheduled'])
    .select(SELECT)
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  if (!data) return json({ error: 'forbidden' }, 403);
  return json({ request: shape(data as Row) });
}

async function rate(req: Request, body: { id?: unknown; rating?: unknown; comment?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const row = await ownRequest(who.cp, body.id);
  if (!row) return json({ error: 'notFound' }, 404);
  const rating = Number(body.rating);
  if (row.status !== 'done') return json({ error: 'forbidden' }, 403);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'invalid' }, 400);
  const comment = text(body.comment, 500) || null;
  if (hasLink(comment)) return noLinks();
  const { data, error } = await db
    .from('app_requests')
    .update({ rating, rating_comment: comment })
    .eq('id', row.id as string)
    .select(SELECT)
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ request: shape(data as Row) });
}

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

async function photoUpload(req: Request, body: { contentType?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const ext = PHOTO_TYPES[String(body.contentType)];
  if (!ext) return json({ error: 'invalid' }, 400);
  const path = `${who.cp}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ path, signedUrl: data.signedUrl });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'list':
        return await list(req);
      case 'detail':
        return await detail(req, body);
      case 'create':
        return await create(req, body);
      case 'cancel':
        return await cancel(req, body);
      case 'rate':
        return await rate(req, body);
      case 'photo-upload':
        return await photoUpload(req, body);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
