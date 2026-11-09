import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { ALL_PHRASES, type Situation } from '@/lib/portuguese';

/**
 * "Parler portugais" progress, kept on the phone only (no server): phrases learned (answered right in a
 * lesson), the daily streak (days in a row with at least one lesson) and the slow-audio preference.
 * One store shared by every screen, so the streak on the hub updates as soon as a lesson ends.
 */

type Stored = {
  learned: string[];
  /** Days in a row with a lesson, ending on `lastDay`. */
  streak: number;
  best: number;
  /** Local calendar day of the last lesson, "2026-11-08". */
  lastDay: string | null;
  lessons: number;
  slow: boolean;
};

const EMPTY: Stored = { learned: [], streak: 0, best: 0, lastDay: null, lessons: 0, slow: false };
const KEY = 'ctbh.portuguese.v1';

type Snapshot = { loaded: boolean; stored: Stored; learned: Set<string> };

let snapshot: Snapshot = { loaded: false, stored: EMPTY, learned: new Set() };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(stored: Stored, loaded = true) {
  snapshot = { loaded, stored, learned: new Set(stored.learned) };
  listeners.forEach((l) => l());
}

function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => publish(raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Stored>) } : EMPTY))
    .catch(() => publish(EMPTY));
  return loading;
}

/** Waits for the saved progress first, so a quick tap never overwrites it with an empty state. */
function save(update: (s: Stored) => Stored) {
  load().then(() => {
    const next = update(snapshot.stored);
    publish(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;

/** The phone's local calendar day, "2026-11-08". */
export function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yesterdayKey(now: Date) {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

/** Saves a finished lesson: the phrases answered right become learned, and today counts for the streak. */
export function finishLesson(correctIds: string[]) {
  const now = new Date();
  const today = dayKey(now);
  save((s) => {
    const streak = s.lastDay === today ? Math.max(s.streak, 1) : s.lastDay === yesterdayKey(now) ? s.streak + 1 : 1;
    return {
      ...s,
      learned: [...new Set([...s.learned, ...correctIds])],
      streak,
      best: Math.max(s.best, streak),
      lastDay: today,
      lessons: s.lessons + 1,
    };
  });
}

export function setSlowSpeech(slow: boolean) {
  save((s) => ({ ...s, slow }));
}

export function usePortugueseProgress() {
  const { loaded, stored, learned } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const today = dayKey(now);
  const doneToday = stored.lastDay === today;
  // The streak only holds while the last lesson was today or yesterday.
  const streak = doneToday || stored.lastDay === yesterdayKey(now) ? stored.streak : 0;
  const isLearned = (id: string) => learned.has(id);

  return {
    loaded,
    streak,
    best: stored.best,
    doneToday,
    lessons: stored.lessons,
    slow: stored.slow,
    isLearned,
    /** Phrases learned that still exist (ids of removed phrases don't count). */
    learnedCount: ALL_PHRASES.filter((p) => learned.has(p.id)).length,
    totalCount: ALL_PHRASES.length,
    learnedIn: (situation: Situation) => situation.phrases.filter((p) => learned.has(p.id)).length,
  };
}
