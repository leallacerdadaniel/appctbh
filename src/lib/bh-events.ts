import { useCallback, useEffect, useState } from 'react';

import { eventsApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * What's on in BH, from the "app-events" function (supabase/functions/app-events): CCBB BH, Palácio das Artes,
 * the city's open data and the links the team pastes (Sympla, 2LIV, Raro...). Rules per source in
 * docs/pesquisa/agenda-bh.md, section 7. Titles stay as published (proper names, usually Portuguese); the app
 * shows only facts (no Portuguese descriptions).
 */
export type BhEventCategory = 'show' | 'party' | 'exhibition' | 'theatre' | 'festival' | 'other';
export const BH_EVENT_CATEGORIES: BhEventCategory[] = ['show', 'party', 'exhibition', 'theatre', 'festival', 'other'];

export type BhEvent = {
  id: string;
  title: string;
  venue: string | null;
  neighborhood: string | null;
  startsAt: string;
  endsAt: string | null;
  /** false: only the day is known (a season, an exhibition): show no time. */
  timeKnown: boolean;
  url: string | null;
  imageUrl: string | null;
  category: BhEventCategory;
  priceMin: number | null;
  priceMax: number | null;
  isFree: boolean | null;
  source: 'ccbb_bh' | 'palacio_das_artes' | 'pbh_dados_abertos' | 'link';
  /** Shown on every card ("CCBB BH", "Sympla"). */
  sourceName: string;
};

/** The city's official agenda (Belotur): link only, until they allow automatic reading. */
export const OFFICIAL_AGENDA_URL = 'https://www.portalbelohorizonte.com.br/eventos';

type State = { status: 'loading' } | { status: 'ready'; events: BhEvent[] } | { status: 'error' };

// One list for every screen (Explorer's carousel and the full page), kept 10 minutes.
let cache: { at: number; events: BhEvent[] } | null = null;
const FRESH_MS = 10 * 60_000;

export function useBhEvents() {
  const { token } = useAuth();
  const [state, setState] = useState<State>(cache ? { status: 'ready', events: cache.events } : { status: 'loading' });

  const load = useCallback(
    (force: boolean) => {
      if (!token) return Promise.resolve();
      // Fresh list from another screen: the state already started from it.
      if (!force && cache && Date.now() - cache.at < FRESH_MS) return Promise.resolve();
      return eventsApi<{ events: BhEvent[] }>('list', { token, body: { days: 30 } })
        .then((r) => {
          const events = dedupe(r.events ?? []);
          cache = { at: Date.now(), events };
          setState({ status: 'ready', events });
        })
        .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
    },
    [token],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);
  return { state, reload };
}

/* ---------- Dates in Belo Horizonte (UTC−3, no daylight saving) ---------- */

const BH_OFFSET_MS = 3 * 3_600_000;

/** "2026-11-21T23:30:00Z" → "2026-11-21" (the day in BH). */
export function bhDay(iso: string) {
  return new Date(Date.parse(iso) - BH_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-11-21T23:30:00Z" → "20:30" (the time in BH). */
export function bhTime(iso: string) {
  return new Date(Date.parse(iso) - BH_OFFSET_MS).toISOString().slice(11, 16);
}

export function todayBh() {
  return bhDay(new Date().toISOString());
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Last day of the event in BH: the start day when there is no end, and also for a night out that ends the
 * next morning (a party from 22h to 5h is "Fri 13 · 10 PM", not "Fri 13 – Sat 14").
 */
export function lastDay(e: BhEvent) {
  const start = bhDay(e.startsAt);
  if (!e.endsAt) return start;
  const end = bhDay(e.endsAt);
  const overnight =
    end === addDays(start, 1) &&
    Date.parse(e.endsAt) - Date.parse(e.startsAt) <= 18 * 3_600_000 &&
    bhTime(e.endsAt) <= '12:00';
  return overnight ? start : end;
}

/** Started before today and still on (a season, an exhibition). */
export function isOngoing(e: BhEvent, today = todayBh()) {
  return bhDay(e.startsAt) < today;
}

/** Friday to Sunday of this weekend (from Monday, the coming one). */
export function weekendRange(today = todayBh()) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const friday = weekday === 0 ? addDays(today, -2) : weekday === 6 ? addDays(today, -1) : addDays(today, 5 - weekday);
  return { from: weekday === 0 || weekday >= 5 ? today : friday, to: addDays(friday, 2) };
}

export function isThisWeekend(e: BhEvent, today = todayBh()) {
  const { from, to } = weekendRange(today);
  return bhDay(e.startsAt) <= to && lastDay(e) >= from;
}

/**
 * The same show listed twice by the source (one post per session, e.g. Palácio das Artes): keep the first
 * when the title is the same and the second starts on a day the first already covers.
 */
function dedupe(events: BhEvent[]) {
  const kept: BhEvent[] = [];
  for (const e of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = e.title.trim().toLowerCase();
    const twin = kept.find(
      (k) => k.title.trim().toLowerCase() === key && bhDay(e.startsAt) >= bhDay(k.startsAt) && bhDay(e.startsAt) <= lastDay(k),
    );
    if (!twin) kept.push(e);
  }
  return kept;
}

/**
 * For the carousel: what starts in the next 7 days first (by date), then what is already on.
 */
export function thisWeek(events: BhEvent[], category?: BhEventCategory, today = todayBh()) {
  const until = addDays(today, 6);
  const pool = category ? events.filter((e) => e.category === category) : events;
  const upcoming = pool.filter((e) => !isOngoing(e, today) && bhDay(e.startsAt) <= until);
  const ongoing = pool.filter((e) => isOngoing(e, today));
  return [...upcoming, ...ongoing];
}

export type DayGroup = { day: string; events: BhEvent[] };

/** Groups by start day (today and later); events already on go in `ongoing`. */
export function groupByDay(events: BhEvent[], today = todayBh()) {
  const ongoing: BhEvent[] = [];
  const days = new Map<string, BhEvent[]>();
  for (const e of events) {
    if (isOngoing(e, today)) {
      ongoing.push(e);
      continue;
    }
    const day = bhDay(e.startsAt);
    days.set(day, [...(days.get(day) ?? []), e]);
  }
  const groups: DayGroup[] = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, events: list.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }));
  return { groups, ongoing: ongoing.sort((a, b) => lastDay(a).localeCompare(lastDay(b))) };
}
