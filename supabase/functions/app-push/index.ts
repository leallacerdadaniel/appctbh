// Supabase Edge Function "app-push": manda um aviso (app_notices) como notificação push (onda 9).
// Publicar com "Verify JWT" desligado: quem chama prova que pode mandando o segredo do Vault no cabeçalho
// x-push-secret (só o banco o tem: o gatilho de app_notices, ver supabase/appctbh/022_push.sql).
//
// POST { noticeId } → { ok, sent, failed, disabled } (ou { ok, skipped } quando não há o que mandar)
//
// 1. Marca app_notices.pushed_at (o mesmo aviso nunca sai duas vezes; aviso com mais de um dia não sai).
// 2. Destinatários: app_push_targets (audiência all / rental / student, só aparelhos ligados de alunos ativos),
//    cada um com a língua do app no aparelho (sem língua: a do aceite das regras, senão francês).
// 3. Expo Push API em lotes de 100: título e texto na língua do aluno, data.href (caminho interno do app).
// 4. Aparelho que volta DeviceNotRegistered (app apagado, token trocado) fica desligado em app_devices.
// Opcional: segredo EXPO_ACCESS_TOKEN da função, se a "segurança reforçada de push" for ligada no expo.dev.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';
const BATCH = 100;
const MAX_AGE_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mesma regra do check de app_notices.href (008_casa_avisos_pagamento.sql) e do app (src/lib/push.ts). */
const INTERNAL_PATH = /^\/[a-z0-9/_\-[\]?=&]*$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Lang = 'fr' | 'en';
type Text = { fr?: string | null; en?: string | null; pt?: string | null } | null;
type Target = { expo_token: string; counterparty_id: string; lang: string | null };
type Ticket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };

/** O texto na língua do aluno; senão francês, inglês, português. */
function pick(text: Text, lang: Lang) {
  const t: NonNullable<Text> = text ?? {};
  const value = t[lang] ?? t.fr ?? t.en ?? t.pt ?? '';
  return String(value).replace(/\s+/g, ' ').trim();
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

async function sendBatch(messages: Record<string, unknown>[]): Promise<Ticket[] | null> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: Ticket[]; errors?: unknown };
    if (!res.ok || !Array.isArray(body.data)) {
      console.error('expo push', res.status, JSON.stringify(body.errors ?? body).slice(0, 500));
      return null;
    }
    return body.data;
  } catch (e) {
    console.error('expo push', String(e).slice(0, 300));
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const { data: allowed } = await db.rpc('app_push_secret_ok', { p_secret: req.headers.get('x-push-secret') ?? '' });
  if (allowed !== true) return json({ error: 'unauthorized' }, 401);

  const body = (await req.json().catch(() => ({}))) as { noticeId?: unknown };
  const noticeId = typeof body.noticeId === 'string' && UUID.test(body.noticeId) ? body.noticeId : null;
  if (!noticeId) return json({ error: 'invalid' }, 400);

  // Marca antes de enviar: se o gatilho ou alguém chamar de novo, o segundo pedido não manda nada.
  const { data: claimed, error: claimError } = await db
    .from('app_notices')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', noticeId)
    .is('pushed_at', null)
    .select('id, title, body, href, created_at');
  if (claimError) return json({ error: 'server' }, 500);
  const notice = claimed?.[0] as
    | { id: string; title: Text; body: Text; href: string | null; created_at: string }
    | undefined;
  if (!notice) return json({ ok: true, skipped: 'alreadySentOrMissing' });
  if (Date.now() - Date.parse(notice.created_at) > MAX_AGE_MS) return json({ ok: true, skipped: 'old' });

  const { data: targets, error: targetsError } = await db.rpc('app_push_targets', { p_notice: noticeId });
  if (targetsError) return json({ error: 'server' }, 500);
  const list = ((targets ?? []) as Target[]).filter((t) => /^ExponentPushToken\[[\w-]+\]$/.test(t.expo_token));
  if (!list.length) return json({ ok: true, sent: 0, failed: 0, disabled: 0 });

  const href = notice.href && INTERNAL_PATH.test(notice.href) ? notice.href : null;
  const messages = list.map((t) => {
    const lang: Lang = t.lang === 'en' ? 'en' : 'fr';
    const title = cut(pick(notice.title, lang), 120);
    const text = cut(pick(notice.body, lang), 600);
    return {
      to: t.expo_token,
      ...(title ? { title } : {}),
      ...(text ? { body: text } : {}),
      data: { noticeId: notice.id, ...(href ? { href } : {}) },
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    };
  });

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const tickets = await sendBatch(batch);
    if (!tickets) {
      failed += batch.length;
      continue;
    }
    tickets.forEach((ticket, j) => {
      if (ticket.status === 'ok') sent += 1;
      else {
        failed += 1;
        if (ticket.details?.error === 'DeviceNotRegistered') gone.push(batch[j].to);
      }
    });
  }

  if (gone.length) {
    const { error } = await db.from('app_devices').update({ enabled: false }).in('expo_token', gone);
    if (error) console.error('disable devices', error.message);
  }
  return json({ ok: true, sent, failed, disabled: gone.length });
});
