// Supabase Edge Function "app-events-sync": a agenda "o que rola em BH" (pedido do dono em 09/11/2026).
// Publicar com "Verify JWT" desligado: quem chama prova que pode mandando o segredo do Vault no cabeçalho
// x-sync-secret (só o banco o tem: pg_cron e o gatilho dos links, ver supabase/appctbh/013_agenda_bh.sql).
//
// POST {}              → lê as fontes automáticas + os links pendentes, grava, apaga o que acabou há mais de 7 dias
// POST { linkId }      → lê só aquele link colado pela equipe (o gatilho chama na hora)
//
// O que cada fonte permite (docs/pesquisa/agenda-bh.md, seção 7):
//   pbh_dados_abertos  API CKAN da prefeitura, conjunto "Eventos Autorizados" (CC-BY)
//   ccbb_bh            sitemap da programação de BH + OpenGraph de cada página (só quando o lastmod muda)
//   palacio_das_artes  agenda da página inicial (data AAAAMMDD) + API WordPress "evento" + preço na página (1x)
//   link               curadoria: a equipe cola o link (Sympla, 2LIV, Raro, Belotur...) e o robô lê só aquela página
// Regras: respeitar o robots.txt, User-Agent identificado (sem e-mail pessoal), uma leitura por página por dia,
// título como publicado, sempre com o nome da fonte e o link para ela.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const UA = 'ChezToiBH-Agenda/1.0 (+contact via chez toi bh)';
const UA_TOKEN = 'cheztoibh-agenda';
const DAY = 86_400_000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Category = 'show' | 'party' | 'exhibition' | 'theatre' | 'festival' | 'other';
type EventRow = {
  source: 'ccbb_bh' | 'palacio_das_artes' | 'pbh_dados_abertos' | 'link';
  source_name: string;
  external_id: string;
  link_id: string | null;
  title: string;
  venue: string | null;
  neighborhood: string | null;
  starts_at: string;
  ends_at: string | null;
  time_known: boolean;
  url: string | null;
  image_url: string | null;
  category: Category;
  price_text: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean | null;
  fetched_at: string;
};
type Report = { read: number; saved: number; skipped: string[]; error?: string };

// ---------- texto ----------
const ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»',
};
function decode(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const clean = (s: string | null | undefined) =>
  s ? decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() || null : null;
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** <meta property|name="key" content="..."> in any attribute order. */
function meta(html: string, key: string) {
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content != null) return clean(content);
  }
  return null;
}

// ---------- datas (BH = UTC-3, sem horário de verão) ----------
const pad = (n: number) => String(n).padStart(2, '0');
const bhDate = (y: number, m: number, d: number, h = 0, min = 0) =>
  `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00-03:00`;
const validDate = (iso: string) => !isNaN(Date.parse(iso));
const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------- preço ----------
function prices(text: string | null) {
  if (!text) return { min: null, max: null, free: null as boolean | null };
  const values = [...text.matchAll(/R\$\s*(\d{1,4}(?:\.\d{3})*(?:,\d{1,2})?)/g)]
    .map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((n) => n > 0 && n < 20000);
  const free = /gratuit|gr[aá]tis|entrada franca|entrada livre/i.test(text);
  if (!values.length) return { min: null, max: null, free: free ? true : null };
  return { min: Math.min(...values), max: Math.max(...values), free: false };
}

function categoryFromText(text: string): Category {
  const t = normalize(text);
  if (/\b(festa|baile|balada|party|rave|open bar|after|micareta|bloco)\b/.test(t)) return 'party';
  if (/\b(festival|feira|virada|arraial)\b/.test(t)) return 'festival';
  if (/\b(exposicao|exposicoes|mostra|expo|museu|galeria|artes visuais)\b/.test(t)) return 'exhibition';
  if (/\b(teatro|espetaculo|danca|stand.?up|comedia|humor|circo|opera|artes cenicas|musical)\b/.test(t)) return 'theatre';
  if (/\b(show|shows|musica|concerto|orquestra|turne|tour|samba|pagode|sertanejo|jazz|rock|funk|dj)\b/.test(t)) return 'show';
  return 'other';
}

// ---------- leitura educada: robots.txt + uma vez por página por dia ----------
const robotsCache = new Map<string, { allow: boolean; path: string }[]>();

async function robotsRules(origin: string) {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let rules: { allow: boolean; path: string }[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    if (res.status >= 500) {
      // servidor fora do ar: na dúvida, não lê nada deste site hoje
      rules = [{ allow: false, path: '/' }];
    } else if (res.ok) {
      const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
      let current: (typeof groups)[number] | null = null;
      let lastWasAgent = false;
      for (const raw of (await res.text()).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, '').trim();
        const i = line.indexOf(':');
        if (i < 0) continue;
        const key = line.slice(0, i).trim().toLowerCase();
        const value = line.slice(i + 1).trim();
        if (key === 'user-agent') {
          if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
          current.agents.push(value.toLowerCase());
          lastWasAgent = true;
        } else {
          lastWasAgent = false;
          if (current && (key === 'allow' || key === 'disallow') && value) {
            current.rules.push({ allow: key === 'allow', path: value });
          }
        }
      }
      const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && UA_TOKEN.startsWith(a)));
      rules = (mine.length ? mine : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
    }
  } catch {
    rules = [{ allow: false, path: '/' }];
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function robotsAllow(url: URL) {
  const target = url.pathname + url.search;
  let best: { allow: boolean; length: number } = { allow: true, length: -1 };
  for (const rule of await robotsRules(url.origin)) {
    const anchored = rule.path.endsWith('$');
    const body = (anchored ? rule.path.slice(0, -1) : rule.path).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    if (!new RegExp(`^${body}${anchored ? '$' : ''}`).test(target)) continue;
    const length = rule.path.length;
    if (length > best.length || (length === best.length && rule.allow)) best = { allow: rule.allow, length };
  }
  return best.allow;
}

/** Só http(s) em nome de domínio público (os links vêm da equipe, mas nada de rede interna). */
function publicUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.username || u.password || (u.port && !['80', '443'].includes(u.port))) return null;
    if (!host.includes('.') || host.includes(':') || /^[\d.]+$/.test(host)) return null;
    if (/(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host) || host.endsWith('.supabase.co')) return null;
    return u;
  } catch {
    return null;
  }
}

type Fetched = { ok: true; text: string; url: string } | { ok: false; reason: string };

/**
 * Lê uma página respeitando o robots.txt e a regra "uma vez por dia" (app_bh_source_pages).
 * `lastModified`: só lê de novo quando o lastmod do sitemap muda. `force`: link que a equipe acabou de colar/corrigir.
 */
async function politeFetch(
  raw: string,
  source: string,
  opts: { lastModified?: string | null; force?: boolean; minHours?: number } = {},
): Promise<Fetched> {
  let url = publicUrl(raw);
  if (!url) return { ok: false, reason: 'url' };
  const key = url.toString();
  if (!opts.force) {
    const { data: seen } = await db.from('app_bh_source_pages').select('fetched_at, last_modified').eq('url', key).maybeSingle();
    if (seen) {
      if (opts.lastModified && seen.last_modified === opts.lastModified) return { ok: false, reason: 'unchanged' };
      if (Date.now() - Date.parse(seen.fetched_at) < (opts.minHours ?? 20) * 3_600_000) return { ok: false, reason: 'recent' };
    }
  }
  let res: Response | null = null;
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!(await robotsAllow(url))) return { ok: false, reason: 'robots' };
      res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.5' },
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
      });
      const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!next) break;
      const target = publicUrl(new URL(next, url).toString());
      if (!target) return { ok: false, reason: 'redirect' };
      url = target;
    }
  } catch {
    res = null;
  }
  await db.from('app_bh_source_pages').upsert({
    url: key,
    source,
    last_modified: opts.lastModified ?? null,
    http_status: res?.status ?? null,
    fetched_at: new Date().toISOString(),
  });
  if (!res) return { ok: false, reason: 'network' };
  if (!res.ok) return { ok: false, reason: `http ${res.status}` };
  const text = await res.text();
  return { ok: true, text: text.length > 4_000_000 ? text.slice(0, 4_000_000) : text, url: url.toString() };
}

async function save(rows: EventRow[]) {
  if (!rows.length) return 0;
  // Nunca mandar "hidden": a escolha da equipe fica.
  const { error } = await db.from('app_bh_events').upsert(rows, { onConflict: 'source,external_id' });
  if (error) throw new Error(error.message);
  return rows.length;
}

// ---------- 1. Dados abertos da PBH (CKAN, CC-BY): "Eventos Autorizados" ----------
const CKAN = 'https://dados.pbh.gov.br/api/3/action';
const PUBLIC_PLACES = /logradouro|parque|im[oó]veis p[uú]blicos|pra[cç]a/i;
const OK_STATUS = /evento autorizado|reserva confirmada/i;
const SPORT = /\b(corrida|run|caminhada|maratona|meia maratona|pedal|ciclismo|volta internacional|triathlon|desafio)\b/i;

async function syncPbh(now: string): Promise<Report> {
  const report: Report = { read: 0, saved: 0, skipped: [] };
  const pkg = await politeFetch(`${CKAN}/package_show?id=eventos-autorizados`, 'pbh_dados_abertos');
  if (!pkg.ok) return { ...report, skipped: [`package_show: ${pkg.reason}`] };
  report.read++;
  const resources = (JSON.parse(pkg.text)?.result?.resources ?? []) as {
    id: string;
    format?: string;
    datastore_active?: boolean;
    created?: string;
  }[];
  const latest = resources
    .filter((r) => r.datastore_active && /csv/i.test(r.format ?? ''))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))[0];
  if (!latest) return { ...report, skipped: ['sem CSV no datastore'] };

  const fields = 'ID_EVENTO_LICENCIAMENTO,NOME_EVENTO,SITUACAO_LICENCA_PUBLICO,LOCALIDADE_EVENTO,BAIRRO,DATA_HORA_INICIO_DT,DATA_HORA_FIM_DT';
  const list = await politeFetch(
    `${CKAN}/datastore_search?resource_id=${latest.id}&limit=300&sort=DATA_HORA_INICIO_DT%20desc&fields=${fields}`,
    'pbh_dados_abertos',
  );
  if (!list.ok) return { ...report, skipped: [`datastore_search: ${list.reason}`] };
  report.read++;
  const records = (JSON.parse(list.text)?.result?.records ?? []) as Record<string, string | null>[];
  const from = Date.now() - DAY;
  const until = Date.now() + 60 * DAY;
  const rows: EventRow[] = [];
  for (const r of records) {
    const name = clean(r.NOME_EVENTO);
    const start = (r.DATA_HORA_INICIO_DT ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!name || !start || !r.ID_EVENTO_LICENCIAMENTO) continue;
    const startsAt = bhDate(+start[1], +start[2], +start[3], +start[4], +start[5]);
    const t = Date.parse(startsAt);
    if (t < from || t > until) continue;
    if (!OK_STATUS.test(r.SITUACAO_LICENCA_PUBLICO ?? '') || !PUBLIC_PLACES.test(r.LOCALIDADE_EVENTO ?? '')) continue;
    if (SPORT.test(normalize(name))) continue;
    const end = (r.DATA_HORA_FIM_DT ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    const endsAt = end ? bhDate(+end[1], +end[2], +end[3], +end[4], +end[5]) : null;
    rows.push({
      source: 'pbh_dados_abertos',
      source_name: 'Prefeitura de BH (dados abertos)',
      external_id: String(r.ID_EVENTO_LICENCIAMENTO),
      link_id: null,
      title: name,
      venue: null,
      neighborhood: clean(r.BAIRRO),
      starts_at: startsAt,
      ends_at: endsAt && Date.parse(endsAt) >= t ? endsAt : null,
      time_known: true,
      url: null,
      image_url: null,
      category: categoryFromText(name),
      price_text: null,
      price_min: null,
      price_max: null,
      is_free: null,
      fetched_at: now,
    });
  }
  report.saved = await save(rows);
  return report;
}

// ---------- 2. CCBB Belo Horizonte: sitemap + OpenGraph ----------
const CCBB_LABELS: [RegExp, Category][] = [
  [/^artes c[eê]nicas/i, 'theatre'],
  [/^exposi[cç][aã]o/i, 'exhibition'],
  [/^m[uú]sica/i, 'show'],
  [/^festival/i, 'festival'],
];

async function syncCcbb(now: string): Promise<Report> {
  const report: Report = { read: 0, saved: 0, skipped: [] };
  const sitemap = await politeFetch('https://ccbb.com.br/programacao-bh-sitemap.xml', 'ccbb_bh');
  if (!sitemap.ok) return { ...report, skipped: [`sitemap: ${sitemap.reason}`] };
  report.read++;
  const entries = [...sitemap.text.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)]
    .map((m) => ({ loc: decode(m[1].trim()), lastmod: m[2]?.trim() ?? null }))
    .filter((e) => /^https:\/\/ccbb\.com\.br\/belo-horizonte\/programacao\/[^/]+\/$/.test(e.loc));

  const rows: EventRow[] = [];
  for (const { loc, lastmod } of entries) {
    const page = await politeFetch(loc, 'ccbb_bh', { lastModified: lastmod });
    if (!page.ok) {
      if (page.reason !== 'unchanged' && page.reason !== 'recent') report.skipped.push(`${loc}: ${page.reason}`);
      continue;
    }
    report.read++;
    const title = meta(page.text, 'og:title')?.replace(/\s*[-–|]\s*CCBB\s*$/i, '').trim();
    const description = meta(page.text, 'og:description') ?? '';
    const dates = description.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s*(?:a|até|-|–)\s*(\d{2})\/(\d{2})\/(\d{2,4}))?/);
    if (!title || !dates) {
      report.skipped.push(`${loc}: sem título ou data`);
      continue;
    }
    // A descrição começa pelos fatos ("Artes Cênicas Karamazovianas 06/11/26 a 07/12/26 ... R$30,00 (inteira)")
    // e depois vem o texto de divulgação, que não usamos.
    const head = description.split(/\s(?=(?:Entre|No dia|Nos dias|A partir|O CCBB|Com|Em|Na|No|A|O)\s+[a-zà-ú])/)[0];
    const year = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));
    const single = !dates[4];
    const time = single ? head.match(/\bàs\s+(\d{1,2})h(\d{2})?/i) : null;
    const startsAt = bhDate(year(dates[3]), +dates[2], +dates[1], time ? +time[1] : 0, time?.[2] ? +time[2] : 0);
    const endsAt = single ? null : bhDate(year(dates[6]), +dates[5], +dates[4], 23, 59);
    if (!validDate(startsAt) || (endsAt && !validDate(endsAt))) continue;
    // Acabou há mais de 7 dias: nem grava (a limpeza apagaria).
    if (Date.parse(endsAt ?? startsAt) < Date.now() - 7 * DAY) continue;
    const p = prices(head);
    const priceText = head.match(/R\$\s?[\d.,]+(?:\s*\([^)]*\))?(?:\s*(?:e|,|\/)\s*R\$\s?[\d.,]+(?:\s*\([^)]*\))?)*/)?.[0];
    const slug = loc.replace(/\/$/, '').split('/').pop()!;
    rows.push({
      source: 'ccbb_bh',
      source_name: 'CCBB BH',
      external_id: slug,
      link_id: null,
      title,
      venue: 'CCBB Belo Horizonte',
      neighborhood: 'Funcionários',
      starts_at: startsAt,
      ends_at: endsAt,
      time_known: !!time,
      url: loc,
      image_url: meta(page.text, 'og:image'),
      category: CCBB_LABELS.find(([re]) => re.test(description))?.[1] ?? categoryFromText(`${title} ${head}`),
      price_text: priceText ?? (p.free ? 'Gratuito' : null),
      price_min: p.min,
      price_max: p.max,
      is_free: p.free,
      fetched_at: now,
    });
  }
  report.saved = await save(rows);
  return report;
}

// ---------- 3. Palácio das Artes (Fundação Clóvis Salgado) ----------
const FCS = 'https://fcs.mg.gov.br';

function fcsCategory(slugs: string[]): Category {
  if (slugs.some((s) => /musica|concerto/.test(s))) return 'show';
  if (slugs.some((s) => /teatro|danca|opera/.test(s))) return 'theatre';
  if (slugs.some((s) => /artes_visuais|exposic/.test(s))) return 'exhibition';
  if (slugs.some((s) => /festival/.test(s))) return 'festival';
  return 'other';
}

/** "dia 21 de novembro, às 20h30" / "20 a 29 de novembro" no texto, só quando bate com a data estruturada. */
function fcsDetails(text: string, y: number, m: number, d: number) {
  const t = normalize(text);
  const month = MONTHS[m - 1];
  const range = t.match(new RegExp(`\\b0?${d}\\s+a\\s+(\\d{1,2})\\s+de\\s+${month}\\b`));
  const at = t.match(new RegExp(`\\b0?${d}(?:º|o)?\\s+de\\s+${month}(?:\\s+de\\s+${y})?[^.;]{0,40}?\\bas\\s+(\\d{1,2})h(\\d{2})?`));
  const end = range && +range[1] > d ? bhDate(y, m, +range[1], 23, 59) : null;
  return { end, hour: !end && at ? +at[1] : null, minute: !end && at?.[2] ? +at[2] : 0 };
}

async function syncFcs(now: string): Promise<Report> {
  const report: Report = { read: 0, saved: 0, skipped: [] };
  const home = await politeFetch(`${FCS}/`, 'palacio_das_artes');
  if (!home.ok) return { ...report, skipped: [`página inicial: ${home.reason}`] };
  report.read++;
  const html = home.text;

  // Cada cartão da agenda: <div class="... e-loop-item e-loop-item-<id> post-<id> evento ... categoria_evento-x">
  const starts = [...html.matchAll(/<div[^>]*class="[^"]*\be-loop-item e-loop-item-(\d+) post-\d+ evento\b([^"]*)"/g)];
  const items = new Map<string, { title: string; link: string; date: string; categories: string[]; image: string | null }>();
  starts.forEach((m, i) => {
    const block = html.slice(m.index!, starts[i + 1]?.index ?? m.index! + 20000);
    const date = block.match(/data-evento[\s\S]{0,400}?<h3[^>]*>\s*(\d{8})\s*<\/h3>/)?.[1];
    const link = block.match(/href="(https:\/\/fcs\.mg\.gov\.br\/evento\/[^"#?]+\/?)"/)?.[1];
    const title = clean(block.match(/theme-post-title[\s\S]{0,400}?<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]);
    if (!date || !link || !title || items.has(m[1])) return;
    const image = html.match(new RegExp(`\\.e-loop-item-${m[1]} [^{}]*\\{background-image:url\\("([^"]+)"\\)`))?.[1] ?? null;
    items.set(m[1], {
      title,
      link,
      date,
      categories: [...m[2].matchAll(/categoria_evento-([a-z_]+)/g)].map((c) => c[1]),
      image: image && publicUrl(image) ? image : null,
    });
  });
  if (!items.size) return { ...report, skipped: ['agenda da página inicial sem eventos (mudou o layout?)'] };

  // O que já temos (para ler a página e o texto só dos eventos novos).
  const { data: known } = await db
    .from('app_bh_events')
    .select('external_id, ends_at, time_known, starts_at, price_text, price_min, price_max, is_free')
    .eq('source', 'palacio_das_artes')
    .in('external_id', [...items.keys()]);
  type Known = {
    external_id: string;
    starts_at: string;
    ends_at: string | null;
    time_known: boolean;
    price_text: string | null;
    price_min: number | null;
    price_max: number | null;
    is_free: boolean | null;
  };
  const knownById = new Map(((known ?? []) as Known[]).map((k) => [k.external_id, k]));

  const fresh = [...items.keys()].filter((id) => !knownById.has(id));
  const texts = new Map<string, string>();
  if (fresh.length) {
    const api = await politeFetch(
      `${FCS}/wp-json/wp/v2/evento?include=${fresh.join(',')}&per_page=100&_fields=id,content`,
      'palacio_das_artes',
    );
    if (api.ok) {
      report.read++;
      for (const e of JSON.parse(api.text) as { id: number; content?: { rendered?: string } }[]) {
        texts.set(String(e.id), clean(e.content?.rendered) ?? '');
      }
    }
  }

  const rows: EventRow[] = [];
  for (const [id, item] of items) {
    const y = +item.date.slice(0, 4);
    const m = +item.date.slice(4, 6);
    const d = +item.date.slice(6, 8);
    let startsAt = bhDate(y, m, d);
    if (!validDate(startsAt)) continue;
    const prev = knownById.get(id);
    const prevDay = prev ? new Date(Date.parse(prev.starts_at) - 3 * 3_600_000).toISOString().slice(0, 10) : null;
    // Mesmo dia de antes: guarda hora e fim lidos na primeira vez. Dia mudou: só o novo dia.
    const sameDay = prevDay === `${item.date.slice(0, 4)}-${item.date.slice(4, 6)}-${item.date.slice(6, 8)}`;
    let endsAt: string | null = sameDay ? (prev?.ends_at ?? null) : null;
    let timeKnown = sameDay ? !!prev?.time_known : false;
    if (sameDay && prev) startsAt = prev.starts_at;
    let price = { text: prev?.price_text ?? null, min: prev?.price_min ?? null, max: prev?.price_max ?? null, free: prev?.is_free ?? null };

    if (!prev) {
      const details = fcsDetails(texts.get(id) ?? '', y, m, d);
      endsAt = details.end;
      if (details.hour != null && details.hour < 24) {
        startsAt = bhDate(y, m, d, details.hour, details.minute);
        timeKnown = true;
      }
      // A página do evento só é lida uma vez, para o preço ("a partir de R$25", "Gratuito").
      const page = await politeFetch(item.link, 'palacio_das_artes');
      if (page.ok) {
        report.read++;
        const block = clean(page.text.match(/>\s*INGRESSOS?\s*<\/h1>[\s\S]{0,800}?<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
        const p = prices(block);
        price = { text: block, min: p.min, max: p.max, free: p.free };
      }
    }
    if (Date.parse(endsAt ?? startsAt) < Date.now() - 7 * DAY && fcsCategory(item.categories) !== 'exhibition') continue;
    rows.push({
      source: 'palacio_das_artes',
      source_name: 'Palácio das Artes',
      external_id: id,
      link_id: null,
      title: item.title,
      venue: 'Palácio das Artes',
      neighborhood: 'Centro',
      starts_at: startsAt,
      ends_at: endsAt,
      time_known: timeKnown,
      url: item.link,
      image_url: item.image,
      category: fcsCategory(item.categories),
      price_text: price.text,
      price_min: price.min,
      price_max: price.max,
      is_free: price.free,
      fetched_at: now,
    });
  }
  report.saved = await save(rows);
  return report;
}

// ---------- 4. Curadoria: links colados pela equipe ----------
const SOURCE_NAMES: [RegExp, string][] = [
  [/(^|\.)sympla\.com\.br$/, 'Sympla'],
  [/(^|\.)2liv\.com\.br$/, '2LIV'],
  [/(^|\.)raroclub\.com\.br$/, 'Raro Club'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)portalbelohorizonte\.com\.br$/, 'Portal Belo Horizonte'],
  [/(^|\.)ccbb\.com\.br$/, 'CCBB BH'],
  [/(^|\.)fcs\.mg\.gov\.br$/, 'Palácio das Artes'],
  [/(^|\.)eventim\.com\.br$/, 'Eventim'],
  [/(^|\.)ingresse\.com$/, 'Ingresse'],
  [/(^|\.)shotgun\.live$/, 'Shotgun'],
  [/(^|\.)bilheteriadigital\.com$/, 'Bilheteria Digital'],
  [/(^|\.)ticketmaster\.com\.br$/, 'Ticketmaster'],
];
// Sites cujos termos proíbem leitura automatizada: o robô não abre, a equipe digita título e data.
const NO_FETCH = /(^|\.)(instagram\.com|facebook\.com|fb\.me|tiktok\.com|x\.com|twitter\.com|threads\.net|whatsapp\.com)$/;

type Found = {
  title?: string | null;
  start?: string | null;
  end?: string | null;
  venue?: string | null;
  neighborhood?: string | null;
  image?: string | null;
  category?: Category | null;
  priceMin?: number | null;
  priceMax?: number | null;
  free?: boolean | null;
};

const LD_TYPES: [RegExp, Category][] = [
  [/MusicEvent/, 'show'],
  [/TheaterEvent|DanceEvent|ComedyEvent/, 'theatre'],
  [/ExhibitionEvent|VisualArtsEvent/, 'exhibition'],
  [/Festival/, 'festival'],
  [/SocialEvent/, 'party'],
];

function isoWithZone(s: unknown) {
  if (typeof s !== 'string' || !s.trim()) return null;
  const v = s.trim().replace(' ', 'T');
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? v : /T\d{2}:\d{2}/.test(v) ? `${v}-03:00` : `${v.slice(0, 10)}T00:00:00-03:00`;
  return validDate(withZone) ? new Date(withZone).toISOString() : null;
}

/** JSON-LD "Event" (schema.org) da página, se houver. */
function fromJsonLd(html: string): Found | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(b[1].trim());
    } catch {
      continue;
    }
    const queue: unknown[] = [data];
    while (queue.length) {
      const item = queue.shift();
      if (Array.isArray(item)) {
        queue.push(...item);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      if (o['@graph']) queue.push(o['@graph']);
      const type = ([] as unknown[]).concat(o['@type'] ?? []).join(' ');
      if (!/Event|Festival/.test(type) || !o.startDate) continue;
      const location = ([] as unknown[]).concat(o.location ?? [])[0] as Record<string, unknown> | undefined;
      const address = location?.address as Record<string, unknown> | undefined;
      const offers = ([] as unknown[]).concat(o.offers ?? []) as Record<string, unknown>[];
      const values = offers
        .flatMap((of) => [of.price, of.lowPrice, of.highPrice])
        .map((v) => Number(v))
        .filter((n) => !isNaN(n));
      const image = ([] as unknown[]).concat(o.image ?? [])[0];
      return {
        title: typeof o.name === 'string' ? clean(o.name) : null,
        start: isoWithZone(o.startDate),
        end: isoWithZone(o.endDate),
        venue: typeof location?.name === 'string' ? clean(location.name) : null,
        neighborhood: typeof address?.addressLocality === 'string' ? clean(address.addressLocality) : null,
        image: typeof image === 'string' ? image : typeof (image as Record<string, unknown>)?.url === 'string' ? ((image as Record<string, unknown>).url as string) : null,
        category: LD_TYPES.find(([re]) => re.test(type))?.[1] ?? null,
        priceMin: values.length ? Math.min(...values) : null,
        priceMax: values.length ? Math.max(...values) : null,
        free: o.isAccessibleForFree === true ? true : values.length ? values.every((v) => v === 0) : null,
      };
    }
  }
  return null;
}

/** Sympla: a página traz os dados do próprio evento (data, local, categoria) junto com o HTML. */
function fromSympla(html: string): Found | null {
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const queue: unknown[] = [data];
  let guard = 0;
  while (queue.length && guard++ < 20000) {
    const item = queue.shift();
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item)) {
      queue.push(...item);
      continue;
    }
    const o = item as Record<string, unknown>;
    if (typeof o.name === 'string' && (o.startDateMultiFormat || o.startDate) && 'eventsAddress' in o) {
      const s = o.startDateMultiFormat as Record<string, string> | undefined;
      const e = o.endDateMultiFormat as Record<string, string> | undefined;
      const address = o.eventsAddress as Record<string, unknown> | null;
      const category = o.eventsCategory as Record<string, unknown> | null;
      const images = o.images as Record<string, unknown> | null;
      return {
        title: clean(o.name),
        start: isoWithZone(s?.ISO8601 ?? o.startDate),
        end: isoWithZone(e?.ISO8601 ?? o.endDate),
        venue: typeof address?.name === 'string' ? clean(address.name) : null,
        neighborhood: typeof address?.neighborhood === 'string' ? clean(address.neighborhood) : null,
        image: typeof images?.logoLarge === 'string' ? images.logoLarge : null,
        category: category ? categoryFromText(`${category.slug ?? ''} ${category.name ?? ''} ${o.name}`) : null,
      };
    }
    for (const v of Object.values(o)) if (v && typeof v === 'object') queue.push(v);
  }
  return null;
}

type Link = {
  id: string;
  url: string;
  status: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  category: Category | null;
  checked_at: string | null;
};

async function syncLinks(now: string, onlyId?: string): Promise<Report> {
  const report: Report = { read: 0, saved: 0, skipped: [] };
  let query = db.from('app_bh_event_links').select('id, url, status, title, starts_at, ends_at, venue, category, checked_at');
  if (onlyId) {
    query = query.eq('id', onlyId);
  } else {
    // pendentes e com erro todo dia; os que deram certo, uma vez por semana (data mudou? cancelado?)
    const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
    const recent = new Date(Date.now() - 120 * DAY).toISOString();
    query = query.or(`status.in.(pending,error,needs_info),and(status.eq.ok,checked_at.lt.${weekAgo},created_at.gt.${recent})`).limit(60);
  }
  const { data: links, error } = await query;
  if (error) return { ...report, error: error.message };

  for (const link of (links ?? []) as Link[]) {
    const url = publicUrl(link.url);
    const update = async (status: string, detail: string | null) => {
      await db.from('app_bh_event_links').update({ status, status_detail: detail, checked_at: new Date().toISOString() }).eq('id', link.id);
    };
    if (!url) {
      await update('error', 'Link inválido (só http/https em domínio público).');
      continue;
    }
    const host = url.hostname.toLowerCase();
    const sourceName = SOURCE_NAMES.find(([re]) => re.test(host))?.[1] ?? host.replace(/^www\./, '');

    let found: Found = {};
    let detail: string | null = null;
    if (NO_FETCH.test(host)) {
      detail = 'O robô não abre redes sociais: preencha título e data no painel.';
    } else {
      const page = await politeFetch(url.toString(), 'link', { force: !!onlyId || link.status === 'pending', minHours: 20 });
      if (page.ok) {
        report.read++;
        const html = page.text;
        const ld = fromJsonLd(html);
        const sympla = /(^|\.)sympla\.com\.br$/.test(host) ? fromSympla(html) : null;
        const ogTitle = meta(html, 'og:title') ?? clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
        const ogImage = meta(html, 'og:image');
        found = {
          title: sympla?.title ?? ld?.title ?? ogTitle,
          start: sympla?.start ?? ld?.start ?? isoWithZone(meta(html, 'event:start_time') ?? meta(html, 'startdate')),
          end: sympla?.end ?? ld?.end ?? null,
          venue: sympla?.venue ?? ld?.venue ?? null,
          neighborhood: sympla?.neighborhood ?? ld?.neighborhood ?? null,
          image: ogImage ?? sympla?.image ?? ld?.image ?? null,
          category: ld?.category ?? sympla?.category ?? null,
          priceMin: ld?.priceMin ?? null,
          priceMax: ld?.priceMax ?? null,
          free: ld?.free ?? null,
        };
      } else if (page.reason === 'robots') {
        await update('not_allowed', 'O robots.txt deste site não deixa o robô ler a página.');
        continue;
      } else if (page.reason === 'recent' || page.reason === 'unchanged') {
        continue;
      } else {
        detail = `Não abriu (${page.reason}).`;
        if (!link.title || !link.starts_at) {
          await update('error', detail);
          continue;
        }
      }
    }

    // O que a equipe digitou vale mais que a página.
    const title = clean(link.title) ?? found.title ?? null;
    const startsAt = link.starts_at ?? found.start ?? null;
    const endsAt = link.ends_at ?? found.end ?? null;
    if (!title || !startsAt) {
      await update('needs_info', detail ?? `A página não traz ${!title ? 'título' : 'data'}: preencha no painel.`);
      continue;
    }
    const t = Date.parse(startsAt);
    if (Date.parse(endsAt ?? startsAt) < Date.now() - DAY || t > Date.now() + 365 * DAY) {
      await update('needs_info', 'A data lida está no passado ou longe demais: confira no painel.');
      continue;
    }
    // Hora 00:00 em BH = só o dia é conhecido.
    const local = new Date(t - 3 * 3_600_000);
    const timeKnown = local.getUTCHours() !== 0 || local.getUTCMinutes() !== 0;
    try {
      report.saved += await save([
        {
          source: 'link',
          source_name: sourceName,
          external_id: link.id,
          link_id: link.id,
          title: title.slice(0, 200),
          venue: link.venue ?? found.venue ?? null,
          neighborhood: found.neighborhood ?? null,
          starts_at: new Date(t).toISOString(),
          ends_at: endsAt && Date.parse(endsAt) >= t ? new Date(Date.parse(endsAt)).toISOString() : null,
          time_known: timeKnown,
          url: url.toString(),
          image_url: found.image && publicUrl(found.image) ? found.image : null,
          category: link.category ?? found.category ?? categoryFromText(title),
          price_text: null,
          price_min: found.priceMin ?? null,
          price_max: found.priceMax ?? null,
          is_free: found.free ?? null,
          fetched_at: now,
        },
      ]);
      await update('ok', NO_FETCH.test(host) ? null : detail);
    } catch (e) {
      await update('error', `Não gravou: ${(e as Error).message}`.slice(0, 300));
    }
  }
  return report;
}

// ---------- entrada ----------
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const { data: allowed } = await db.rpc('app_bh_events_sync_secret_ok', { p_secret: req.headers.get('x-sync-secret') ?? '' });
  if (allowed !== true) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => ({}))) as { linkId?: unknown };
  const now = new Date().toISOString();

  if (typeof body.linkId === 'string' && /^[0-9a-f-]{36}$/.test(body.linkId)) {
    const links = await syncLinks(now, body.linkId).catch((e) => ({ read: 0, saved: 0, skipped: [], error: String(e) }));
    return json({ ok: true, links });
  }

  const { data: run } = await db.from('app_bh_sync_runs').insert({ started_at: now }).select('id').single();
  const step = (fn: () => Promise<Report>) =>
    fn().catch((e): Report => ({ read: 0, saved: 0, skipped: [], error: String((e as Error)?.message ?? e).slice(0, 300) }));
  // Uma fonte por vez (são poucas páginas; nada de rajada nos sites).
  const summary: Record<string, unknown> = {};
  summary.pbh_dados_abertos = await step(() => syncPbh(now));
  summary.ccbb_bh = await step(() => syncCcbb(now));
  summary.palacio_das_artes = await step(() => syncFcs(now));
  summary.links = await step(() => syncLinks(now));

  // Limpeza: acabou há mais de 7 dias (e a fonte não listou de novo nesta rodada).
  const cutoff = new Date(Date.now() - 7 * DAY).toISOString();
  const [a, b] = await Promise.all([
    db.from('app_bh_events').delete({ count: 'exact' }).lt('ends_at', cutoff).lt('fetched_at', now),
    db.from('app_bh_events').delete({ count: 'exact' }).is('ends_at', null).lt('starts_at', cutoff).lt('fetched_at', now),
  ]);
  summary.deleted = (a.count ?? 0) + (b.count ?? 0);

  if (run) await db.from('app_bh_sync_runs').update({ finished_at: new Date().toISOString(), summary }).eq('id', run.id);
  return json({ ok: true, summary });
});
