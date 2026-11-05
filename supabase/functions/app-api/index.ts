// Supabase Edge Function "app-api": a única porta do app do estudante para o banco.
// Login PRÓPRIO do app (não usa o login do site / auth.users).
// Publicar pelo painel: Edge Functions → Deploy a new function → Via Editor, nome "app-api",
// colar este arquivo e DESLIGAR "Verify JWT" (o app usa o token próprio abaixo).
// Usa as variáveis que o Supabase já fornece: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Rotas (POST, JSON):
//   /app-api/login            { email, password }      → { token, mustChangePassword }
//   /app-api/home             (Authorization: Bearer)  → dados do aluno (app_home_for)
//   /app-api/change-password  { password }             → { token }
//   /app-api/contract         (Authorization: Bearer)  → { url } link temporário do PDF
//   Despesas compartilhadas entre colegas (grupo = locação do aluno; valores em centavos de R$):
//   /app-api/expenses           → { me, members, expenses, settlements }
//   /app-api/expense-save       { id?, description, amountCents, currency, paidBy, spentOn, splitMode, shares }
//   /app-api/expense-delete     { id }            (só quem lançou)
//   /app-api/settlement-save    { from, to, amountCents, currency, paidOn }  (o aluno tem de ser um dos dois)
//   currency: 'BRL' (padrão) ou 'EUR'; os saldos são por moeda, sem conversão.
//   /app-api/settlement-delete  { id }            (só quem lançou)
//   Avaliação das faxinas (uma por aluno, editável até 7 dias depois da faxina):
//   /app-api/cleaning-feedback  { cleaningId, rating (1–5), comment }
//   Check-in e check-out (entrega e devolução do apartamento, cadastradas no site):
//   /app-api/handovers           → { checkin, checkout } (data, quem recebeu/devolveu, se há PDF assinado)
//   /app-api/handover-document   { kind: 'checkin' | 'checkout' } → { url } link temporário do PDF assinado
//   Aniversário (a data de nascimento nunca sai do banco):
//   /app-api/birthday            → { show } true uma única vez por ano, no dia do aniversário
//   Uso do app (aba "Uso" do admin); as buscas são gravadas sem identificar o aluno:
//   /app-api/track               { events: [{ kind, name, item?, at }], searches?: [{ query, results, at }] }
import { createClient } from 'npm:@supabase/supabase-js@2';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SESSION_DAYS = 120;
const enc = new TextEncoder();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------- senha: PBKDF2-SHA256 (mesmo formato do admin: pbkdf2$iter$salt$hash) ----------
const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(await pbkdf2(password, salt, iterations))}`;
}

async function checkPassword(password: string, stored: string) {
  const [kind, iter, salt, hash] = stored.split('$');
  if (kind !== 'pbkdf2') return false;
  const given = hex(await pbkdf2(password, unhex(salt), Number(iter)));
  let diff = given.length ^ hash.length;
  for (let i = 0; i < Math.min(given.length, hash.length); i++) diff |= given.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

// ---------- sessão: token assinado (HMAC) com o aluno e a versão da sessão ----------
let hmacKey: CryptoKey | null = null;
async function getHmacKey() {
  if (!hmacKey) {
    const raw = await crypto.subtle.digest('SHA-256', enc.encode(`ctbh-app-session:${SERVICE_KEY}`));
    hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  return hmacKey;
}
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function makeToken(cp: string, version: number) {
  const payload = b64url(enc.encode(JSON.stringify({ cp, v: version, exp: Date.now() + SESSION_DAYS * 86_400_000 })));
  const sig = await crypto.subtle.sign('HMAC', await getHmacKey(), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/** Devolve o aluno do token, ou null se o token for inválido, vencido, de senha antiga ou conta desativada. */
async function readToken(req: Request) {
  const [payload, sig] = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '').split('.');
  if (!payload || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64url(sig), enc.encode(payload));
  if (!ok) return null;
  const { cp, v, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  if (Date.now() > exp) return null;
  const { data } = await db.from('app_students').select('status, session_version').eq('counterparty_id', cp).maybeSingle();
  if (!data || data.status !== 'active' || data.session_version !== v) return null;
  return { cp: cp as string, version: v as number };
}

// ---------- rotas ----------
async function login(body: { email?: string; password?: string }) {
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) return json({ error: 'wrongCredentials' }, 401);

  const { data: rows, error } = await db.rpc('app_login_lookup', { p_email: email });
  if (error) return json({ error: 'server' }, 500);
  // e-mail repetido em dois cadastros: não adivinha qual é
  const account = rows?.length === 1 ? rows[0] : null;
  if (!account || account.status !== 'active' || !(await checkPassword(password, account.password_hash))) {
    return json({ error: 'wrongCredentials' }, 401);
  }

  const { data: acc } = await db
    .from('app_students')
    .select('login_count')
    .eq('counterparty_id', account.counterparty_id)
    .single();
  const now = new Date().toISOString();
  await db
    .from('app_students')
    .update({ last_login_at: now, last_seen_at: now, login_count: (acc?.login_count ?? 0) + 1, updated_at: now })
    .eq('counterparty_id', account.counterparty_id);

  return json({
    token: await makeToken(account.counterparty_id, account.session_version),
    mustChangePassword: account.must_change_password,
  });
}

async function home(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db.rpc('app_home_for', { p_cp: who.cp });
  if (error) return json({ error: 'server' }, 500);
  await db.from('app_students').update({ last_seen_at: new Date().toISOString() }).eq('counterparty_id', who.cp);
  if (!data) return json({ error: 'noRental' }, 404);
  return json({ ...data, ...(await arrivalAndDeparture(who.cp)) });
}

/**
 * Chegada e saída reais do aluno, preenchidas em Chegada e Saída no site. Sem data preenchida vem
 * null: o início do contrato não é a chegada, e o app mostra o fim do contrato com esse nome.
 */
async function arrivalAndDeparture(cp: string) {
  const { data: rentals } = await db.rpc('app_rentals_for', { p_cp: cp });
  const { data: tenants } = await db
    .from('rental_tenants')
    .select('id, arrival_confirmed_date, arrival_time')
    .eq('counterparty_id', cp)
    .eq('is_active', true)
    .in('rental_id', rentals ?? []);
  const { data: departures } = await db
    .from('apartment_departures')
    .select('departure_date, checkout_datetime')
    .in('tenant_id', (tenants ?? []).map((t) => t.id));

  const first = (tenants ?? [])
    .filter((t) => t.arrival_confirmed_date)
    .sort((a, b) => a.arrival_confirmed_date.localeCompare(b.arrival_confirmed_date))[0];
  const timeZone = 'America/Sao_Paulo';
  const last = (departures ?? [])
    .map((d) => {
      const at = d.checkout_datetime ? new Date(d.checkout_datetime) : null;
      const day = at?.toLocaleDateString('en-CA', { timeZone }) ?? null;
      const date = (d.departure_date ?? day) as string | null;
      const time = at && day === date
        ? at.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' })
        : null;
      return { date, time };
    })
    .filter((d) => d.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];

  return {
    arrival: first ? { date: first.arrival_confirmed_date, time: first.arrival_time?.slice(0, 5) ?? null } : null,
    departure: last ?? null,
  };
}

/** Confere e já marca: quem recebe show = true não recebe de novo no mesmo ano. */
async function birthday(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data, error } = await db.rpc('app_claim_birthday', { p_cp: who.cp });
  if (error) return json({ error: 'server' }, 500);
  return json({ show: data === true });
}

/** Recebe um lote de uso. A data vem do aparelho; se vier estranha, vale a hora em que chegou. */
async function track(req: Request, body: { events?: unknown; searches?: unknown }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);

  const now = Date.now();
  const when = (value: unknown) => {
    const t = Date.parse(String(value));
    return new Date(Number.isFinite(t) && t <= now && t >= now - 7 * 86_400_000 ? t : now).toISOString();
  };
  const text = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 100) : '');
  const list = (value: unknown) => (Array.isArray(value) ? (value.slice(0, 100) as Record<string, unknown>[]) : []);

  const events = list(body.events)
    .filter((e) => (e?.kind === 'screen' || e?.kind === 'action') && text(e.name))
    .map((e) => ({
      counterparty_id: who.cp,
      kind: e.kind,
      name: text(e.name),
      item: text(e.item) || null,
      occurred_at: when(e.at),
    }));
  const searches = list(body.searches)
    .filter((s) => text(s?.query).length >= 2)
    .map((s) => ({
      query: text(s.query).toLowerCase(),
      results: Math.max(0, Math.floor(Number(s.results) || 0)),
      occurred_at: when(s.at),
    }));

  if (events.length > 0) {
    const { error } = await db.from('app_events').insert(events);
    if (error) return json({ error: 'server' }, 500);
  }
  if (searches.length > 0) {
    const { error } = await db.from('app_searches').insert(searches);
    if (error) return json({ error: 'server' }, 500);
  }
  return json({ ok: true });
}

async function changePassword(req: Request, body: { password?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const password = String(body.password ?? '');
  if (password.length < 8) return json({ error: 'tooShort' }, 400);
  const version = who.version + 1; // derruba sessões abertas com a senha antiga
  const { error } = await db
    .from('app_students')
    .update({
      password_hash: await hashPassword(password),
      must_change_password: false,
      session_version: version,
      updated_at: new Date().toISOString(),
    })
    .eq('counterparty_id', who.cp);
  if (error) return json({ error: 'server' }, 500);
  return json({ token: await makeToken(who.cp, version) });
}

async function contract(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { data: k } = await db
    .from('rental_contracts')
    .select('file_path, file_name')
    .eq('rental_id', rentalId)
    .not('file_path', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!k) return json({ error: 'noContract' }, 404);
  const { data: signed, error } = await db.storage.from('rental-contracts').createSignedUrl(k.file_path, 600);
  if (error || !signed) return json({ error: 'server' }, 500);
  return json({ url: signed.signedUrl, fileName: k.file_name });
}

// ---------- despesas compartilhadas ----------
const MAX_CENTS = 10_000_000; // R$ 100 000, trava contra erro de digitação
const isCents = (n: unknown, min: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= MAX_CENTS;
const isCurrency = (c: unknown) => c === 'BRL' || c === 'EUR';
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

/** Locação do aluno e todos os colegas dela (inquilinos ativos, com ou sem acesso ao app). */
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

/** Lugares e distâncias do apartamento do aluno; null enquanto o apartamento não foi calculado. */
async function places(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const { data: rentalId } = await db.rpc('app_rental_for', { p_cp: who.cp });
  if (!rentalId) return json({ error: 'noRental' }, 404);
  const { data: rental } = await db.from('apartment_rentals').select('apartment_id').eq('id', rentalId).maybeSingle();
  if (!rental?.apartment_id) return json({ places: null });
  const { data, error } = await db
    .from('app_apartment_places')
    .select('nearby, times')
    .eq('apartment_id', rental.apartment_id)
    .maybeSingle();
  if (error) return json({ error: 'server' }, 500);
  return json({ places: data });
}

async function expenses(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const [{ data: rows, error: e1 }, { data: settlements, error: e2 }] = await Promise.all([
    db
      .from('app_expenses')
      .select('id, description, amount_cents, currency, paid_by, spent_on, split_mode, created_by, created_at, app_expense_shares(counterparty_id, amount_cents)')
      .eq('rental_id', g.rentalId)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
    db
      .from('app_settlements')
      .select('id, from_cp, to_cp, amount_cents, currency, paid_on, created_by, created_at')
      .eq('rental_id', g.rentalId)
      .order('paid_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (e1 || e2) return json({ error: 'server' }, 500);
  return json({
    me: who.cp,
    members: g.members,
    expenses: (rows ?? []).map((r) => ({
      id: r.id,
      description: r.description,
      amountCents: r.amount_cents,
      currency: r.currency,
      paidBy: r.paid_by,
      spentOn: r.spent_on,
      splitMode: r.split_mode,
      createdBy: r.created_by,
      createdAt: r.created_at,
      shares: ((r.app_expense_shares ?? []) as { counterparty_id: string; amount_cents: number }[]).map((s) => ({
        cp: s.counterparty_id,
        amountCents: s.amount_cents,
      })),
    })),
    settlements: (settlements ?? []).map((s) => ({
      id: s.id,
      from: s.from_cp,
      to: s.to_cp,
      amountCents: s.amount_cents,
      currency: s.currency,
      paidOn: s.paid_on,
      createdBy: s.created_by,
      createdAt: s.created_at,
    })),
  });
}

type ExpenseBody = {
  id?: string;
  description?: string;
  amountCents?: number;
  currency?: string;
  paidBy?: string;
  spentOn?: string;
  splitMode?: string;
  shares?: { cp?: string; amountCents?: number }[];
};

async function expenseSave(req: Request, body: ExpenseBody) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);

  const description = String(body.description ?? '').trim();
  const shares = Array.isArray(body.shares) ? body.shares : [];
  const sharesOk =
    shares.length > 0 &&
    new Set(shares.map((s) => s.cp)).size === shares.length &&
    shares.every((s) => g.ids.has(String(s.cp)) && isCents(s.amountCents, 0)) &&
    shares.some((s) => (s.amountCents as number) > 0) &&
    shares.reduce((sum, s) => sum + (s.amountCents as number), 0) === body.amountCents;
  if (
    description.length < 1 ||
    description.length > 80 ||
    !isCents(body.amountCents, 1) ||
    !isCurrency(body.currency ?? 'BRL') ||
    !g.ids.has(String(body.paidBy)) ||
    !isDate(body.spentOn) ||
    (body.splitMode !== 'equal' && body.splitMode !== 'exact') ||
    !sharesOk
  ) {
    return json({ error: 'invalid' }, 400);
  }

  const fields = {
    description,
    amount_cents: body.amountCents,
    currency: body.currency ?? 'BRL',
    paid_by: body.paidBy,
    spent_on: body.spentOn,
    split_mode: body.splitMode,
    updated_at: new Date().toISOString(),
  };
  const newShares = (expenseId: string) =>
    shares.map((s) => ({ expense_id: expenseId, counterparty_id: s.cp, amount_cents: s.amountCents }));

  if (body.id) {
    const { data: old } = await db
      .from('app_expenses')
      .select('id, created_by, rental_id, app_expense_shares(counterparty_id, amount_cents)')
      .eq('id', body.id)
      .maybeSingle();
    if (!old || old.rental_id !== g.rentalId) return json({ error: 'notFound' }, 404);
    if (old.created_by !== who.cp) return json({ error: 'forbidden' }, 403);
    const { error: e1 } = await db.from('app_expenses').update(fields).eq('id', body.id);
    if (e1) return json({ error: 'server' }, 500);
    await db.from('app_expense_shares').delete().eq('expense_id', body.id);
    const { error: e2 } = await db.from('app_expense_shares').insert(newShares(body.id));
    if (e2) {
      // devolve as partes antigas para a despesa não ficar sem divisão
      await db.from('app_expense_shares').insert(
        ((old.app_expense_shares ?? []) as { counterparty_id: string; amount_cents: number }[]).map((s) => ({
          expense_id: body.id,
          ...s,
        })),
      );
      return json({ error: 'server' }, 500);
    }
    return json({ id: body.id });
  }

  const { data: created, error: e1 } = await db
    .from('app_expenses')
    .insert({ ...fields, rental_id: g.rentalId, created_by: who.cp })
    .select('id')
    .single();
  if (e1 || !created) return json({ error: 'server' }, 500);
  const { error: e2 } = await db.from('app_expense_shares').insert(newShares(created.id));
  if (e2) {
    await db.from('app_expenses').delete().eq('id', created.id);
    return json({ error: 'server' }, 500);
  }
  return json({ id: created.id });
}

/** Apaga uma despesa ou um acerto do grupo do aluno, se foi ele quem lançou. */
async function deleteOwn(req: Request, table: 'app_expenses' | 'app_settlements', id: unknown) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const { data: row } = await db.from(table).select('created_by, rental_id').eq('id', String(id ?? '')).maybeSingle();
  if (!row || row.rental_id !== g.rentalId) return json({ error: 'notFound' }, 404);
  if (row.created_by !== who.cp) return json({ error: 'forbidden' }, 403);
  const { error } = await db.from(table).delete().eq('id', String(id));
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

async function settlementSave(req: Request, body: { from?: string; to?: string; amountCents?: number; currency?: string; paidOn?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const g = await group(who.cp);
  if (!g) return json({ error: 'noRental' }, 404);
  const from = String(body.from ?? '');
  const to = String(body.to ?? '');
  if (
    !g.ids.has(from) ||
    !g.ids.has(to) ||
    from === to ||
    (from !== who.cp && to !== who.cp) ||
    !isCents(body.amountCents, 1) ||
    !isCurrency(body.currency ?? 'BRL') ||
    !isDate(body.paidOn)
  ) {
    return json({ error: 'invalid' }, 400);
  }
  const { data, error } = await db
    .from('app_settlements')
    .insert({
      rental_id: g.rentalId,
      from_cp: from,
      to_cp: to,
      amount_cents: body.amountCents,
      currency: body.currency ?? 'BRL',
      paid_on: body.paidOn,
      created_by: who.cp,
    })
    .select('id')
    .single();
  if (error || !data) return json({ error: 'server' }, 500);
  return json({ id: data.id });
}

const FEEDBACK_DAYS = 7;

/** Data de hoje em BH (AAAA-MM-DD), para o prazo da avaliação não depender do fuso do servidor. */
const todayBH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Grava (ou atualiza) a avaliação do aluno para uma faxina realizada da sua locação, dentro do prazo. */
async function cleaningFeedback(req: Request, body: { cleaningId?: string; rating?: number; comment?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  // Contrato principal + continuação (Chada e Jorge em 2027/1): as faxinas de maio também valem.
  const { data: rentalIds } = await db.rpc('app_rentals_for', { p_cp: who.cp });
  if (!rentalIds?.length) return json({ error: 'noRental' }, 404);

  const rating = body.rating;
  const comment = String(body.comment ?? '').trim();
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5 || comment.length > 500) {
    return json({ error: 'invalid' }, 400);
  }

  const { data: k } = await db
    .from('cleaning_records')
    .select('id, rental_id, scheduled_date, completed, completed_at')
    .eq('id', String(body.cleaningId ?? ''))
    .maybeSingle();
  if (!k || !(rentalIds as string[]).includes(k.rental_id) || !k.completed || !k.scheduled_date) {
    return json({ error: 'notFound' }, 404);
  }
  const doneOn = k.completed_at
    ? new Date(k.completed_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    : k.scheduled_date;
  const start = doneOn > k.scheduled_date ? doneOn : k.scheduled_date;
  if (todayBH() > plusDays(start, FEEDBACK_DAYS)) return json({ error: 'forbidden' }, 403);

  const { error } = await db.from('app_cleaning_feedback').upsert({
    cleaning_id: k.id,
    counterparty_id: who.cp,
    rental_id: k.rental_id,
    rating,
    comment,
    updated_at: new Date().toISOString(),
  });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

// ---------- check-in / check-out ----------
// Check-in: checkin_inspections (site), etapas "Apartamento entregue" (delivered_at, delivered_to_tenant_id)
// e "Vistoria assinada" (signed_pdf_url, bucket checkin-documents). As etapas antes do aluno ficam de fora.
// Check-out: checkout_handovers (a criar no site, mesmo formato): returned_at, returned_by_tenant_id,
// signed_pdf_url. Enquanto a tabela não existir, o check-out aparece como "ainda não feito".
// Com continuação (Chada e Jorge), o check-in é o do contrato principal e o check-out o do último contrato.
type Handover = { date: string | null; by: string | null; byMe: boolean; hasDocument: boolean };
const HANDOVER = {
  checkin: { table: 'checkin_inspections', date: 'delivered_at', by: 'delivered_to_tenant_id' },
  checkout: { table: 'checkout_handovers', date: 'returned_at', by: 'returned_by_tenant_id' },
} as const;
const HANDOVER_BUCKET = 'checkin-documents';

/** Contrato que vale para cada momento: o primeiro para o check-in, o que termina por último para o check-out. */
async function handoverRentals(cp: string) {
  const { data: ids } = await db.rpc('app_rentals_for', { p_cp: cp });
  if (!ids?.length) return null;
  const { data: rentals } = await db.from('apartment_rentals').select('id, end_date').in('id', ids);
  const last = [...(rentals ?? [])].sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0];
  return { checkin: ids[0] as string, checkout: (last?.id as string) ?? (ids[0] as string) };
}

async function handoverRow(kind: keyof typeof HANDOVER, rentalId: string) {
  const h = HANDOVER[kind];
  const { data } = await db
    .from(h.table)
    .select(`${h.date}, ${h.by}, signed_pdf_url`)
    .eq('rental_id', rentalId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // tabela ainda não criada (check-out) ou sem registro: data é null
  return data as Record<string, string | null> | null;
}

async function handovers(req: Request) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  const rentals = await handoverRentals(who.cp);
  if (!rentals) return json({ error: 'noRental' }, 404);

  const out: Record<string, Handover> = {};
  for (const kind of ['checkin', 'checkout'] as const) {
    const row = await handoverRow(kind, rentals[kind]);
    const tenantId = row?.[HANDOVER[kind].by] ?? null;
    let by: string | null = null;
    let byMe = false;
    if (tenantId) {
      const { data: t } = await db.from('rental_tenants').select('counterparty_id').eq('id', tenantId).maybeSingle();
      if (t) {
        byMe = t.counterparty_id === who.cp;
        const [{ data: c }, { data: s }] = await Promise.all([
          db.from('finance_counterparties').select('name').eq('id', t.counterparty_id).maybeSingle(),
          db.from('app_students').select('display_name').eq('counterparty_id', t.counterparty_id).maybeSingle(),
        ]);
        by = (s?.display_name ?? '').trim() || c?.name || null;
      }
    }
    out[kind] = { date: row?.[HANDOVER[kind].date] ?? null, by, byMe, hasDocument: !!row?.signed_pdf_url };
  }
  return json(out);
}

async function handoverDocument(req: Request, body: { kind?: string }) {
  const who = await readToken(req);
  if (!who) return json({ error: 'unauthorized' }, 401);
  if (body.kind !== 'checkin' && body.kind !== 'checkout') return json({ error: 'invalid' }, 400);
  const rentals = await handoverRentals(who.cp);
  if (!rentals) return json({ error: 'noRental' }, 404);
  const row = await handoverRow(body.kind, rentals[body.kind]);
  if (!row?.signed_pdf_url) return json({ error: 'notFound' }, 404);
  const { data: signed, error } = await db.storage.from(HANDOVER_BUCKET).createSignedUrl(row.signed_pdf_url, 600);
  if (error || !signed) return json({ error: 'server' }, 500);
  return json({ url: signed.signedUrl });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const route = new URL(req.url).pathname.split('/').pop();
  const body = await req.json().catch(() => ({}));
  try {
    switch (route) {
      case 'login':
        return await login(body);
      case 'home':
        return await home(req);
      case 'change-password':
        return await changePassword(req, body);
      case 'contract':
        return await contract(req);
      case 'expenses':
        return await expenses(req);
      case 'expense-save':
        return await expenseSave(req, body);
      case 'expense-delete':
        return await deleteOwn(req, 'app_expenses', body.id);
      case 'settlement-save':
        return await settlementSave(req, body);
      case 'settlement-delete':
        return await deleteOwn(req, 'app_settlements', body.id);
      case 'cleaning-feedback':
        return await cleaningFeedback(req, body);
      case 'handovers':
        return await handovers(req);
      case 'handover-document':
        return await handoverDocument(req, body);
      case 'birthday':
        return await birthday(req);
      case 'track':
        return await track(req, body);
      case 'places':
        return await places(req);
      default:
        return json({ error: 'notFound' }, 404);
    }
  } catch {
    return json({ error: 'server' }, 500);
  }
});
