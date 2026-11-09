import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useI18n, type Lang } from '@/i18n';
import { houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { useNotices } from '@/lib/notices';
import { RULES_VERSION } from '@/lib/rules-intro';

/**
 * Push notifications (wave 9). The team writes a notice in the panel (or a trigger writes one: a request
 * changed status, a package arrived); the database calls the "app-push" function (supabase/appctbh/
 * 022_push.sql), which sends it through the Expo Push API to the phones registered here.
 *
 * - The system asks once per phone, never on the login screen nor during the first run (house rules and app
 *   tour): on the next launch, or the next time the app comes back to the foreground, after both are done.
 * - With the permission, the Expo push token goes to `app-house/device` with the platform and the app's
 *   language (the push is written in it; FR when unknown). Sent again on each launch and on a language change.
 * - Tapping a notification opens its `data.href`, only an internal path of the app.
 *
 * Remote push needs a native build (TestFlight / Play internal testing / development build) with the EAS
 * project id in app.json (`extra.eas.projectId`, written by `eas init`). In Expo Go, on simulators, on the
 * web and without a project id, everything here does nothing (and expo-notifications is not even loaded,
 * so Expo Go shows no warning).
 */

type NotificationsModule = typeof import('expo-notifications');

const ASKED_KEY = 'ctbh.push.asked';
/** Same key as src/lib/tour.tsx: the tour is marked "done" as soon as it starts. */
const tourKey = (email: string) => `ctbh.tour.v1.${email.toLowerCase()}`;
/** Same key as src/lib/rules-intro.ts. */
const rulesKey = (email: string) => `ctbh.rules.v1.${email.toLowerCase()}`;
/** Same rule as the `href` check of app_notices (008_casa_avisos_pagamento.sql). */
const INTERNAL_PATH = /^\/[a-z0-9/_\-[\]?=&]*$/;
/** A notification tapped while signed out is only followed if the student signs in soon after. */
const LAST_RESPONSE_MAX_AGE_MS = 10 * 60 * 1000;
/** Lets the tabs settle before the system prompt. */
const ASK_DELAY_MS = 1500;

let loaded: NotificationsModule | null | undefined;

/** expo-notifications, only where remote push can work. */
function notifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  if (Platform.OS === 'web' || isRunningInExpoGo() || !Device.isDevice) {
    loaded = null;
  } else {
    try {
      // Loaded lazily: importing it in Expo Go prints a warning on every launch.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as NotificationsModule;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

/** `data.href` of a notification, when it is an internal path of the app. */
export function safeHref(value: unknown): Href | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  if (!INTERNAL_PATH.test(value) || value.startsWith('//')) return null;
  return value as Href;
}

/** The first run is over: house rules signed (current version) and the app tour already shown. */
async function firstRunDone(email: string) {
  try {
    const [[, rules], [, tour]] = await AsyncStorage.multiGet([rulesKey(email), tourKey(email)]);
    const signed = rules ? (JSON.parse(rules) as { version?: string }).version === RULES_VERSION : false;
    return signed && tour === 'done';
  } catch {
    return false;
  }
}

/** Android needs a channel before the permission prompt (Android 13+) and before the token. */
async function ensureChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync('default', {
    name: 'Chez Toi BH',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/** Last registration sent from this launch: session, push token and language. */
let lastSent: string | null = null;

/**
 * Registers this phone for the signed-in student. Asks the system once per phone when `mayAsk`;
 * otherwise only registers when the permission is already granted.
 */
async function register(session: string, lang: Lang, mayAsk: boolean) {
  const N = notifications();
  const id = projectId();
  if (!N || !id) return;
  await ensureChannel(N);

  let permission = await N.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && mayAsk) {
    if ((await AsyncStorage.getItem(ASKED_KEY).catch(() => null)) === null) {
      await AsyncStorage.setItem(ASKED_KEY, new Date().toISOString()).catch(() => {});
      permission = await N.requestPermissionsAsync();
    }
  }
  if (!permission.granted) return;

  const { data: pushToken } = await N.getExpoPushTokenAsync({ projectId: id });
  const key = `${session}|${pushToken}|${lang}`;
  if (lastSent === key) return;
  await houseApi('device', { token: session, body: { token: pushToken, platform: Platform.OS, lang } });
  lastSent = key;
}

const handled = new Set<string>();

/** Opens the screen of a tapped notification, once per notification. */
function follow(response: { notification: { date: number; request: { identifier: string; content: { data?: unknown } } } }) {
  const { identifier, content } = response.notification.request;
  if (handled.has(identifier)) return;
  handled.add(identifier);
  const href = safeHref((content.data as { href?: unknown } | null | undefined)?.href);
  if (href) router.push(href);
}

/**
 * Mounted once the student is signed in (src/app/_layout.tsx, keyed by session): shows notices that
 * arrive while the app is open, follows taps, refreshes the bell, and registers the phone.
 */
export function PushSetup({ email }: { email: string }) {
  const { token } = useAuth();
  const { lang } = useI18n();
  const { reload } = useNotices();

  useEffect(() => {
    const N = notifications();
    if (!N) return;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    // The notification that opened the app (cold start), if it is recent.
    const last = N.getLastNotificationResponse();
    if (last && Date.now() - last.notification.date < LAST_RESPONSE_MAX_AGE_MS) {
      follow(last);
      N.clearLastNotificationResponse();
    }
    const tapped = N.addNotificationResponseReceivedListener(follow);
    // A notice arriving while the app is open also lands in the bell.
    const received = N.addNotificationReceivedListener(() => {
      reload().catch(() => {});
    });
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [reload]);

  useEffect(() => {
    if (!token || !notifications()) return;
    let alive = true;
    const attempt = async () => {
      const mayAsk = await firstRunDone(email);
      if (alive) await register(token, lang, mayAsk).catch(() => {});
    };
    // At launch only if the first run was already over; otherwise on the next return to the foreground.
    const timer = setTimeout(attempt, ASK_DELAY_MS);
    let background = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') background = true;
      if (state === 'active' && background) {
        background = false;
        attempt();
      }
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [token, lang, email]);

  return null;
}
