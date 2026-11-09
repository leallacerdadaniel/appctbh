import { useGlobalSearchParams, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

const FLUSH_EVERY_MS = 30_000;
const FLUSH_AT = 20;
const MAX_QUEUED = 200;
/** Coming back to the app after this long counts as a new visit to the same screen. */
const NEW_VISIT_MS = 30 * 60_000;

export type UsageAction =
  | 'copy_wifi'
  | 'open_whatsapp'
  | 'open_document'
  | 'expense_added'
  | 'settlement_added'
  | 'cleaning_rated'
  | 'explorer_tab'
  | 'bh_section'
  // v3 (2026-11-08)
  | 'open_assistant'
  | 'copy_address'
  | 'open_uber'
  | 'open_99'
  | 'show_address'
  | 'welcome_step'
  | 'chore_done'
  | 'explorer_category'
  | 'explorer_ask'
  | 'get_app'
  // 2026-11-09: "Autour de moi" (Google Maps search where the student is)
  | 'around_me';

type UsageEvent = { kind: 'screen' | 'action'; name: string; item?: string; at: string };
type UsageSearch = { query: string; results: number; at: string };

let queue: UsageEvent[] = [];
let searches: UsageSearch[] = [];
let sending = false;

/** Never gets in the student's way: a failed batch waits for the next try, in memory only. */
async function flush(token: string | null) {
  if (!token || sending || (queue.length === 0 && searches.length === 0)) return;
  sending = true;
  const batch = queue.slice(0, 100);
  const searchBatch = searches.slice(0, 100);
  queue = queue.slice(batch.length);
  searches = searches.slice(searchBatch.length);
  try {
    await appApi('track', { token, body: { events: batch, searches: searchBatch } });
  } catch (e) {
    const retry = e instanceof AppApiError && (e.code === 'network' || e.code === 'server');
    if (retry) {
      queue = [...batch, ...queue].slice(0, MAX_QUEUED);
      searches = [...searchBatch, ...searches].slice(0, MAX_QUEUED);
    }
  } finally {
    sending = false;
  }
}

function record(name: string, item: string | undefined, token: string | null) {
  queue = [...queue, { kind: 'screen' as const, name, item, at: new Date().toISOString() }].slice(-MAX_QUEUED);
  if (queue.length >= FLUSH_AT) flush(token);
}

/** A button that matters (copy the Wi‑Fi, open WhatsApp…). Goes out with the next batch. */
export function trackAction(name: UsageAction, item?: string) {
  queue = [...queue, { kind: 'action' as const, name, item, at: new Date().toISOString() }].slice(-MAX_QUEUED);
}

/** A Guide search. The server stores it without saying who searched. */
export function trackSearch(query: string, results: number) {
  searches = [...searches, { query, results, at: new Date().toISOString() }].slice(-MAX_QUEUED);
}

/** The route as written in the file tree ("/restaurants/[id]"), so every restaurant counts as one screen. */
function routeName(segments: readonly string[]) {
  return `/${segments.filter((s) => !s.startsWith('(') && s !== 'index').join('/')}`;
}

/**
 * Records which screens are opened, for the "Uso" tab of the admin. Mounted once in the root
 * layout, so screens don't need to know about it. Expense ids say nothing useful: never sent.
 */
export function UsageTracker() {
  const { token } = useAuth();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string | string[] }>();

  const name = routeName(segments);
  const isDetail = name.includes('[id]');
  const rawItem = Array.isArray(id) ? id[0] : id;
  const item = isDetail && !name.startsWith('/expenses') ? rawItem : undefined;
  // The screen can arrive one render before its id: wait for it, so it isn't counted twice.
  const waitingForId = isDetail && !name.startsWith('/expenses') && !item;

  const last = useRef<{ name: string; item?: string; at: number } | null>(null);

  useEffect(() => {
    if (waitingForId) return;
    if (last.current?.name === name && last.current.item === item) return;
    last.current = { name, item, at: Date.now() };
    record(name, item, token);
  }, [name, item, waitingForId, token]);

  useEffect(() => {
    const timer = setInterval(() => flush(token), FLUSH_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        flush(token);
        return;
      }
      const seen = last.current;
      if (seen && Date.now() - seen.at > NEW_VISIT_MS) {
        seen.at = Date.now();
        record(seen.name, seen.item, token);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      flush(token);
    };
  }, [token]);

  return null;
}
