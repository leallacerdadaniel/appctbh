/**
 * Belo Horizonte time (UTC−3 all year, no daylight saving). "Today" in the app is today in BH, not the phone's day:
 * students' phones are often still on European time, and the team, the rent and the cleanings follow BH.
 * No imports on purpose, so that `lib/` and `components/` can both use it without cycles.
 */

export const BH_OFFSET_MS = 3 * 3_600_000;

/** Today in Belo Horizonte (YYYY-MM-DD), whatever the phone's time zone. */
export const bhToday = (now = Date.now()) => new Date(now - BH_OFFSET_MS).toISOString().slice(0, 10);

/** The hour in Belo Horizonte right now, 0 to 23. */
export const bhHour = (now = Date.now()) => new Date(now - BH_OFFSET_MS).getUTCHours();

/** An instant as BH reads it: "2026-11-21T01:30:00Z" → { date: "2026-11-20", time: "22:30" }; null when unreadable. */
export function bhDateTime(at: string) {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return null;
  const local = new Date(ms - BH_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** YYYY-MM-DD plus `n` days (calendar days: no clock change can lose or repeat one). */
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
