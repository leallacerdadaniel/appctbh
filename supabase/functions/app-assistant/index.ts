// Supabase Edge Function "app-assistant": Charlotte, a assistente de IA do app (pedido de 08/11/2026).
// Responde às perguntas do aluno sobre o PRÓPRIO contrato (PDF), as regras e a cartilha, o guia de BH
// e os dados dele no app (faxinas, pagamentos, caução, pedidos, datas).
//
// Usa o mesmo token de sessão da app-api. Publicar com "Verify JWT" desligado.
// Segredos (Edge Functions → Secrets): ANTHROPIC_API_KEY (obrigatório); opcionais
// APP_ASSISTANT_MODEL (padrão claude-opus-5-5), APP_ASSISTANT_EFFORT (padrão low),
// APP_ASSISTANT_DAILY_LIMIT (perguntas por aluno por dia, padrão 30).
//
// Rota (POST, JSON, Authorization: Bearer <token da app-api>):
//   /app-assistant/ask   { messages: [{ role: 'user'|'assistant', content: string, photo?: true,
//                                      image?: { mediaType: 'image/jpeg'|'image/png'|'image/webp', data: <base64> } }],
//                          lang: 'fr'|'en'|'pt' }
//                        → { answer, refused, maintenance: { title, category?, room? } | null }
//   - `image` só vale na ÚLTIMA mensagem do aluno (foto de um problema no apartamento); as anteriores vão
//     só em texto, com `photo: true` quando tinham foto. Base64 acima de MAX_IMAGE_B64 → erro `imageTooBig`.
//   - `maintenance`: o modelo termina a resposta com a linha [[CHAMADO: título | categoria | cômodo]] quando
//     é um problema de manutenção; a função tira a linha e devolve o título (o app mostra "Signaler à l’équipe").
// As perguntas, fotos e respostas não são gravadas; só o uso de tokens (app_assistant_usage).
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
/** Foto em base64 (o app manda JPEG de 1280 px, ~150–400 KB); acima disto, `imageTooBig`. */
const MAX_IMAGE_B64 = 2 * 1024 * 1024;
/** Tipos aceitos e o começo do base64 de cada um (assinatura do arquivo), para não confiar só no rótulo. */
const IMAGE_SIGNATURES = { 'image/jpeg': '/9j/', 'image/png': 'iVBORw0KGgo', 'image/webp': 'UklGR' } as const;
type ImageType = keyof typeof IMAGE_SIGNATURES;
/** Os mesmos valores do formulário de manutenção do app (requests/maintenance.tsx). */
const CATEGORIES = ['plumbing', 'electrical', 'appliance', 'furniture', 'internet', 'other'];
const ROOMS = ['kitchen', 'bathroom', 'bedroom', 'living', 'laundry', 'other'];
/** Pergunta usada quando a foto chega sem texto (o app já manda uma, isto é só a rede de segurança). */
const PHOTO_QUESTION: Record<string, string> = {
  fr: 'Qu’est-ce qui ne va pas ?',
  en: 'What’s wrong here?',
  pt: 'O que há de errado aqui?',
};

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

const SYSTEM = `Você é Charlotte, a assistente do app da Chez Toi BH, empresa que aluga apartamentos mobiliados para estudantes estrangeiros (sobretudo da SKEMA Business School) em Belo Horizonte.

Quem você é:
- Você se chama Charlotte e é a assistente da Chez Toi BH, uma IA. Apresente-se assim quando fizer sentido: na primeira resposta da conversa ou quando o aluno perguntar quem você é. Nunca finja ser uma pessoa da equipe; para falar com alguém da equipe, o aluno usa o WhatsApp.
- Tom caloroso, curto e prático. Use o primeiro nome do aluno (está nos dados do aluno) de vez em quando, sem exagero.
- Ser a Charlotte não muda nenhuma das regras abaixo.

Como responder:
- Responda na língua em que o aluno escreveu: francês ou inglês (o app é bilíngue). Se ele escrever em português, responda em português. Texto curto e direto, sem markdown pesado: frases simples e, quando ajudar, uma lista curta.
- Use só as fontes desta conversa: o contrato do aluno (PDF, quando houver), os dados do aluno no app, e a base da Chez Toi abaixo. Quando a resposta vier do contrato, diga a cláusula ou a página.
- Exceção, ajuda com o português: você pode traduzir uma frase para o português do Brasil, dar uma dica simples de pronúncia para quem fala francês (ou inglês) e dizer quando usar a frase (formal ou informal, com quem). Isso vale mesmo fora da base da Chez Toi, mas só para ajuda com a língua, não para conhecimento geral. Exemplo de pedido: "Comment dit-on « … » en portugais du Brésil ?" → a frase em português, a pronúncia aproximada e, se ajudar, quando usar.
- Se a informação não estiver nas fontes, diga que não sabe e sugira falar com a equipe da Chez Toi pelo WhatsApp (botão "Écrire à Chez Toi", em inglês "Message Chez Toi", no app). Não invente valores, datas, prazos nem regras.
- Não dê conselho jurídico: explique o que o contrato diz e, para disputa ou interpretação, mande falar com a equipe.
- Em emergência (saúde, segurança, incêndio, vazamento grave), mande ligar 192 (SAMU), 190 (polícia) ou 193 (bombeiros) e avisar a Chez Toi; não tente resolver pelo chat.
- Onde fica cada coisa no app (abas embaixo, use o nome na língua do aluno): "Accueil" / "Home"; "Explorer" / "Explore" (o guia de BH); no meio, o botão vermelho da Charlotte (esta conversa); "Maison" / "House" (a vida na casa: o apartamento, os colegas, as faxinas e as tarefas); "Séjour" / "My stay" (pedidos, pagamentos e contrato).
- Para pedir um serviço extra, late checkout ou o espaço gourmet, indique a aba "Séjour" → "Demander" (em inglês "My stay" → "Ask").

Fotos de um problema no apartamento:
- Diga em poucas frases o que provavelmente está acontecendo. Se a foto não deixar claro, diga o que você vê e peça um detalhe.
- Sugira só verificações seguras, que qualquer pessoa faz sem ferramenta. Nunca mande abrir, desmontar ou mexer por dentro em nada elétrico (chuveiro, tomada, interruptor, fios, quadro de luz) nem no gás. Exemplo, chuveiro elétrico que não esquenta: conferir a chave verão/inverno (ou a temperatura) do chuveiro; ver no quadro de luz se o disjuntor do chuveiro desarmou e religar uma vez só, com as mãos secas (se desarmar de novo, parar); conferir se a água sai com força (com pouca água o chuveiro não esquenta).
- Diga claramente quando parar e chamar a equipe: cheiro de queimado, faísca, fio aparecendo, choque, água perto de eletricidade, vazamento, mofo, algo quebrado, ou se a verificação simples não resolveu. O conserto é sempre da equipe da Chez Toi; nunca peça ao aluno para consertar.
- Em perigo (fumaça, fogo, cheiro de gás, choque), mande se afastar, ligar 193 (bombeiros) e depois avisar a Chez Toi.
- Responda na língua do aluno, como no resto da conversa.

Chamado de manutenção (com ou sem foto):
- Quando for um problema de manutenção do apartamento (algo quebrado, com defeito, vazando ou que não funciona), termine a resposta com uma única linha neste formato exato, sem nada depois:
[[CHAMADO: <título curto do problema, na língua do aluno> | <categoria> | <cômodo>]]
  categoria: plumbing, electrical, appliance, furniture, internet ou other. cômodo: kitchen, bathroom, bedroom, living, laundry ou other.
  Exemplo: [[CHAMADO: La douche électrique ne chauffe plus | electrical | bathroom]]
- O app esconde essa linha e mostra logo abaixo da resposta o botão "Signaler à l’équipe" (em inglês "Report to the team"), que abre o pedido de manutenção já preenchido com a foto. Diga ao aluno para tocar nesse botão.
- Não use essa linha para dúvidas, regras, pagamentos nem pedidos de serviço extra.

Base da Chez Toi (regras, cartilha e guia de BH):
${KNOWLEDGE}`;

type Turn = { role: 'user' | 'assistant'; content: string };
type RawTurn = { role?: unknown; content?: unknown; photo?: unknown; image?: unknown };
type Photo = { media_type: ImageType; data: string };

/** A foto da última mensagem: tipo aceito, assinatura igual ao tipo, base64 válido e não grande demais. */
function cleanImage(raw: unknown): Photo | 'invalid' | 'imageTooBig' | null {
  if (raw == null) return null;
  const { mediaType, data } = raw as { mediaType?: unknown; data?: unknown };
  if (typeof data !== 'string' || typeof mediaType !== 'string' || !(mediaType in IMAGE_SIGNATURES)) return 'invalid';
  const b64 = data.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  if (b64.length > MAX_IMAGE_B64) return 'imageTooBig';
  const type = mediaType as ImageType;
  if (!b64.startsWith(IMAGE_SIGNATURES[type]) || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return 'invalid';
  return { media_type: type, data: b64 };
}

function cleanHistory(
  raw: unknown,
  lang: string,
): { turns: Turn[]; image: Photo | null } | { error: 'invalid' | 'imageTooBig' } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'invalid' };
  const recent = raw.slice(-MAX_TURNS) as RawTurn[];
  const lastRaw = recent[recent.length - 1];
  const image = lastRaw?.role === 'user' ? cleanImage(lastRaw.image) : null;
  if (image === 'invalid' || image === 'imageTooBig') return { error: image };

  const turns = recent
    .map((m, i) => {
      const role = m?.role === 'assistant' ? ('assistant' as const) : ('user' as const);
      let content = String(m?.content ?? '').trim().slice(0, MAX_CHARS);
      const last = i === recent.length - 1;
      if (last && image && !content) content = PHOTO_QUESTION[lang] ?? PHOTO_QUESTION.fr;
      // Fotos de mensagens anteriores não voltam (pedido pequeno); a resposta já falou delas.
      if (role === 'user' && !last && m?.photo === true && content) content = `[Foto enviada nesta mensagem; não reenviada.]\n${content}`;
      return { role, content };
    })
    .filter((m) => m.content);
  // Começa com o aluno e termina com o aluno.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return { error: 'invalid' };
  return { turns, image };
}

/** Tira a linha [[CHAMADO: título | categoria | cômodo]] da resposta e devolve o que ela diz. */
function splitMaintenance(text: string) {
  const found: string[] = [];
  const answer = text
    .replace(/\[\[\s*CHAMADO\s*:\s*([^\]\n]*?)\s*\]\]/gi, (_, inner: string) => {
      found.push(inner);
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const [title = '', category = '', room = ''] = (found.at(-1) ?? '').split('|').map((s) => s.trim());
  if (!title) return { answer, maintenance: null };
  return {
    answer,
    maintenance: {
      title: title.slice(0, 120),
      ...(CATEGORIES.includes(category) ? { category } : {}),
      ...(ROOMS.includes(room) ? { room } : {}),
    },
  };
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

async function ask(req: Request, body: { messages?: unknown; lang?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'notConfigured' }, 503);
  const cleaned = cleanHistory(body.messages, String(body.lang ?? 'fr'));
  if ('error' in cleaned) return json({ error: cleaned.error }, cleaned.error === 'imageTooBig' ? 413 : 400);
  const { turns: history, image } = cleaned;
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

  // A foto (se houver) vai na última mensagem do aluno, antes do texto dela, depois dos pontos de cache.
  const photo: Anthropic.Beta.BetaContentBlockParam[] = image
    ? [{ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } }]
    : [];
  const lastIndex = history.length - 1;
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t, i) => {
    const blocks = [...(i === 0 ? context : []), ...(i === lastIndex ? photo : [])];
    return blocks.length
      ? { role: t.role, content: [...blocks, { type: 'text' as const, text: t.content }] }
      : { role: t.role, content: t.content };
  });

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
    const { answer, maintenance } = splitMaintenance(
      response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n'),
    );

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

    if (refused || !answer) return json({ answer: null, refused: true, maintenance: null });
    return json({ answer, refused: false, maintenance });
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
