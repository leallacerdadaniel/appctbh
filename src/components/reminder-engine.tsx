import { useEffect } from 'react';

import { useI18n } from '@/i18n';
import { hasCalendarPermission, syncCalendar } from '@/lib/calendar-sync';
import {
  getNotificationPermission,
  installForegroundHandler,
  plannedReminders,
  syncLocalNotifications,
  useNotificationTapRouting,
} from '@/lib/reminders';
import { getState, useHydrated, useStore } from '@/store/index';

const DEBOUNCE_MS = 1000;

/**
 * Renders nothing. Mount once inside the root navigator (after the store and i18n providers):
 * - keeps this phone's local notifications in line with the store and the language,
 * - keeps the "Chez Toi BH" phone calendar in line when the student turned the sync on,
 * - opens the right screen when a notification is tapped.
 * It never shows a permission prompt: that only happens from the reminders screen.
 */
export function ReminderEngine() {
  const { lang } = useI18n();
  const hydrated = useHydrated();

  // Only the parts of the state that change what is planned.
  const requests = useStore((s) => s.requests);
  const payments = useStore((s) => s.payments);
  const documents = useStore((s) => s.documents);
  const choreSwaps = useStore((s) => s.choreSwaps);
  const reminderPrefs = useStore((s) => s.reminderPrefs);
  const personalReminders = useStore((s) => s.personalReminders);
  const calendarEnabled = useStore((s) => s.calendarSync.enabled);
  const calendarTopics = useStore((s) => s.calendarSync.topics);

  useNotificationTapRouting();

  useEffect(() => {
    installForegroundHandler();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(async () => {
      const state = getState();
      try {
        if ((await getNotificationPermission()) === 'granted') {
          await syncLocalNotifications(plannedReminders(state, lang), lang);
        }
      } catch {
        // Retried on the next change; a failed schedule must never break the app.
      }
      if (state.calendarSync.enabled && (await hasCalendarPermission())) {
        await syncCalendar(state, lang);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    lang,
    requests,
    payments,
    documents,
    choreSwaps,
    reminderPrefs,
    personalReminders,
    calendarEnabled,
    calendarTopics,
  ]);

  return null;
}

/**
 * Wave 9 seam (remote push, "like Café com Crédito"): ask permission, get the Expo push token
 * with `Notifications.getExpoPushTokenAsync({ projectId })`, and upsert it into the Supabase
 * `devices` table (resident_id, token, platform, lang, updated_at). A DB trigger on `notices`
 * then calls the push edge function. Needs Supabase and a development build (remote push does
 * not work in Expo Go). No-op today.
 */
export async function registerForPushLater(): Promise<void> {}
