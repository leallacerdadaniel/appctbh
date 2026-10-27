import type { Lang } from '@/i18n';
import type { CleaningVisit } from '@/lib/cleaning';
import { holidaysForYear, type HolidayKind } from '@/lib/holidays';

export type EventKind = HolidayKind | 'cleaning' | 'contract';

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: EventKind;
  title: Record<Lang, string>;
  /** Original Portuguese name, shown as a hint for holidays. */
  ptName?: string;
  time?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Holidays for the given years + the student's cleanings and move‑in/out (real data). */
export function buildEvents(
  years: number[],
  student: { cleanings: CleaningVisit[]; moveIn: string; moveOut: string },
): CalendarEvent[] {
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

  events.push(
    { id: 'move-in', date: student.moveIn, kind: 'contract', title: { fr: 'Arrivée dans l’appartement', en: 'Move‑in day' } },
    { id: 'move-out', date: student.moveOut, kind: 'contract', title: { fr: 'Départ de l’appartement', en: 'Move‑out day' } },
  );

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
