// Supabase Edge Function "app-feedback" (onda 14): avisos e ideias do aluno para a Chez Toi (com a resposta
// da equipe, que volta ao app pelo sino), a pesquisa de satisfação no meio e no fim da estadia, e o
// "indique um amigo". Tabelas em supabase/appctbh/016_avaliacao_e_indicacao.sql. Usa o mesmo token de
// sessão da app-api. Publicar com "Verify JWT" desligado.
//
// Rotas (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-feedback/feedback       → { items: [{ id, topic, body, status, reply, repliedAt, replyRead, createdAt }] }
//   /app-feedback/feedback-send  { topic, body, lang }  → { id }   (até FEEDBACK_PER_DAY por dia)
//   /app-feedback/feedback-read  { id } ou { ids }      (marca reply_read_at das respostas da equipe)
//   /app-feedback/survey-status  → { due: 'mid' | 'end' | null, answered: ('mid' | 'end')[] }
//   /app-feedback/survey-send    { kind, nps, scores: { apartment?, cleaning?, team?, app? }, comment?, testimonialOk?, lang }
//                                → { ok: true }   (uma por tipo por locação; 'taken' se já respondida)
//   /app-feedback/referral       → { code, program: { active, reward, terms }, referrals: [{ friendFirstName, status, createdAt }] }
//                                (o código nasce na primeira chamada; do amigo só sai o primeiro nome)
//
// Janelas da pesquisa (datas de Brasília), na estadia do aluno: início da locação atual (app_rental_for) até
// o fim mais tardio entre ela e as continuações (app_rentals_for):
//   'end': de END_BEFORE_DAYS dias antes do fim até END_AFTER_DAYS dias depois, se ainda não respondida;
//   'mid': a partir de MID_SHARE da estadia e antes da janela 'end', se ainda não respondida.
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

// ---------- utilitários ----------
const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);
const langOf = (v: unknown) => (v === 'en' ? 'en' : 'fr');

/** Texto livre de várias linhas: sem caracteres de controle (menos a quebra de linha), sem linhas vazias demais. */
function text(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (s.length > max) return undefined;
  return s || null;
}

// ---------- feedback ----------
const TOPICS = ['general', 'apartment', 'cleaning', 'team', 'app', 'idea'];
const FEEDBACK_MAX = 2000;
/** Contra envio repetido por engano (ou de propósito): mensagens por aluno nas últimas 24 h. */
const FEEDBACK_PER_DAY = 10;

async function feedbackList(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db
    .from('app_feedback')
    .select('id, topic, body, status, reply, replied_at, reply_read_at, created_at')
    .eq('counterparty_id', who.cp)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return json({ error: 'server' }, 500);
  return json({
    items: (data ?? []).map((f) => {
      const reply = typeof f.reply === 'string' && f.reply.trim() ? f.reply : null;
      return {
        id: f.id,
        topic: f.topic,
        body: f.body,
        status: f.status,
        reply,
        repliedAt: reply ? f.replied_at : null,
        replyRead: !reply || !!f.reply_read_at,
        createdAt: f.created_at,
      };
    }),
  });
}

async function feedbackSend(req: Request, body: { topic?: unknown; body?: unknown; lang?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const topic = typeof body.topic === 'string' && TOPICS.includes(body.topic) ? body.topic : null;
  const message = text(body.body, FEEDBACK_MAX);
  if (!topic || !message) return json({ error: 'invalid' }, 400);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from('app_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('counterparty_id', who.cp)
    .gte('created_at', since);
  if ((count ?? 0) >= FEEDBACK_PER_DAY) return json({ error: 'limit' }, 429);

  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  const { data, error } = await db
    .from('app_feedback')
    .insert({
      counterparty_id: who.cp,
      rental_id: (rentalId as string | null) ?? null,
      topic,
      body: message,
      lang: langOf(body.lang),
    })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

async function feedbackRead(req: Request, body: { id?: unknown; ids?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).filter(isUuid).slice(0, 100);
  if (ids.length === 0) return json({ error: 'invalid' }, 400);
  const { error } = await db
    .from('app_feedback')
    .update({ reply_read_at: new Date().toISOString() })
    .eq('counterparty_id', who.cp)
    .in('id', ids)
    .not('reply', 'is', null)
    .is('reply_read_at', null);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- pesquisa de satisfação ----------
const MID_SHARE = 0.45;
const END_BEFORE_DAYS = 21;
const END_AFTER_DAYS = 30;
const SCORE_KEYS = ['apartment', 'cleaning', 'team', 'app'] as const;
type SurveyKind = 'mid' | 'end';

/** A estadia atual: a locação de app_rental_for, do início dela ao fim mais tardio entre ela e as continuações. */
async function stay(cp: string) {
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: cp });
  if (!rentalId) return null;
  const { data: ids } = await db.rpc('app_rentals_for', { p_cp: cp });
  const { data: rentals } = await db
    .from('apartment_rentals')
    .select('id, start_date, end_date')
    .in('id', (ids as string[] | null) ?? [rentalId]);
  const main = (rentals ?? []).find((r) => r.id === rentalId);
  if (!main?.start_date || !main?.end_date) return null;
  const end = (rentals ?? [])
    .map((r) => r.end_date as string | null)
    .filter((d): d is string => !!d)
    .reduce((a, b) => (b > a ? b : a), main.end_date as string);
  return { rentalId: rentalId as string, start: main.start_date as string, end };
}

/** Primeiro dia em que cada pesquisa pode ser respondida, e o último. */
function windows(s: { start: string; end: string }) {
  const length = Math.max(daysBetween(s.start, s.end), 1);
  const endOpens = addDays(s.end, -END_BEFORE_DAYS);
  return {
    mid: { opens: addDays(s.start, Math.ceil(length * MID_SHARE)), closes: addDays(endOpens, -1) },
    end: { opens: endOpens, closes: addDays(s.end, END_AFTER_DAYS) },
  };
}

async function answeredKinds(cp: string, rentalId: string) {
  const { data, error } = await db
    .from('app_surveys')
    .select('kind')
    .eq('counterparty_id', cp)
    .eq('rental_id', rentalId);
  if (error) return null;
  return [...new Set((data ?? []).map((r) => r.kind as SurveyKind))];
}

async function surveyStatus(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const s = await stay(who.cp);
  if (!s) return json({ due: null, answered: [] });
  const answered = await answeredKinds(who.cp, s.rentalId);
  if (!answered) return json({ error: 'server' }, 500);
  const w = windows(s);
  const today = todayBH();
  const open = (k: SurveyKind) => !answered.includes(k) && today >= w[k].opens && today <= w[k].closes;
  return json({ due: open('end') ? 'end' : open('mid') ? 'mid' : null, answered });
}

async function surveySend(
  req: Request,
  body: { kind?: unknown; nps?: unknown; scores?: unknown; comment?: unknown; testimonialOk?: unknown; lang?: unknown },
) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const kind = body.kind === 'mid' || body.kind === 'end' ? (body.kind as SurveyKind) : null;
  const nps = typeof body.nps === 'number' && Number.isInteger(body.nps) && body.nps >= 0 && body.nps <= 10 ? body.nps : null;
  const comment = text(body.comment, 2000);
  if (!kind || nps === null || comment === undefined) return json({ error: 'invalid' }, 400);

  const raw = body.scores && typeof body.scores === 'object' && !Array.isArray(body.scores)
    ? (body.scores as Record<string, unknown>)
    : {};
  const scores: Record<string, number> = {};
  for (const key of SCORE_KEYS) {
    const v = raw[key];
    if (v === undefined || v === null || v === 0) continue;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return json({ error: 'invalid' }, 400);
    scores[key] = v;
  }

  const s = await stay(who.cp);
  if (!s) return json({ error: 'noRental' }, 404);
  // Uma pesquisa só se responde depois que a janela dela abriu (o fim fica aberto até END_AFTER_DAYS).
  const w = windows(s);
  const today = todayBH();
  if (today < w[kind].opens) return json({ error: 'tooSoon' }, 400);
  if (kind === 'end' && today > w.end.closes) return json({ error: 'invalid' }, 400);

  const { error } = await db.from('app_surveys').insert({
    counterparty_id: who.cp,
    rental_id: s.rentalId,
    kind,
    nps,
    scores,
    comment,
    // O depoimento só vale para a pesquisa do fim e com comentário escrito.
    testimonial_ok: kind === 'end' && !!comment && body.testimonialOk === true,
    lang: langOf(body.lang),
  });
  if (error?.code === '23505') return json({ error: 'taken' }, 409);
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- indique um amigo ----------
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TRIES = 8;

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** O código do aluno; nasce na primeira vez (outro código se o sorteado já existir). */
async function codeFor(cp: string): Promise<string | null> {
  for (let i = 0; i < CODE_TRIES; i++) {
    const { data: existing, error: readError } = await db
      .from('app_referral_codes')
      .select('code')
      .eq('counterparty_id', cp)
      .maybeSingle();
    if (readError) return null;
    if (existing?.code) return existing.code as string;
    const { error } = await db.from('app_referral_codes').insert({ counterparty_id: cp, code: newCode() });
    if (!error) continue; // relê na próxima volta
    if (error.code !== '23505') return null; // 23505: código repetido (ou outra chamada criou o do aluno)
  }
  return null;
}

/** { fr, en } do painel; uma língua vazia usa a outra; as duas vazias = null (o app esconde). */
function pair(v: unknown): { fr: string; en: string } | null {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const fr = typeof o.fr === 'string' ? o.fr.trim() : '';
  const en = typeof o.en === 'string' ? o.en.trim() : '';
  if (!fr && !en) return null;
  return { fr: fr || en, en: en || fr };
}

async function referral(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const [code, { data: program, error: programError }, { data: rows, error: rowsError }] = await Promise.all([
    codeFor(who.cp),
    db.from('app_referral_program').select('active, reward, terms').maybeSingle(),
    // Privacidade: do amigo só o nome (e dele só o primeiro); nunca contato nem notas da equipe.
    db
      .from('app_referrals')
      .select('friend_name, status, created_at')
      .eq('referrer_cp', who.cp)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (!code || programError || rowsError) return json({ error: 'server' }, 500);
  return json({
    code,
    program: {
      active: program?.active ?? false,
      reward: pair(program?.reward),
      terms: pair(program?.terms),
    },
    referrals: (rows ?? []).map((r) => ({
      friendFirstName: String(r.friend_name ?? '').trim().split(/\s+/)[0] ?? '',
      status: r.status,
      createdAt: r.created_at,
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
      case 'feedback':
        return await feedbackList(req);
      case 'feedback-send':
        return await feedbackSend(req, body);
      case 'feedback-read':
        return await feedbackRead(req, body);
      case 'survey-status':
        return await surveyStatus(req);
      case 'survey-send':
        return await surveySend(req, body);
      case 'referral':
        return await referral(req);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
