// The new object API of expo-calendar (`expo-calendar` / `expo-calendar/next` in SDK 58) throws in
// Expo Go; the legacy functional API works both in Expo Go and in a dev build.
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import { Brand } from '@/constants/theme';
import type { Lang } from '@/i18n';
import { strings } from '@/i18n/strings';
import { upcomingCleanings } from '@/lib/cleaning';
import { formatBrl, formatTime } from '@/lib/format';
import { myChoreWeeks, requestLabel, requestStart, upcomingRequests } from '@/lib/reminders';
import { setCalendarSync } from '@/store/actions';
import { addDays, atTime, isoDate, parseDate } from '@/store/dates';
import { getState, type State } from '@/store/index';
import { stay } from '@/store/seed';
import { invoices } from '@/store/selectors';

/**
 * Phone calendar sync: a dedicated "Chez Toi BH" calendar on the device, filled with the
 * student's rent due dates, cleaning visits, scheduled requests/bookings, move-out day (and
 * chores if chosen). Each event has a stable key; `state.calendarSync.eventIds` maps key →
 * device event id so a resync updates instead of duplicating, and removes what disappeared.
 *
 * This file covers the DEVICE calendar only. Wave 9 adds a personal .ics subscription link
 * served by Supabase (an edge function per resident token) for Google Calendar / Outlook, which
 * also keeps the laptop calendar in sync without the app being opened.
 */

export type CalendarSyncResult =
  | { ok: true; count: number }
  | { ok: false; reason: 'denied' | 'unavailable' | 'failed'; error?: unknown };

type PlannedEvent = {
  key: string;
  title: string;
  notes?: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

/* ---------- Which events ---------- */

/** All-day events: Android stores them at UTC midnight, iOS in local time. */
function allDayRange(iso: string): { start: Date; end: Date } {
  const d = parseDate(iso);
  if (Platform.OS === 'android') {
    return {
      start: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
      end: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1)),
    };
  }
  return { start: d, end: d };
}

const hoursLater = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

export function plannedEvents(state: State, lang: Lang, now = new Date()): PlannedEvent[] {
  const t = strings[lang].reminders;
  const topics = state.calendarSync.topics;
  const today = isoDate(now);
  const out: PlannedEvent[] = [];

  if (topics.rent) {
    for (const inv of invoices(state, now)) {
      if (inv.status === 'paid' || inv.dueDate < today) continue;
      out.push({
        key: `rent-${inv.month}`,
        title: t.event.rent(formatBrl(inv.totalBrl, lang)),
        allDay: true,
        ...allDayRange(inv.dueDate),
      });
    }
  }

  if (topics.cleaning) {
    for (const visit of upcomingCleanings) {
      if (visit.date < today) continue;
      const start = atTime(visit.date, visit.time);
      out.push({ key: `cleaning-${visit.date}`, title: t.event.cleaning, start, end: hoursLater(start, 1), allDay: false });
    }
  }

  if (topics.requests) {
    for (const r of upcomingRequests(state, now)) {
      const start = atTime(r.date, requestStart(r));
      const end = r.kind === 'gourmet' ? atTime(r.date, r.endTime) : hoursLater(start, 1);
      out.push({ key: `request-${r.id}`, title: requestLabel(r, lang), notes: r.note, start, end, allDay: false });
    }
  }

  if (topics.checkout && stay.moveOut >= today) {
    out.push({
      key: 'checkout',
      title: t.event.checkout,
      notes: t.event.checkoutNotes(formatTime(stay.checkOutTime, lang)),
      allDay: true,
      ...allDayRange(stay.moveOut),
    });
  }

  if (topics.chores) {
    for (const week of myChoreWeeks(state, lang, now)) {
      if (isoDate(addDays(parseDate(week.weekStart), 6)) < today) continue;
      out.push({
        key: `chores-${week.weekStart}`,
        title: t.event.chores(week.names.join(', ')),
        allDay: true,
        ...allDayRange(week.weekStart),
      });
    }
  }

  return out;
}

/* ---------- The Chez Toi calendar ---------- */

async function findOrCreateCalendar(lang: Lang, knownId?: string): Promise<{ id: string; fresh: boolean }> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const name = strings[lang].reminders.calendarName;
  const existing =
    (knownId && calendars.find((c) => c.id === knownId)) ||
    calendars.find((c) => c.title === name && c.allowsModifications);
  if (existing) return { id: existing.id, fresh: existing.id !== knownId };

  let source: Calendar.Source;
  if (Platform.OS === 'ios') {
    try {
      source = (await Calendar.getDefaultCalendarAsync()).source;
    } catch {
      const sources = await Calendar.getSourcesAsync();
      source =
        sources.find((s) => s.type === Calendar.SourceType.LOCAL) ??
        sources.find((s) => s.type === Calendar.SourceType.CALDAV) ??
        sources[0];
    }
  } else {
    source = { isLocalAccount: true, name, type: 'LOCAL' };
  }

  const id = await Calendar.createCalendarAsync({
    title: name,
    name: 'chez-toi-bh',
    color: Brand.red,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  return { id, fresh: true };
}

/* ---------- Sync ---------- */

let running: Promise<CalendarSyncResult> | null = null;

/**
 * Asks for calendar permission if needed (the system prompt only shows the first time), then
 * makes the Chez Toi calendar match the current state. Concurrent calls share one run.
 */
export function syncCalendar(state: State, lang: Lang): Promise<CalendarSyncResult> {
  if (!running) {
    running = doSync(state, lang).finally(() => {
      running = null;
    });
  }
  return running;
}

async function doSync(state: State, lang: Lang): Promise<CalendarSyncResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unavailable' };
  try {
    const perm = await Calendar.requestCalendarPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const { id: calendarId, fresh } = await findOrCreateCalendar(lang, state.calendarSync.calendarId);
    // A recreated calendar has none of the old events: forget their ids.
    const previous = fresh ? {} : state.calendarSync.eventIds;
    const planned = plannedEvents(state, lang);
    const eventIds: Record<string, string> = {};

    for (const ev of planned) {
      const details = {
        title: ev.title,
        notes: ev.notes ?? '',
        startDate: ev.start,
        endDate: ev.end,
        allDay: ev.allDay,
        alarms: [],
        timeZone: ev.allDay && Platform.OS === 'android' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const known = previous[ev.key];
      if (known) {
        try {
          await Calendar.updateEventAsync(known, details);
          eventIds[ev.key] = known;
          continue;
        } catch {
          // Deleted by the student in the calendar app: create it again below.
        }
      }
      eventIds[ev.key] = await Calendar.createEventAsync(calendarId, details);
    }

    for (const [key, id] of Object.entries(previous)) {
      if (eventIds[key]) continue;
      await Calendar.deleteEventAsync(id).catch(() => {});
    }

    setCalendarSync({ calendarId, eventIds, lastSyncAt: new Date().toISOString() });
    return { ok: true, count: planned.length };
  } catch (error) {
    return { ok: false, reason: 'failed', error };
  }
}

/** Turns the sync off and removes our calendar (and so every event in it) from the phone. */
export async function disableCalendar(): Promise<void> {
  const { calendarId } = getState().calendarSync;
  setCalendarSync({ enabled: false, calendarId: undefined, eventIds: {}, lastSyncAt: undefined });
  if (Platform.OS === 'web' || !calendarId) return;
  try {
    const perm = await Calendar.getCalendarPermissionsAsync();
    if (perm.granted) await Calendar.deleteCalendarAsync(calendarId);
  } catch {
    // Already deleted by the student: nothing to do.
  }
}

/** Whether calendar access is already granted (never prompts). */
export async function hasCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await Calendar.getCalendarPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
