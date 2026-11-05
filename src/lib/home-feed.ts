import { daysUntil } from '@/lib/cleaning';
import { buildEvents, parseIso, toIso, type CalendarEvent, type EventKind, type StudentDates } from '@/lib/events';

/**
 * "À venir" on the Home screen: the next dates from data the app already has.
 */

/** Days before move-out when the departure shows up in "À venir". */
const MOVE_OUT_NOTICE = 30;
const MAX_UPCOMING = 4;

/**
 * Next cleaning + next holidays + move-in/out when relevant, soonest first. Before arrival, the rest starts on
 * move-in day, but a cleaning scheduled before arrival (the move-in prep) still shows.
 */
export function upcomingEvents(
  student: StudentDates,
  today = new Date(),
): UpcomingEvent[] {
  const year = today.getFullYear();
  const todayIso = toIso(today);
  const start = student.arrival?.date ?? student.moveIn;
  const from = start > todayIso ? start : todayIso;
  const scheduled = student.cleanings.filter((c) => c.status === 'scheduled');
  const events = buildEvents([year, year + 1], { ...student, cleanings: scheduled }).filter((e) => e.date >= (e.kind === 'cleaning' ? todayIso : from));

  let cleaningShown = false;
  const kept: UpcomingEvent[] = [];
  for (const e of events) {
    if (e.kind === 'cleaning') {
      if (cleaningShown) continue;
      cleaningShown = true;
    }
    if (e.id === 'move-out' && daysUntil(e.date, today) > MOVE_OUT_NOTICE) continue;

    // Holidays on consecutive days (Carnival Monday, Tuesday, Ash Wednesday) become one row.
    const prev = kept.at(-1);
    if (prev && isHoliday(prev) && isHoliday(e) && daysUntil(e.date, parseIso(prev.endDate ?? prev.date)) === 1) {
      prev.endDate = e.date;
      if (e.ptName === 'Carnaval' || prev.ptName === 'Carnaval') {
        prev.title = { fr: 'Carnaval', en: 'Carnival' };
        prev.ptName = 'Carnaval';
      } else if (RANK[e.kind] > RANK[prev.kind]) {
        // Name the row after the real holiday (Good Friday, not the optional Thursday before it).
        prev.title = e.title;
        prev.kind = e.kind;
        prev.ptName = e.ptName;
      }
      continue;
    }
    kept.push({ ...e });
  }
  return kept.slice(0, MAX_UPCOMING);
}

export type UpcomingEvent = CalendarEvent & { endDate?: string };

const isHoliday = (e: CalendarEvent) => e.kind !== 'cleaning' && e.kind !== 'contract';
const RANK: Record<EventKind, number> = { optional: 0, city: 1, national: 2, cleaning: 0, contract: 0 };
