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
//                        → { answer, refused, maintenance: { title, category?, room? } | null, signature }
//   - `signature` (revisão de segurança, 09/11/2026): assinatura da resposta, feita aqui e presa ao aluno. O app
//     guarda e manda de volta nas mensagens da Charlotte: { role: 'assistant', content: <answer igual>, signature }.
//     Mensagem 'assistant' sem assinatura válida é descartada (o aluno não consegue pôr frases na boca da Charlotte).
//   /app-assistant/report { answer: string, signature: string, question?: string (≤ 2000), reason?: string (≤ 300) } → { ok: true }
//     "Esta resposta está errada": vai para app_assistant_reports (021), que a equipe lê. REPORTS_PER_DAY por aluno.
//     answer é a resposta INTEIRA como veio de /ask (até 20 000 caracteres) e signature a assinatura que veio com ela:
//     sem assinatura válida → 'invalid' (ninguém denuncia uma "resposta" inventada); grava os primeiros 4 000 caracteres.
//     question e reason com link → 'links' (a resposta pode ter links: é texto da própria Charlotte).
//   - `image` só vale na ÚLTIMA mensagem do aluno (foto de um problema no apartamento); as anteriores vão
//     só em texto, com `photo: true` quando tinham foto. Base64 acima de MAX_IMAGE_B64 → erro `imageTooBig`.
//   - `maintenance`: o modelo termina a resposta com a linha [[CHAMADO: título | categoria | cômodo]] quando
//     é um problema de manutenção; a função tira a linha e devolve o título (o app mostra "Signaler à l’équipe").
// As perguntas, fotos e respostas não são gravadas; só o uso de tokens (app_assistant_usage). A cota do dia é
// reservada no banco antes de chamar o modelo (021: app_assistant_reserve) e devolvida sempre que o modelo não
// respondeu (try/finally: sem contrato, erro do banco, da API ou tempo esgotado). Revisão de 10/11/2026: contrato só o
// 'tenant'; erro do banco ao conferir a sessão responde 'server' (500), nunca 'unauthorized'; chamada ao modelo com
// limite de tempo (110 s, uma nova tentativa; o app espera 120 s).
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

import { KNOWLEDGE } from './knowledge.ts';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MODEL = Deno.env.get('APP_ASSISTANT_MODEL') ?? 'claude-opus-5-5';
const EFFORT = (Deno.env.get('APP_ASSISTANT_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';
const DAILY_LIMIT = Number(Deno.env.get('APP_ASSISTANT_DAILY_LIMIT') ?? '30');
const MAX_TURNS = 12;
/** "Esta resposta está errada" por aluno em 24 h. */
const REPORTS_PER_DAY = 20;
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
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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

// ---------- respostas assinadas: o histórico que volta do app não pode trazer falas inventadas da Charlotte ----------
let answerKey: CryptoKey | null = null;
async function getAnswerKey() {
  if (!answerKey) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-assistant-answer:${SERVICE_KEY}`));
    answerKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return answerKey;
}
/** Assinatura da resposta, presa ao aluno (a de um não vale para outro). */
async function signAnswer(cp: string, answer: string) {
  return b64url(await crypto.subtle.sign('HMAC', await getAnswerKey(), enc.encode(`${cp}\n${answer}`)));
}
async function validAnswer(cp: string, answer: string, signature: unknown) {
  if (typeof signature !== 'string' || signature.length < 20 || signature.length > 100) return false;
  try {
    return await crypto.subtle.verify('HMAC', await getAnswerKey(), fromB64url(signature), enc.encode(`${cp}\n${answer}`));
  } catch {
    return false;
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
    // rental_contracts tem duas linhas por locação: 'owner' (proprietário) e 'tenant'. Do aluno é só a 'tenant'.
    .eq('contract_type', 'tenant')
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
type RawTurn = { role?: unknown; content?: unknown; photo?: unknown; image?: unknown; signature?: unknown };
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

async function cleanHistory(
  raw: unknown,
  lang: string,
  cp: string,
): Promise<{ turns: Turn[]; image: Photo | null } | { error: 'invalid' | 'imageTooBig' }> {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'invalid' };
  const recent = raw.slice(-MAX_TURNS) as RawTurn[];
  const lastRaw = recent[recent.length - 1];
  const image = lastRaw?.role === 'user' ? cleanImage(lastRaw.image) : null;
  if (image === 'invalid' || image === 'imageTooBig') return { error: image };

  const turns: Turn[] = [];
  for (let i = 0; i < recent.length; i++) {
    const m = recent[i];
    const last = i === recent.length - 1;
    if (m?.role === 'assistant') {
      // Só respostas que esta função deu a este aluno (assinadas, texto igual); as outras somem.
      const answer = typeof m.content === 'string' ? m.content : '';
      if (!answer || !(await validAnswer(cp, answer, m.signature))) continue;
      const content = answer.trim().slice(0, MAX_CHARS);
      if (content) turns.push({ role: 'assistant', content });
      continue;
    }
    let content = String(m?.content ?? '').trim().slice(0, MAX_CHARS);
    if (last && image && !content) content = PHOTO_QUESTION[lang] ?? PHOTO_QUESTION.fr;
    // Fotos de mensagens anteriores não voltam (pedido pequeno); a resposta já falou delas.
    if (!last && m?.photo === true && content) content = `[Foto enviada nesta mensagem; não reenviada.]\n${content}`;
    if (!content) continue;
    // Duas falas do aluno seguidas (a resposta do meio caiu): viram uma só.
    const prev = turns[turns.length - 1];
    if (prev?.role === 'user') prev.content = `${prev.content}\n\n${content}`;
    else turns.push({ role: 'user', content });
  }
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

/** Reserva a pergunta na cota de 24 h (021: app_assistant_reserve, atômico): id da linha de uso, ou null se acabou. */
async function reserveUsage(cp: string) {
  const { data, error } = await db.rpc('app_assistant_reserve', { p_cp: cp, p_limit: DAILY_LIMIT });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? null;
}
/** O modelo não respondeu (sem locação, erro do banco ou da API, tempo esgotado): a pergunta volta para a cota. */
async function releaseUsage(id: number) {
  try {
    await db.from('app_assistant_usage').delete().eq('id', id);
  } catch {
    // a linha 'pending' deixa de contar sozinha depois de 10 minutos (025: app_assistant_reserve)
  }
}

async function ask(req: Request, body: { messages?: unknown; lang?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'notConfigured' }, 503);
  const cleaned = await cleanHistory(body.messages, String(body.lang ?? 'fr'), who.cp);
  if ('error' in cleaned) return json({ error: cleaned.error }, cleaned.error === 'imageTooBig' ? 413 : 400);
  const { turns: history, image } = cleaned;
  const usageId = await reserveUsage(who.cp);
  if (usageId === null) return json({ error: 'limit' }, 429);
  // Daqui em diante a linha reservada sempre termina: gravada com o uso quando o modelo respondeu, apagada em
  // qualquer outro caminho (return antes da chamada, exceção em contractPdf/studentData, erro da API).
  let answered = false;
  try {
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

    // O app espera 120 s: 110 s por tentativa e uma nova tentativa no máximo (o padrão do SDK são 10 min e 2).
    const client = new Anthropic({ timeout: 110_000, maxRetries: 1 });
    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: EFFORT },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages,
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
      if (error instanceof Anthropic.APIError) return json({ error: 'server' }, 502);
      throw error;
    }
    // O modelo respondeu: a pergunta conta na cota, mesmo que a gravação do uso abaixo falhe.
    answered = true;

    const refused = response.stop_reason === 'refusal';
    const { answer, maintenance } = splitMaintenance(
      response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n'),
    );

    const u = response.usage;
    await db
      .from('app_assistant_usage')
      .update({
        model: response.model,
        input_tokens: u.input_tokens ?? 0,
        cache_read_tokens: u.cache_read_input_tokens ?? 0,
        cache_write_tokens: u.cache_creation_input_tokens ?? 0,
        output_tokens: u.output_tokens ?? 0,
        with_contract: !!pdf,
        refused,
      })
      .eq('id', usageId);

    if (refused || !answer) return json({ answer: null, refused: true, maintenance: null, signature: null });
    return json({ answer, refused: false, maintenance, signature: await signAnswer(who.cp, answer) });
  } finally {
    if (!answered) await releaseUsage(usageId);
  }
}

/** Texto opcional: null quando não veio, undefined quando veio errado (tipo ou tamanho). */
function optionalText(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length > max ? undefined : s || null;
}

/** Tamanho máximo da resposta conferida no report (a resposta inteira, como veio de /ask) e do que é gravado. */
const REPORT_CHECK_MAX = 20_000;
const REPORT_STORE_MAX = 4000;

/**
 * "Esta resposta está errada": a equipe lê no painel (app_assistant_reports). Só respostas que a Charlotte deu a
 * este aluno: o texto inteiro e a assinatura que veio com ele em /ask.
 */
async function report(req: Request, body: { answer?: unknown; signature?: unknown; question?: unknown; reason?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const full = typeof body.answer === 'string' ? body.answer : '';
  const question = optionalText(body.question, 2000);
  const reason = optionalText(body.reason, 300);
  if (!full.trim() || full.length > REPORT_CHECK_MAX || question === undefined || reason === undefined) {
    return json({ error: 'invalid' }, 400);
  }
  if (!(await validAnswer(who.cp, full, body.signature))) return json({ error: 'invalid' }, 400);
  // A resposta pode ter links (é texto da Charlotte); o que o aluno escreveu, não.
  if (hasLink(question, reason)) return noLinks();
  const { data: slot, error: limitError } = await db.rpc('app_rate_take', {
    p_bucket: 'assistant_report',
    p_keys: [who.cp],
    p_limits: [REPORTS_PER_DAY],
    p_window_seconds: 86_400,
  });
  if (limitError) return json({ error: 'server' }, 500);
  if (!slot) return json({ error: 'limit' }, 429);
  const answer = full.trim().slice(0, REPORT_STORE_MAX);
  const { error } = await db.from('app_assistant_reports').insert({ counterparty_id: who.cp, answer, question, reason });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    if (route === 'ask') return await ask(req, body);
    if (route === 'report') return await report(req, body);
    return json({ error: 'notFound' }, 404);
  } catch (e) {
    if (e instanceof AccessEnded) return json({ error: 'accessEnded' }, 403);
    return json({ error: 'server' }, 500);
  }
});
