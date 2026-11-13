import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useI18n, type Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { AppApiError, houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { bhToday } from '@/lib/bh-time';
import { formatDayDate, formatTime } from '@/lib/format';

/**
 * Life in the building (owner, 2026-11-08), served by the "app-house" function:
 * - Visites: the student lists who is coming; the app writes the message for the porteiro in Portuguese
 *   (WhatsApp of the building's portaria when the team filled it in, otherwise the Chez Toi team).
 * - Colis: packages the student is waiting for; the team marks them arrived at the portaria (a database
 *   trigger then posts a notice to the bell) and the student marks them picked up.
 * - Profils: a short profile per student, shown to the current roommates only when the student turns
 *   "Visible par mes colocataires" on (off by default).
 *
 * Each list is a small shared store (no provider in the root layout): every screen that uses it sees the
 * same data, it loads on first use, refreshes when a screen opens after STALE_MS, and after each action.
 */

/* ---------- Types (same shapes as the function's answers) ---------- */

export type Visitor = {
  id: string;
  name: string;
  /** YYYY-MM-DD, Belo Horizonte. */
  date: string;
  /** HH:MM or null when the student gave no time. */
  time: string | null;
  note: string | null;
  /** When the student opened WhatsApp to tell the portaria; cleared when name, day or time change. */
  notifiedAt: string | null;
};

export type VisitorsData = {
  visitors: Visitor[];
  /** The building's portaria on WhatsApp (digits, with 55), when the team filled it in. */
  portaria: { whatsapp: string | null };
};

export type ParcelStatus = 'expected' | 'arrived' | 'picked_up';

export type Parcel = {
  id: string;
  description: string;
  carrier: string | null;
  expectedDate: string | null;
  status: ParcelStatus;
  /** Written by the team when they mark it arrived ("caixa grande"). */
  teamNote: string | null;
  arrivedAt: string | null;
  pickedUpAt: string | null;
  createdAt: string;
};

export type PackagesData = { packages: Parcel[] };

export type SocialProfile = {
  school: string | null;
  hometown: string | null;
  /** ISO 639-1 codes ("fr", "en", "pt"). */
  languages: string[];
  instagram: string | null;
  about: string | null;
  visible: boolean;
};

export type MyProfileData = { profile: SocialProfile | null };

export type RoommateWithProfile = { id: string; name: string; profile: SocialProfile | null };

export type RoommateProfilesData = { roommates: RoommateWithProfile[] };

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

/** Languages offered as chips on the profile form (the server accepts any two-letter code). */
export const LANGUAGE_CODES = ['fr', 'en', 'pt', 'es', 'de', 'it', 'nl', 'zh', 'ar', 'ja'] as const;

/* ---------- Shared stores ---------- */

/** A screen opened later than this after the last load refreshes the list. */
const STALE_MS = 30_000;

function createStore<T>(route: string) {
  let token: string | null = null;
  let state: LoadState<T> = { status: 'loading' };
  let loadedAt = 0;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: LoadState<T>) => {
    state = next;
    listeners.forEach((l) => l());
  };

  /** `fresh`: after a change, don't reuse a load that started before it. */
  const load = (fresh = false): Promise<void> => {
    if (!token) return Promise.resolve();
    if (inflight) return fresh ? inflight.then(() => load()) : inflight;
    const asked = token;
    inflight = houseApi<T>(route, { token: asked })
      .then((data) => {
        if (token !== asked) return;
        loadedAt = Date.now();
        emit({ status: 'ready', data });
      })
      // A failed refresh keeps what is on screen.
      .catch(() => {
        if (token === asked && state.status !== 'ready') emit({ status: 'error' });
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    /** Another student signed in (or signed out): forget the previous data. */
    bind(next: string | null) {
      if (next === token) return;
      token = next;
      state = { status: 'loading' };
      loadedAt = 0;
      inflight = null;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => state,
    load,
    /** On screen open: load once, then only when stale. */
    ensure() {
      if (state.status !== 'ready' || Date.now() - loadedAt > STALE_MS) load();
    },
    /** "Réessayer" shows the spinner again; pull-to-refresh keeps the data on screen. */
    reload() {
      if (state.status === 'error') emit({ status: 'loading' });
      return load();
    },
    /** Local change shown at once, before the server confirms it. */
    patch(fn: (data: T) => T) {
      if (state.status === 'ready') emit({ status: 'ready', data: fn(state.data) });
    },
    set(data: T) {
      loadedAt = Date.now();
      emit({ status: 'ready', data });
    },
  };
}

type Store<T> = ReturnType<typeof createStore<T>>;

const visitorsStore = createStore<VisitorsData>('visitors');
const packagesStore = createStore<PackagesData>('packages');
const profileStore = createStore<MyProfileData>('profile');
const roommatesStore = createStore<RoommateProfilesData>('roommate-profiles');

function useStore<T>(store: Store<T>) {
  const { token } = useAuth();
  store.bind(token);
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  useEffect(() => {
    store.ensure();
  }, [store, token]);
  const reload = useCallback(() => store.reload(), [store]);
  return { state, reload };
}

export const useVisitors = () => useStore(visitorsStore);
export const usePackages = () => useStore(packagesStore);
export const useMyProfile = () => useStore(profileStore);
export const useRoommateProfiles = () => useStore(roommatesStore);

/* ---------- Actions ---------- */

export type VisitorInput = { id?: string; name: string; date: string; time: string | null; note: string | null };
export type ParcelInput = { id?: string; description: string; carrier: string | null; expectedDate: string | null };
export type ProfileInput = SocialProfile;

/**
 * Everything the student can change. Saves wait for the list to refresh (so the screen behind shows the
 * change); quick actions update the screen at once. Failures throw AppApiError
 * (invalid, notFound, limit, noRental, network, server).
 */
export function useHouseSocialActions() {
  const { token } = useAuth();

  return useMemo(() => {
    async function run<T>(route: string, body: unknown) {
      if (!token) throw new AppApiError('unauthorized');
      return houseApi<T>(route, { token, body });
    }
    /**
     * Optimistic change, then the server. On failure the list goes back at once to what it was before the change
     * (offline, a reload fails too and left the change on screen: review, 2026-11-10), then refreshes in the
     * background when the server can be reached.
     */
    async function quick<T>(store: Store<T>, fn: (data: T) => T, route: string, body: unknown) {
      const before = store.get();
      store.patch(fn);
      const changed = store.get();
      try {
        await run(route, body);
      } catch (e) {
        // Only while nothing newer (a reload, another session) has replaced the list in the meantime.
        if (before.status === 'ready' && store.get() === changed) store.patch(() => before.data);
        store.load(true);
        throw e;
      }
      store.load(true);
    }

    return {
      async saveVisitor(input: VisitorInput) {
        const r = await run<{ id: string }>('visitor-save', input);
        await visitorsStore.load(true);
        return r.id;
      },
      cancelVisitor: (id: string) =>
        quick(visitorsStore, (d) => ({ ...d, visitors: d.visitors.filter((v) => v.id !== id) }), 'visitor-cancel', { id }),
      /** Not critical: the WhatsApp message is already open; a failure only leaves the visit "not told". */
      markVisitorNotified(id: string) {
        const at = new Date().toISOString();
        return quick(
          visitorsStore,
          (d) => ({ ...d, visitors: d.visitors.map((v) => (v.id === id ? { ...v, notifiedAt: at } : v)) }),
          'visitor-notified',
          { id },
        ).catch(() => {});
      },
      async saveParcel(input: ParcelInput) {
        const r = await run<{ id: string }>('package-save', input);
        await packagesStore.load(true);
        return r.id;
      },
      parcelPicked(id: string) {
        const at = new Date().toISOString();
        return quick(
          packagesStore,
          (d) => ({
            packages: d.packages.map((p) => (p.id === id ? { ...p, status: 'picked_up' as const, pickedUpAt: at } : p)),
          }),
          'package-picked',
          { id },
        );
      },
      cancelParcel: (id: string) =>
        quick(packagesStore, (d) => ({ packages: d.packages.filter((p) => p.id !== id) }), 'package-cancel', { id }),
      async saveProfile(input: ProfileInput) {
        const r = await run<MyProfileData>('profile-save', input);
        profileStore.set({ profile: r.profile });
        return r.profile;
      },
    };
  }, [token]);
}

/** What to tell the student when an action fails. */
export function houseSocialErrorText(error: unknown, t: Strings, fallback: 'server' | 'action') {
  const code = error instanceof AppApiError ? error.code : 'server';
  const e = t.houseSocial.errors;
  if (code === 'links') return t.common.noLinks;
  if (code === 'invalid') return e.invalid;
  if (code === 'notFound') return e.notFound;
  if (code === 'limit') return e.limit;
  return e[fallback];
}

/* ---------- Dates (Belo Horizonte, UTC−3 all year) ---------- */

/** Today in Belo Horizonte, YYYY-MM-DD (the app's one helper, lib/bh-time.ts). */
export const todayInBH = (now = Date.now()) => bhToday(now);

export function plusDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const localDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Upcoming (today and later, soonest first) and past (latest first). */
export function splitVisits(visitors: Visitor[], today = todayInBH()) {
  const upcoming = visitors.filter((v) => v.date >= today);
  const past = visitors.filter((v) => v.date < today).reverse();
  return { upcoming, past };
}

/** "aujourd’hui", "demain", "samedi" (this week), "sam. 22 nov." · "today", "tomorrow", "Saturday", "Sat, Nov 22". */
export function relativeDay(iso: string, t: Strings, lang: Lang, today = todayInBH()) {
  if (iso === today) return t.houseSocial.today;
  if (iso === plusDays(today, 1)) return t.houseSocial.tomorrow;
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  if (iso <= plusDays(today, 6)) return localDate(iso).toLocaleDateString(locale, { weekday: 'long' });
  return localDate(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Aujourd’hui · 20h00", "Sam. 15 nov. · 20h00" · "Today · 8:00 PM", "Sat, Nov 15 · 8:00 PM". */
export function visitWhen(visit: Pick<Visitor, 'date' | 'time'>, t: Strings, lang: Lang, today = todayInBH()) {
  const day =
    visit.date === today
      ? t.requests.today
      : visit.date === plusDays(today, 1)
        ? t.requests.tomorrow
        : capitalize(formatDayDate(visit.date, lang, true));
  return [day, visit.time && formatTime(visit.time, lang)].filter(Boolean).join(' · ');
}

/** A database timestamp as a Belo Horizonte day and time: "8 nov. · 14h00" · "Nov 8 · 2:00 PM". */
export function bhStamp(at: string, lang: Lang) {
  const local = new Date(Date.parse(at) - 3 * 3_600_000).toISOString();
  const day = localDate(local.slice(0, 10)).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
  return `${day} · ${formatTime(local.slice(11, 16), lang)}`;
}

/* ---------- Live status lines for the Maison tab ---------- */

/** "1 visite samedi", "2 visites, la prochaine demain"; null while loading or when nothing is planned. */
export function useVisitorsStatus() {
  const { t, lang } = useI18n();
  const { state } = useVisitors();
  if (state.status !== 'ready') return null;
  const { upcoming } = splitVisits(state.data.visitors);
  if (upcoming.length === 0) return null;
  return t.houseSocial.visitors.tileStatus(upcoming.length, relativeDay(upcoming[0].date, t, lang));
}

/** "1 colis arrivé" first, then "2 colis attendus"; null while loading or when there is none. */
export function usePackagesStatus() {
  const { t } = useI18n();
  const { state } = usePackages();
  if (state.status !== 'ready') return null;
  const arrived = state.data.packages.filter((p) => p.status === 'arrived').length;
  if (arrived > 0) return t.houseSocial.packages.tileArrived(arrived);
  const expected = state.data.packages.filter((p) => p.status === 'expected').length;
  if (expected > 0) return t.houseSocial.packages.tileExpected(expected);
  return null;
}

/* ---------- The message for the porteiro (always Portuguese, his language) ---------- */

const PT_WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "hoje, 08/11", "amanhã, 09/11", "no sábado, 15/11", "na segunda-feira, 17/11". */
function ptDay(iso: string, today: string) {
  const d = localDate(iso);
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (iso === today) return `hoje, ${date}`;
  if (iso === plusDays(today, 1)) return `amanhã, ${date}`;
  const weekday = PT_WEEKDAYS[d.getDay()];
  return `${d.getDay() === 0 || d.getDay() === 6 ? 'no' : 'na'} ${weekday}, ${date}`;
}

/** "por volta das 20h", "por volta das 20h30", "por volta da 1h", "por volta do meio-dia". */
function ptTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (m === 0 && h === 0) return 'por volta da meia-noite';
  if (m === 0 && h === 12) return 'por volta do meio-dia';
  return `por volta ${h === 1 ? 'da' : 'das'} ${h}h${m ? pad(m) : ''}`;
}

/**
 * "Olá! Sou Léa, do apartamento 802. Vou receber a visita de João Silva no sábado, 15/11, por volta das 20h."
 * Sent to the Chez Toi team (no portaria number yet), it names the apartment and asks them to pass it on.
 */
export function portariaMessage({
  visitor,
  firstName,
  fullName,
  unit,
  apartmentName,
  toTeam,
  today = todayInBH(),
}: {
  visitor: Pick<Visitor, 'name' | 'date' | 'time'>;
  firstName: string;
  fullName: string;
  unit: string;
  apartmentName: string;
  toTeam: boolean;
  today?: string;
}) {
  const where = unit ? (/^\d/.test(unit) ? `, do apartamento ${unit}` : ` (${unit})`) : '';
  const building = toTeam && apartmentName ? ` (${apartmentName})` : '';
  const who = toTeam ? fullName || firstName : firstName;
  const when = [ptDay(visitor.date, today), visitor.time && ptTime(visitor.time)].filter(Boolean).join(', ');
  const visit = `Vou receber a visita de ${visitor.name.trim()} ${when}.`;
  const ask = toTeam ? ' Vocês podem avisar a portaria, por favor?' : '';
  return `Olá! Sou ${who}${where}${building}. ${visit}${ask}`;
}

/* ---------- Profiles ---------- */

/** "Français" · "French"; unknown codes as written. */
export function languageName(code: string, t: Strings) {
  const names = t.houseSocial.profile.languageNames as Record<string, string>;
  return names[code] ?? code.toUpperCase();
}

/** "@lea.m", "instagram.com/lea.m" or "lea.m" → "lea.m"; null when empty, undefined when not a valid name. */
export function instagramHandle(raw: string): string | null | undefined {
  const handle = raw
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '');
  if (!handle) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : undefined;
}

/** True when the student wrote at least one thing (an empty profile isn't worth showing). */
export const hasContent = (p: SocialProfile | null | undefined): p is SocialProfile =>
  !!p && !!(p.school || p.hometown || p.about || p.instagram || p.languages.length);
