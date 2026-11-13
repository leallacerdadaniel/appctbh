import { useState } from 'react';

import { attractions, getAttraction } from '@/lib/attractions';
import { daysUntil } from '@/lib/cleaning';
import { useHome, type Home } from '@/lib/home';
import { monthOf, useJournal, type Journal, type RecapPhoto } from '@/lib/journal';
import { MUST_GO } from '@/lib/must-go';
import { getNightPlace, nightPlaces } from '@/lib/nightlife';
import { dayKey, usePortugueseProgress } from '@/lib/portuguese-progress';
import { guideNeighborhood, type PlaceRef } from '@/lib/recap-geo';
import { displayName, getRestaurant } from '@/lib/restaurants';
import { useVisits, type Visit, type VisitKind } from '@/lib/visited';

/**
 * Monthly recaps and the semester recap (owner, 2026-11-08: "um monthly recap… tem que ter mais a ver com o
 * que eles fizeram… pensa no recap do Spotify"). A month's recap is ready on the 1st of the next month; the
 * current month shows "jusqu'ici" from the 7th. The semester recap opens in the last three weeks.
 *
 * Built only from what is on the phone: "J'y suis allé" check-ins (src/lib/visited.ts), "Ta carte de BH"
 * points and the month's photos (src/lib/journal.ts), Portuguese progress. A slide without data is skipped,
 * never filled with a made-up number.
 */

/** The current month's recap opens on this day of the month. */
const PROGRESS_FROM_DAY = 7;
/** The last three weeks of the stay (and after it): the semester recap. */
const END_WINDOW_DAYS = 21;
/** Fewer days than this in BH: no semester recap yet. */
const MIN_STAY_DAYS = 14;
const MAX_TEASERS = 3;
const MAX_RECAP_PHOTOS = 6;

export type RecapScope = { kind: 'month'; month: string } | { kind: 'semester' };
export type RecapRange = { from: string; to: string; days: number; status: 'ready' | 'progress' };
export type RecapMonth = RecapRange & { month: string };

/* ---------- Dates ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days from `from` to `to`, both included. */
const daysIn = (from: string, to: string) => daysUntil(to, toDate(from)) + 1;

function stay(home: Home) {
  return {
    start: home.contract.arrival?.date ?? home.contract.moveIn,
    end: home.contract.departure?.date ?? home.contract.moveOut,
  };
}

/** Months of the stay that have a recap, newest first: ready once the month is over, in progress from the 7th. */
export function recapMonths(home: Home, today = new Date()): RecapMonth[] {
  const { start, end } = stay(home);
  if (!start || !end) return [];
  const now = dayKey(today);
  const last = monthOf(end < now ? end : now);
  const months: RecapMonth[] = [];
  let [y, m] = start.split('-').map(Number);
  for (let guard = 0; guard < 36; guard += 1) {
    const month = `${y}-${pad(m)}`;
    if (month > last) break;
    const monthEnd = dayKey(new Date(y, m, 0));
    const from = start > `${month}-01` ? start : `${month}-01`;
    const to = [end, monthEnd, now].sort()[0];
    const ready = now > monthEnd || now > end;
    const progress = !ready && today.getDate() >= PROGRESS_FROM_DAY;
    if (from <= to && (ready || progress)) {
      months.push({ month, from, to, days: daysIn(from, to), status: ready ? 'ready' : 'progress' });
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months.reverse();
}

/** The whole stay so far, once in its last three weeks (or after it). */
export function semesterRange(home: Home, today = new Date()): RecapRange | null {
  const { start, end } = stay(home);
  if (!start || !end) return null;
  const now = dayKey(today);
  if (daysIn(start, now) - 1 < MIN_STAY_DAYS || daysUntil(end, today) > END_WINDOW_DAYS) return null;
  const to = end < now ? end : now;
  return { from: start, to, days: daysIn(start, to), status: 'ready' };
}

export function scopeRange(home: Home, scope: RecapScope, today = new Date()): RecapRange | null {
  if (scope.kind === 'semester') return semesterRange(home, today);
  return recapMonths(home, today).find((m) => m.month === scope.month) ?? null;
}

/** The days of a month that belong to the stay and are past (for the journal), even before its recap opens. */
export function monthSpan(home: Home, month: string, today = new Date()) {
  const { start, end } = stay(home);
  if (!start || !end || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const from = start > `${month}-01` ? start : `${month}-01`;
  const to = [end, dayKey(new Date(y, m, 0)), dayKey(today)].sort()[0];
  return from <= to ? { from, to } : null;
}

/** The current month ("2026-11"). */
export const thisMonth = (today = new Date()) => monthOf(dayKey(today));

export const recapId = (scope: RecapScope) => (scope.kind === 'semester' ? 'semester' : scope.month);

export function parseRecapId(id: string | undefined): RecapScope | null {
  if (id === 'semester') return { kind: 'semester' };
  return id && /^\d{4}-\d{2}$/.test(id) ? { kind: 'month', month: id } : null;
}

/** What Accueil invites to: the semester at the end, else the latest month that is ready, else the current one. */
export function latestRecap(home: Home, today = new Date()): { scope: RecapScope; range: RecapRange } | null {
  const semester = semesterRange(home, today);
  if (semester) return { scope: { kind: 'semester' }, range: semester };
  const months = recapMonths(home, today);
  const pick = months.find((m) => m.status === 'ready') ?? months[0];
  return pick ? { scope: { kind: 'month', month: pick.month }, range: pick } : null;
}

/** "Rua Turfa, 833 - Prado. Belo Horizonte - MG" → "Prado". */
export function neighborhoodOf(address: string) {
  const [, ...rest] = address.replace(/[\s.,-]*Belo Horizonte.*$/, '').split(/\s+-\s+/);
  return rest.join(' – ').trim() || null;
}

/* ---------- Timeline ---------- */

export type TimelineSource = 'checkin' | 'location' | 'photo';

/** One line of the journal: a guide place, or a city / neighbourhood. */
export type TimelineEntry = {
  key: string;
  day: string;
  source: TimelineSource;
  /** Place id for a check-in, ping id, photo id: what "Retirer" removes. */
  refId: string;
  place: PlaceRef | null;
  city: string | null;
  neighborhood: string | null;
  outside: boolean;
};

export function timelineEntries(visits: Visit[], journal: Journal, from: string, to: string): TimelineEntry[] {
  const inRange = (day: string | null): day is string => !!day && day >= from && day <= to;
  const entries: TimelineEntry[] = [
    ...visits
      .filter((v) => inRange(v.date))
      .map((v) => ({
        key: `c-${v.id}`,
        day: v.date,
        source: 'checkin' as const,
        refId: v.id,
        place: { id: v.id, kind: v.kind, name: v.name },
        city: null,
        neighborhood: guideNeighborhood(v.id),
        outside: false,
      })),
    ...journal.pings
      .filter((p) => inRange(p.day))
      .map((p) => ({
        key: `l-${p.id}`,
        day: p.day,
        source: 'location' as const,
        refId: p.id,
        place: p.place,
        city: p.city,
        neighborhood: p.place ? guideNeighborhood(p.place.id) ?? p.neighborhood : p.neighborhood,
        outside: p.outside,
      })),
    ...journal.photos
      .filter((p) => inRange(p.day) && (p.place || p.city || p.outside))
      .map((p) => ({
        key: `p-${p.id}`,
        day: p.day!,
        source: 'photo' as const,
        refId: p.id,
        place: p.place,
        city: p.city,
        neighborhood: p.place ? guideNeighborhood(p.place.id) : null,
        outside: !!p.outside,
      })),
  ];
  return entries.sort((a, b) => a.day.localeCompare(b.day));
}

/** Different guide places in the journal between two days. */
export function placesCount(visits: Visit[], journal: Journal, from: string, to: string) {
  return new Set(timelineEntries(visits, journal, from, to).flatMap((e) => (e.place ? [e.place.id] : []))).size;
}

/* ---------- Recap ---------- */

export type RecapPlace = PlaceRef & {
  neighborhood: string | null;
  /** Photo bundled with the app, else the Google photo of `placeId`. */
  photo?: number;
  placeId?: string;
  photoIndex?: number;
  /** Days with a check-in, a point or a photo there. */
  visits: number;
  firstDay: string;
};

export type RecapData = {
  scope: RecapScope;
  status: 'ready' | 'progress';
  firstName: string;
  days: { total: number; bh: number; away: number; cities: string[] };
  places: { count: number; first: RecapPlace; top: RecapPlace | null } | null;
  neighborhood: { name: string; count: number } | null;
  /** Places per kind, most first; only when there are at least two kinds. */
  mix: { kind: VisitKind; count: number }[] | null;
  portuguese: { learned: number; lessons: number; best: number } | null;
  photos: string[];
  /** Must-go places not visited yet, for "Le mois prochain" (months that are not the last one). */
  next: RecapPlace[];
  /** The semester, or the stay's last month: the closing says goodbye. */
  last: boolean;
};

export type SlideKind =
  | 'intro'
  | 'days'
  | 'places'
  | 'top'
  | 'neighborhood'
  | 'mix'
  | 'portuguese'
  | 'photos'
  | 'next'
  | 'closing'
  | 'share';

function describePlace(ref: PlaceRef): Omit<RecapPlace, 'visits' | 'firstDay'> {
  if (ref.kind === 'restaurant') {
    const r = getRestaurant(ref.id);
    return r ? { ...ref, name: displayName(r), neighborhood: r.neighborhood, placeId: r.placeId } : { ...ref, neighborhood: null };
  }
  if (ref.kind === 'attraction') {
    const a = getAttraction(ref.id);
    return a
      ? { ...ref, name: a.name, neighborhood: a.neighborhood, photo: a.photo, placeId: a.placeId, photoIndex: a.photoIndex }
      : { ...ref, neighborhood: null };
  }
  const p = getNightPlace(ref.id);
  return p ? { ...ref, name: p.name, neighborhood: p.neighborhood, photo: p.photo, placeId: p.placeId } : { ...ref, neighborhood: null };
}

/** Portuguese in the scope: a month = its totals minus the previous month's (from the journal's snapshots). */
function portugueseFor(
  scope: RecapScope,
  journal: Journal,
  live: { learned: number; lessons: number; best: number; streak: number },
  today: Date,
): RecapData['portuguese'] {
  if (scope.kind === 'semester') {
    return live.learned > 0 || live.lessons > 0 ? { learned: live.learned, lessons: live.lessons, best: live.best } : null;
  }
  const current = scope.month === monthOf(dayKey(today));
  const snap = journal.pt[scope.month];
  const end = current ? { learned: live.learned, lessons: live.lessons, streak: Math.max(live.streak, snap?.streak ?? 0) } : snap;
  if (!end) return null;
  const before = Object.keys(journal.pt)
    .filter((m) => m < scope.month)
    .sort()
    .pop();
  const prev = before ? journal.pt[before] : null;
  const learned = Math.max(0, end.learned - (prev?.learned ?? 0));
  const lessons = Math.max(0, end.lessons - (prev?.lessons ?? 0));
  return learned > 0 || lessons > 0 ? { learned, lessons, best: end.streak } : null;
}

function pickPhotos(scope: RecapScope, photos: RecapPhoto[], uri: (p: RecapPhoto) => string) {
  if (scope.kind === 'month') return photos.filter((p) => p.month === scope.month).slice(0, MAX_RECAP_PHOTOS).map(uri);
  // Semester: the first photo of each month, then the others.
  const firsts = new Map<string, RecapPhoto>();
  for (const p of photos) if (!firsts.has(p.month)) firsts.set(p.month, p);
  const ordered = [...firsts.values(), ...photos.filter((p) => firsts.get(p.month) !== p)];
  return ordered.slice(0, MAX_RECAP_PHOTOS).map(uri);
}

function teasers(visits: Visit[], journal: Journal): RecapPlace[] {
  const been = new Set([
    ...visits.map((v) => v.id),
    ...journal.pings.flatMap((p) => (p.place ? [p.place.id] : [])),
    ...journal.photos.flatMap((p) => (p.place ? [p.place.id] : [])),
  ]);
  const refs: PlaceRef[] = [
    ...MUST_GO.bh.flatMap((id) => {
      const a = getAttraction(id);
      return a ? [{ id, kind: 'attraction' as const, name: a.name }] : [];
    }),
    ...nightPlaces.filter((p) => !p.closed).map((p) => ({ id: p.id, kind: p.kind, name: p.name })),
    ...attractions.map((a) => ({ id: a.id, kind: 'attraction' as const, name: a.name })),
  ];
  const seen = new Set<string>();
  const out: RecapPlace[] = [];
  for (const ref of refs) {
    if (been.has(ref.id) || seen.has(ref.id)) continue;
    seen.add(ref.id);
    out.push({ ...describePlace(ref), visits: 0, firstDay: '' });
    if (out.length === MAX_TEASERS) break;
  }
  return out;
}

type Sources = {
  scope: RecapScope;
  range: RecapRange;
  home: Home;
  visits: Visit[];
  journal: Journal;
  photoUri: (p: RecapPhoto) => string;
  portuguese: { learned: number; lessons: number; best: number; streak: number };
  today: Date;
};

export function buildRecap({ scope, range, home, visits, journal, photoUri, portuguese, today }: Sources): RecapData {
  const entries = timelineEntries(visits, journal, range.from, range.to);

  // Places: one visit per place and day, whatever the source.
  const byPlace = new Map<string, { ref: PlaceRef; days: Set<string>; first: string }>();
  for (const e of entries) {
    if (!e.place) continue;
    const entry = byPlace.get(e.place.id) ?? { ref: e.place, days: new Set<string>(), first: e.day };
    entry.days.add(e.day);
    if (e.day < entry.first) entry.first = e.day;
    byPlace.set(e.place.id, entry);
  }
  const places = [...byPlace.values()].map((p) => ({ ...describePlace(p.ref), visits: p.days.size, firstDay: p.first }));
  const byFirst = [...places].sort((a, b) => a.firstDay.localeCompare(b.firstDay));
  const byVisits = [...byFirst].sort((a, b) => b.visits - a.visits);
  const top = byVisits[0] && byVisits[0].visits >= 2 ? byVisits[0] : null;

  // Days away: any day with a point or a photo outside BH. The rest counts as BH.
  const awayDays = new Set(entries.filter((e) => e.outside).map((e) => e.day));
  const cities = [
    ...new Set(entries.filter((e) => e.outside && e.city && e.city !== 'Belo Horizonte').map((e) => e.city!)),
  ];
  const away = Math.min(awayDays.size, range.days);

  // Favourite neighbourhood: guide places visited, and points in BH away from home.
  const homeHood = neighborhoodOf(home.apartment.address)?.toLowerCase();
  const hoods = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.outside || !e.neighborhood) continue;
    if (!e.place && e.neighborhood.toLowerCase() === homeHood) continue;
    const marks = hoods.get(e.neighborhood) ?? new Set<string>();
    marks.add(`${e.day}|${e.place?.id ?? e.refId}`);
    hoods.set(e.neighborhood, marks);
  }
  const [hoodName, hoodMarks] = [...hoods.entries()].sort((a, b) => b[1].size - a[1].size)[0] ?? [];
  const neighborhood = hoodName && hoodMarks && hoodMarks.size >= 2 ? { name: hoodName, count: hoodMarks.size } : null;

  const kinds = new Map<VisitKind, number>();
  for (const p of places) kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
  const mix = kinds.size >= 2 ? [...kinds.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count) : null;

  const { end } = stay(home);
  const lastMonth = scope.kind === 'month' && end ? monthOf(end) <= scope.month : true;

  return {
    scope,
    status: range.status,
    firstName: home.student.firstName,
    days: { total: range.days, bh: range.days - away, away, cities },
    places: byFirst.length ? { count: byFirst.length, first: byFirst[0], top } : null,
    neighborhood,
    mix,
    portuguese: portugueseFor(scope, journal, portuguese, today),
    photos: pickPhotos(scope, journal.photos, photoUri),
    next: scope.kind === 'month' && !lastMonth ? teasers(visits, journal) : [],
    last: lastMonth,
  };
}

/** The slides in order; the ones without data are left out. */
export function recapSlides(d: RecapData): SlideKind[] {
  const slides: (SlideKind | false)[] = [
    'intro',
    'days',
    !!d.places && 'places',
    !!d.places?.top && 'top',
    !!d.neighborhood && 'neighborhood',
    !!d.mix && 'mix',
    !!d.portuguese && 'portuguese',
    d.photos.length > 0 && 'photos',
    d.next.length > 0 ? 'next' : 'closing',
    'share',
  ];
  return slides.filter((s): s is SlideKind => !!s);
}

export type ShareStat = { kind: 'places' | 'bhDays' | 'away' | 'phrases'; value: number };

/** Up to four numbers for the share card. */
export function shareStats(d: RecapData): ShareStat[] {
  const stats: (ShareStat | false)[] = [
    !!d.places && { kind: 'places', value: d.places.count },
    d.days.bh > 0 && { kind: 'bhDays', value: d.days.bh },
    d.days.away > 0 && { kind: 'away', value: d.days.away },
    !!d.portuguese && d.portuguese.learned > 0 && { kind: 'phrases', value: d.portuguese.learned },
  ];
  return stats.filter((s): s is ShareStat => !!s).slice(0, 4);
}

/**
 * The recap of one month or of the semester for the signed-in student. `range` is null when that recap
 * isn't available (wrong month, too early). Everything is local, so it is ready as soon as it is read.
 */
export function useRecap(scope: RecapScope | null) {
  const home = useHome();
  const visits = useVisits();
  const journal = useJournal();
  const pt = usePortugueseProgress();
  const [today] = useState(() => new Date());

  const ready = visits.loaded && journal.loaded && pt.loaded;
  const range = scope ? scopeRange(home, scope, today) : null;
  const data =
    ready && scope && range
      ? buildRecap({
          scope,
          range,
          home,
          visits: visits.visits,
          journal: journal.journal,
          photoUri: journal.photoUri,
          portuguese: { learned: pt.learnedCount, lessons: pt.lessons, best: pt.best, streak: pt.streak },
          today,
        })
      : null;
  return { ready, range, data };
}
