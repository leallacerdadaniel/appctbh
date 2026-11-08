import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Lang } from '@/i18n';
import { strings } from '@/i18n/strings';
import { upcomingCleanings } from '@/lib/cleaning';
import { formatBrl, formatShortDate, formatTime } from '@/lib/format';
import { addDays, atTime, isoDate, parseDate } from '@/store/dates';
import type { State } from '@/store/index';
import { ME, stay } from '@/store/seed';
import { choreWeek, invoices, isOpen, serviceById, thisWeek, weekAfter } from '@/store/selectors';
import type { AnyRequest, GourmetBooking, ReminderTopic, ServiceRequest, StayChangeRequest } from '@/store/types';

/**
 * Local reminders (wave 9, local half): everything the app can remind the student of, computed
 * from the store, then scheduled as LOCAL notifications on this phone with expo-notifications.
 * Works in Expo Go. Remote push (team → student, "like Café com Crédito": devices table + DB
 * trigger → push function) needs Supabase and a dev build; see `registerForPushLater` in
 * src/components/reminder-engine.tsx.
 */

export type PlannedReminder = {
  /** Stable key: the same reminder keeps the same key across recomputes. */
  key: string;
  topic: ReminderTopic | 'personal';
  title: string;
  body: string;
  at: Date;
  href?: string;
};

/**
 * Where each reminder opens. Some screens belong to other features; the lead adjusts these
 * paths if a route lands elsewhere.
 */
export const REMINDER_ROUTES = {
  rent: '/apartment/bill',
  cleaning: '/apartment/cleaning',
  request: (id: string) => `/requests/${id}`,
  checkout: '/apartment/contract',
  documents: '/apartment/documents',
  chores: '/house/chores',
  personal: '/reminders',
} as const;

/** Identifier prefix of every notification this app schedules (so we never touch others). */
const PREFIX = 'ctbh-';
/** iOS keeps at most 64 pending local notifications per app; stay under it. */
const MAX_SCHEDULED = 60;
const ANDROID_CHANNEL = 'reminders';

const isWeb = Platform.OS === 'web';

/* ---------- What happens, shared with the calendar sync ---------- */

export type DatedRequest = ServiceRequest | StayChangeRequest | GourmetBooking;

/** Open requests that happen on a date (services, gourmet bookings, stay changes). */
export function upcomingRequests(state: State, now = new Date()): DatedRequest[] {
  const today = isoDate(now);
  return state.requests.filter(
    (r): r is DatedRequest => r.kind !== 'maintenance' && isOpen(r) && r.date >= today,
  );
}

export function requestStart(r: DatedRequest) {
  return r.kind === 'gourmet' ? r.startTime : r.time;
}

/** "Laverie", "Départ tardif", "Espace gourmet réservé". */
export function requestLabel(r: AnyRequest, lang: Lang) {
  const n = strings[lang].reminders.notif;
  switch (r.kind) {
    case 'service':
      return serviceById(r.serviceId)?.name[lang] ?? n.service;
    case 'late_checkout':
      return n.lateCheckout;
    case 'early_checkin':
      return n.earlyCheckin;
    case 'gourmet':
      return n.gourmet;
    default:
      return n.service;
  }
}

/** Weeks (Monday ISO) from this week on where I have chores, with the chore names. */
export function myChoreWeeks(state: State, lang: Lang, now = new Date(), weeks = 4) {
  const start = thisWeek(now);
  const out: { weekStart: string; names: string[] }[] = [];
  for (let i = 0; i < weeks; i += 1) {
    const weekStart = weekAfter(start, i);
    const names = choreWeek(state, weekStart)
      .filter((c) => c.assignee === ME)
      .map((c) => c.chore.name[lang]);
    if (names.length) out.push({ weekStart, names });
  }
  return out;
}

/* ---------- Planning ---------- */

/** Every reminder still to come, filtered by the student's preferences, soonest first. */
export function plannedReminders(state: State, lang: Lang, now = new Date()): PlannedReminder[] {
  const t = strings[lang].reminders;
  const n = t.notif;
  const prefs = state.reminderPrefs;
  const out: PlannedReminder[] = [];
  const add = (r: PlannedReminder) => {
    if (r.at.getTime() > now.getTime()) out.push(r);
  };

  if (prefs.rent) {
    for (const inv of invoices(state, now)) {
      if (inv.status === 'paid') continue;
      const amount = formatBrl(inv.totalBrl, lang);
      const body = n.rentBody(amount, formatShortDate(inv.dueDate, lang));
      add({
        key: `rent-${inv.month}-d3`,
        topic: 'rent',
        title: n.rentSoonTitle,
        body,
        at: atTime(isoDate(addDays(parseDate(inv.dueDate), -3)), '09:00'),
        href: REMINDER_ROUTES.rent,
      });
      add({
        key: `rent-${inv.month}-d0`,
        topic: 'rent',
        title: n.rentTodayTitle,
        body,
        at: atTime(inv.dueDate, '09:00'),
        href: REMINDER_ROUTES.rent,
      });
    }
  }

  if (prefs.cleaning) {
    for (const visit of upcomingCleanings) {
      add({
        key: `cleaning-${visit.date}`,
        topic: 'cleaning',
        title: n.cleaningTitle,
        body: n.cleaningBody(formatTime(visit.time, lang)),
        at: atTime(isoDate(addDays(parseDate(visit.date), -1)), '19:00'),
        href: REMINDER_ROUTES.cleaning,
      });
    }
  }

  if (prefs.requests) {
    for (const r of upcomingRequests(state, now)) {
      const body =
        r.kind === 'gourmet'
          ? n.gourmetBody(formatTime(r.startTime, lang), formatTime(r.endTime, lang))
          : n.requestBody(formatTime(r.time, lang));
      add({
        key: `request-${r.id}`,
        topic: 'requests',
        title: n.requestTitle(requestLabel(r, lang)),
        body,
        at: atTime(isoDate(addDays(parseDate(r.date), -1)), '18:00'),
        href: REMINDER_ROUTES.request(r.id),
      });
    }
  }

  if (prefs.checkout) {
    const body = n.checkoutBody(formatShortDate(stay.moveOut, lang), formatTime(stay.checkOutTime, lang));
    const moveOut = parseDate(stay.moveOut);
    add({
      key: 'checkout-d7',
      topic: 'checkout',
      title: n.checkoutWeekTitle,
      body,
      at: atTime(isoDate(addDays(moveOut, -7)), '10:00'),
      href: REMINDER_ROUTES.checkout,
    });
    add({
      key: 'checkout-d1',
      topic: 'checkout',
      title: n.checkoutDayTitle,
      body,
      at: atTime(isoDate(addDays(moveOut, -1)), '10:00'),
      href: REMINDER_ROUTES.checkout,
    });
  }

  if (prefs.documents) {
    for (const doc of state.documents) {
      if (!doc.expiresAt) continue;
      const name = n.documents[doc.type];
      for (const days of [30, 7]) {
        add({
          key: `document-${doc.id}-${doc.expiresAt}-d${days}`,
          topic: 'documents',
          title: n.documentTitle(name, days),
          body: n.documentBody(formatShortDate(doc.expiresAt, lang)),
          at: atTime(isoDate(addDays(parseDate(doc.expiresAt), -days)), '10:00'),
          href: REMINDER_ROUTES.documents,
        });
      }
    }
  }

  if (prefs.chores) {
    for (const week of myChoreWeeks(state, lang, now)) {
      add({
        key: `chores-${week.weekStart}`,
        topic: 'chores',
        title: n.choresTitle,
        body: n.choresBody(week.names.join(', ')),
        at: atTime(week.weekStart, '09:00'),
        href: REMINDER_ROUTES.chores,
      });
    }
  }

  // Personal reminders are always on: the student created them on purpose.
  for (const p of state.personalReminders) {
    add({
      key: `personal-${p.id}`,
      topic: 'personal',
      title: p.title,
      body: t.personalBody,
      at: new Date(p.at),
      href: REMINDER_ROUTES.personal,
    });
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Notification identifier of a planned reminder (also stored in PersonalReminder.notificationId). */
export const notificationIdOf = (key: string) => `${PREFIX}${key}`;

/* ---------- Permission ---------- */

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function toPermission(s: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (s.granted) return 'granted';
  if (s.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  if (s.ios?.status === IosAuthorizationStatus.EPHEMERAL) return 'granted';
  return s.status === 'denied' ? 'denied' : s.status === 'granted' ? 'granted' : 'undetermined';
}

async function ensureAndroidChannel(lang: Lang) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: strings[lang].reminders.topicsTitle,
    importance: AndroidImportance.HIGH,
  });
}

/** Current state, never prompts. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (isWeb) return 'unavailable';
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

/** Shows the system prompt (only from a user action on the reminders screen). */
export async function requestNotificationPermission(lang: Lang): Promise<NotificationPermission> {
  if (isWeb) return 'unavailable';
  try {
    // Android 13+ only shows the prompt once a channel exists.
    await ensureAndroidChannel(lang);
    return toPermission(await Notifications.requestPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

/* ---------- Scheduling ---------- */

const signature = (r: PlannedReminder) => `${r.title}|${r.body}|${r.at.getTime()}|${r.href ?? ''}`;

let syncing: Promise<number> = Promise.resolve(0);

/**
 * Makes the phone's pending notifications match `planned`: keeps the unchanged ones, replaces
 * the changed ones, cancels ours that disappeared. Never touches notifications we did not
 * schedule. Returns how many are scheduled. Calls are serialized.
 */
export function syncLocalNotifications(planned: PlannedReminder[], lang: Lang): Promise<number> {
  syncing = syncing.catch(() => 0).then(() => doSync(planned, lang));
  return syncing;
}

async function doSync(planned: PlannedReminder[], lang: Lang): Promise<number> {
  if (isWeb) return 0;
  await ensureAndroidChannel(lang);
  const wanted = planned.slice(0, MAX_SCHEDULED);
  const wantedById = new Map(wanted.map((r) => [notificationIdOf(r.key), r]));

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const keep = new Set<string>();
  for (const req of existing) {
    const ours = req.identifier.startsWith(PREFIX) || typeof req.content.data?.ctbhKey === 'string';
    if (!ours) continue;
    const want = wantedById.get(req.identifier);
    if (want && req.content.data?.sig === signature(want)) {
      keep.add(req.identifier);
    } else {
      await Notifications.cancelScheduledNotificationAsync(req.identifier);
    }
  }

  for (const [identifier, r] of wantedById) {
    if (keep.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: r.title,
        body: r.body,
        sound: true,
        data: { ctbhKey: r.key, href: r.href ?? null, sig: signature(r), topic: r.topic },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined,
      },
    });
  }
  return wantedById.size;
}

/* ---------- Foreground and taps ---------- */

let handlerInstalled = false;

/** While the app is open, our notifications still show as a banner (and in the list). */
export function installForegroundHandler() {
  if (isWeb || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function openFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const href = response.notification.request.content.data?.href;
  if (typeof href !== 'string' || !href.startsWith('/')) return;
  // Let the navigator mount first when the app was cold-started by the tap.
  setTimeout(() => router.push(href as Href), 0);
}

/**
 * Tapping a notification opens its `href` (cold start included). Mount once, inside the router
 * (ReminderEngine does it).
 */
export function useNotificationTapRouting() {
  useEffect(() => {
    if (isWeb) return;
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        openFromNotification(last);
        Notifications.clearLastNotificationResponse();
      }
    } catch {
      // Not available on this platform/runtime: taps still work through the listener below.
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response);
      try {
        Notifications.clearLastNotificationResponse();
      } catch {}
    });
    return () => sub.remove();
  }, []);
}
