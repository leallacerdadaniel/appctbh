// Supabase Edge Function "app-events": a agenda "o que rola em BH" para o app (leitura).
// Os eventos são gravados pela app-events-sync (supabase/appctbh/013_agenda_bh.sql). Usa o mesmo token de
// sessão da app-api. Publicar com "Verify JWT" desligado.
//
// Rotas (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-events/list  { category?: 'show'|'party'|'exhibition'|'theatre'|'festival'|'other', days?: 1..60 }
//                     → { events: [{ id, title, venue, neighborhood, startsAt, endsAt, timeKnown, url, imageUrl,
//                                    category, priceMin, priceMax, isFree, source, sourceName }] }
// Títulos como publicados na fonte (nomes próprios). Sem descrição em português: o app mostra só os fatos.
// TODO(IA): resumo de uma linha em FR/EN pelo Claude quando houver ANTHROPIC_API_KEY no appctbh.
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

const CATEGORIES = ['show', 'party', 'exhibition', 'theatre', 'festival', 'other'];

type Row = {
  id: string;
  source: string;
  source_name: string;
  title: string;
  venue: string | null;
  neighborhood: string | null;
  starts_at: string;
  ends_at: string | null;
  time_known: boolean;
  url: string | null;
  image_url: string | null;
  category: string;
  price_min: number | string | null;
  price_max: number | string | null;
  is_free: boolean | null;
};

async function list(req: Request, body: { category?: unknown; days?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const category = typeof body.category === 'string' && CATEGORIES.includes(body.category) ? body.category : null;
  const days = Math.min(Math.max(Math.floor(Number(body.days) || 30), 1), 60);
  const { data, error } = await db.rpc('app_bh_events_next', { p_days: days, p_category: category });
  if (error) return json({ error: 'server' }, 500);
  const num = (v: number | string | null) => (v == null ? null : Number(v));
  return json({
    events: ((data ?? []) as Row[]).map((e) => ({
      id: e.id,
      title: e.title,
      venue: e.venue,
      neighborhood: e.neighborhood,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      timeKnown: e.time_known,
      url: e.url,
      imageUrl: e.image_url,
      category: e.category,
      priceMin: num(e.price_min),
      priceMax: num(e.price_max),
      isFree: e.is_free,
      source: e.source,
      sourceName: e.source_name,
    })),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'list':
        return await list(req, body);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
