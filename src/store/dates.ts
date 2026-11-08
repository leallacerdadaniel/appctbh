import type { IsoDate, Month } from './types';

/** Local calendar helpers (no time zones: everything is Belo Horizonte local time). */

export const isoDate = (d: Date): IsoDate =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parseDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

export const monthOf = (iso: IsoDate): Month => iso.slice(0, 7);

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Monday of the week that contains `d`, as ISO date. */
export function mondayOf(d: Date): IsoDate {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return isoDate(out);
}

/** Whole days from `from` to `to` (both ISO dates). */
export function daysBetween(from: IsoDate, to: IsoDate) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export const todayIso = () => isoDate(new Date());

/** Combines an ISO date and HH:MM into a local Date. */
export function atTime(date: IsoDate, hhmm: string): Date {
  const d = parseDate(date);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
