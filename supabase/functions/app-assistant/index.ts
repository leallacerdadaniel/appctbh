// Supabase Edge Function "app-assistant": o assistente de IA do app (pedido de 08/11/2026).
// Responde às perguntas do aluno sobre o PRÓPRIO contrato (PDF), as regras e a cartilha, o guia de BH
// e os dados dele no app (faxinas, pagamentos, caução, pedidos, datas).
//
// Usa o mesmo token de sessão da app-api. Publicar com "Verify JWT" desligado.
// Segredos (Edge Functions → Secrets): ANTHROPIC_API_KEY (obrigatório); opcionais
// APP_ASSISTANT_MODEL (padrão claude-opus-5-5), APP_ASSISTANT_EFFORT (padrão low),
// APP_ASSISTANT_DAILY_LIMIT (perguntas por aluno por dia, padrão 30).
//
// Rota (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-assistant/ask   { messages: [{ role: 'user'|'assistant', content: string }], lang: 'fr'|'en'|'pt' }
//                        → { answer, refused }
// As perguntas e respostas não são gravadas; só o uso de tokens (app_assistant_usage).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { KNOWLEDGE } from './knowledge.ts';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MODEL = Deno.env.get('APP_ASSISTANT_MODEL') ?? 'claude-opus-5-5';
const EFFORT = (Deno.env.get('APP_ASSISTANT_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';
const DAILY_LIMIT = Number(Deno.env.get('APP_ASSISTANT_DAILY_LIMIT') ?? '30');
const MAX_TURNS = 12;
const MAX_CHARS = 1500;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const enc = new TextEncoder();
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- sessão: igual à app-api (manter as três funções iguais) ----------
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

// ---------- contexto do aluno ----------
function base64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/** PDF do contrato do aluno (o mesmo que a app-api abre), em base64; null se não houver. */
async function contractPdf(cp: string) {
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: cp });
  if (!rentalId) return null;
  const { data: k } = await db
    .from('rental_contracts')
    .select('file_path')
    .eq('rental_id', rentalId)
    .not('file_path', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!k?.file_path) return null;
  const { data: file } = await db.storage.from('rental-contracts').download(k.file_path);
  if (!file || file.size > MAX_PDF_BYTES) return null;
  return base64(new Uint8Array(await file.arrayBuffer()));
}

/** O que o app já mostra ao aluno: casa, contrato, faxinas, pagamentos, caução e pedidos. */
async function studentData(cp: string) {
  const [{ data: home }, { data: requests }] = await Promise.all([
    db.rpc('app_home_for', { p_cp: cp }),
    db
      .from('app_requests')
      .select('kind, status, service_name, quantity, unit_price_cents, scheduled_date, start_time, billing_month, created_at')
      .eq('counterparty_id', cp)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (!home) return null;
  const h = home as Record<string, unknown>;
  // A senha do Wi‑Fi o app já mostra; o resto dos dados internos fica de fora.
  const cleanings = (h.cleanings as { date: string; time: string; completed: boolean }[] | null) ?? [];
  return {
    today: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    student: h.student,
    apartment: h.apartment,
    info: h.info,
    rental: h.rental,
    tenant: h.tenant,
    roommates: h.roommates,
    payments: h.payments,
    deposit: h.deposit,
    cleanings: cleanings.map((c) => ({ date: c.date, time: c.time, done: c.completed })),
    requests: requests ?? [],
  };
}

const SYSTEM = `Você é o assistente do app da Chez Toi BH, empresa que aluga apartamentos mobiliados para estudantes estrangeiros (sobretudo da SKEMA Business School) em Belo Horizonte.

Como responder:
- Responda na língua em que o aluno escreveu (francês, inglês ou português). Texto curto e direto, sem markdown pesado: frases simples e, quando ajudar, uma lista curta.
- Use só as fontes desta conversa: o contrato do aluno (PDF, quando houver), os dados do aluno no app, e a base da Chez Toi abaixo. Quando a resposta vier do contrato, diga a cláusula ou a página.
- Se a informação não estiver nas fontes, diga que não sabe e sugira falar com a equipe da Chez Toi pelo WhatsApp (botão "Écrire à Chez Toi" no app). Não invente valores, datas, prazos nem regras.
- Não dê conselho jurídico: explique o que o contrato diz e, para disputa ou interpretação, mande falar com a equipe.
- Em emergência (saúde, segurança, incêndio, vazamento grave), mande ligar 192 (SAMU), 190 (polícia) ou 193 (bombeiros) e avisar a Chez Toi; não tente resolver pelo chat.
- Para pedir um serviço extra, uma manutenção, late checkout ou o espaço gourmet, indique a aba "Chez Toi" → "Demander" do app.

Base da Chez Toi (regras, cartilha e guia de BH):
${KNOWLEDGE}`;

type Turn = { role: 'user' | 'assistant'; content: string };

function cleanHistory(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns = raw
    .slice(-MAX_TURNS)
    .map((m) => ({
      role: (m as Turn)?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String((m as Turn)?.content ?? '').trim().slice(0, MAX_CHARS),
    }))
    .filter((m) => m.content);
  // Começa com o aluno e termina com o aluno.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;
  return turns;
}

async function usedToday(cp: string) {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await db
    .from('app_assistant_usage')
    .select('id', { count: 'exact', head: true })
    .eq('counterparty_id', cp)
    .gte('created_at', since);
  return count ?? 0;
}

async function ask(req: Request, body: { messages?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'notConfigured' }, 503);
  const history = cleanHistory(body.messages);
  if (!history) return json({ error: 'invalid' }, 400);
  if ((await usedToday(who.cp)) >= DAILY_LIMIT) return json({ error: 'limit' }, 429);

  const [pdf, data] = await Promise.all([contractPdf(who.cp), studentData(who.cp)]);
  if (!data) return json({ error: 'noRental' }, 404);

  // Ordem pensada para o cache: base fixa (system) → contrato (muda por aluno, quase nunca) →
  // dados do aluno (mudam às vezes) → conversa. Cada bloco estável leva um ponto de cache.
  const context: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (pdf) {
    context.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf },
      title: 'Contrat de location / Rental contract',
      cache_control: { type: 'ephemeral' },
    });
  }
  context.push({
    type: 'text',
    text: `Dados do aluno no app (JSON):\n${JSON.stringify(data)}${pdf ? '' : '\n\nO contrato em PDF deste aluno não está disponível no app.'}`,
  });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: [...context, { type: 'text', text: history[0].content }] },
    ...history.slice(1).map((t) => ({ role: t.role, content: t.content })),
  ];

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: EFFORT },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    const refused = response.stop_reason === 'refusal';
    const answer = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const u = response.usage;
    await db.from('app_assistant_usage').insert({
      counterparty_id: who.cp,
      model: response.model,
      input_tokens: u.input_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      with_contract: !!pdf,
      refused,
    });

    if (refused || !answer) return json({ answer: null, refused: true });
    return json({ answer, refused: false });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (error instanceof Anthropic.APIError) return json({ error: 'server' }, 502);
    return json({ error: 'server' }, 500);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  if (route === 'ask') return await ask(req, body);
  return json({ error: 'notFound' }, 404);
});
