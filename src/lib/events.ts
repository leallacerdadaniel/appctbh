import type { Lang } from '@/i18n';
import { bhDateTime, bhToday } from '@/lib/bh-time';
import type { CleaningVisit } from '@/lib/cleaning';
import type { ChezEvent, Trip } from '@/lib/community';
import type { StudentDate } from '@/lib/home';
import { holidaysForYear, type HolidayKind } from '@/lib/holidays';

/** `chezToi`: an event organised by the team · `trip`: a group trip the student is part of (community). */
export type EventKind = HolidayKind | 'cleaning' | 'contract' | 'chezToi' | 'trip';

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  /** Last day of something that runs over several days (group trips). */
  endDate?: string;
  kind: EventKind;
  title: Record<Lang, string>;
  /** Original Portuguese name, shown as a hint for holidays. */
  ptName?: string;
  time?: string;
  /** Where it happens (Chez Toi events). */
  venue?: string;
  /** The student answered "J’y vais" (Chez Toi events). */
  going?: boolean;
  /** The page a tap opens (Chez Toi events and group trips). */
  href?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/* ---------- Belo Horizonte time: one helper for the whole app, in lib/bh-time.ts ---------- */

export { bhDateTime, bhToday };

/** Every day from `from` to `to`, both included (YYYY-MM-DD); `max` guards against a wrong end date. */
export function daysBetween(from: string, to: string, max = 62) {
  const days: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return days;
  while (days.length < max) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > to && days.length > 0) break;
    days.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** Is the event on that day? (a trip covers every day from its start to its end) */
export const isOnDay = (e: CalendarEvent, iso: string) => e.date <= iso && iso <= (e.endDate ?? e.date);

/** By day, then by time; what has no time (holidays, trips) comes first. */
export const byDateTime = (a: CalendarEvent, b: CalendarEvent) =>
  a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');

export type StudentDates = {
  cleanings: CleaningVisit[];
  /** Filled in on the site. No arrival event without it: the contract start is not the arrival. */
  arrival: StudentDate | null;
  departure: StudentDate | null;
  /** Contract start and end. */
  moveIn: string;
  moveOut: string;
};

/** Holidays for the given years + the student's cleanings, arrival and departure (real data). */
export function buildEvents(years: number[], student: StudentDates): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const year of years) {
    for (const h of holidaysForYear(year)) {
      events.push({
        id: `h-${h.date}-${h.name.pt}`,
        date: h.date,
        kind: h.kind,
        title: { fr: h.name.fr, en: h.name.en },
        ptName: h.name.pt,
      });
    }
  }

  for (const c of student.cleanings) {
    events.push({
      id: `c-${c.date}`,
      date: c.date,
      kind: 'cleaning',
      title: { fr: 'Ménage', en: 'Cleaning' },
      time: c.time || undefined,
    });
  }

  if (student.arrival) {
    events.push({
      id: 'move-in',
      date: student.arrival.date,
      kind: 'contract',
      title: { fr: 'Arrivée dans l’appartement', en: 'Move‑in day' },
      time: student.arrival.time || undefined,
    });
  }
  events.push(
    student.departure
      ? {
          id: 'move-out',
          date: student.departure.date,
          kind: 'contract',
          title: { fr: 'Départ de l’appartement', en: 'Move‑out day' },
          time: student.departure.time || undefined,
        }
      : { id: 'move-out', date: student.moveOut, kind: 'contract', title: { fr: 'Fin du contrat', en: 'End of contract' } },
  );

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The community in the Agenda: the Chez Toi events that are on (not the cancelled ones), on their day in Belo
 * Horizonte, and the published group trips the student is part of, from the first to the last day.
 */
export function communityEvents(events: ChezEvent[], trips: Trip[]): CalendarEvent[] {
  const list: CalendarEvent[] = [];
  for (const e of events) {
    const start = bhDateTime(e.startsAt);
    if (e.cancelled || !start) continue;
    list.push({
      id: `ce-${e.id}`,
      date: start.date,
      kind: 'chezToi',
      title: { fr: e.title.fr || e.title.en, en: e.title.en || e.title.fr },
      time: start.time,
      venue: e.venue || undefined,
      going: e.myRsvp === 'going',
      href: `/community/events/${e.id}`,
    });
  }
  for (const t of trips) {
    if (!t.joined || t.status !== 'published' || !t.startsOn) continue;
    list.push({
      id: `tr-${t.id}`,
      date: t.startsOn,
      endDate: t.endsOn > t.startsOn ? t.endsOn : undefined,
      kind: 'trip',
      title: { fr: t.destination, en: t.destination },
      href: `/community/trips/${t.id}`,
    });
  }
  return list.sort(byDateTime);
}
