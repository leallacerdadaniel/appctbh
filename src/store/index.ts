import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import * as seed from './seed';
import type {
  AnyRequest,
  CalendarSync,
  ChoreCompletion,
  ChoreSwap,
  Expense,
  Notice,
  PersonalReminder,
  ReminderPrefs,
  ResidentDocument,
  Settlement,
} from './types';

/**
 * Local store: what the student writes in the app, kept on the device until wave 2.
 *
 * How the swap to Supabase works: screens only use `useStore(selector)` and the functions in
 * `./actions`. In wave 2 the actions call Supabase (insert/update) and a realtime subscription
 * calls `replaceState` — screens and selectors stay the same. Read-only data written by the team
 * (resident, stay, catalog, rules…) comes from `./seed` now and from tables later.
 */

export type State = {
  version: number;
  requests: AnyRequest[];
  /** Rent month → date it was paid. Written by the panel later. */
  payments: Record<string, string>;
  documents: ResidentDocument[];
  expenses: Expense[];
  settlements: Settlement[];
  choreSwaps: ChoreSwap[];
  choreCompletions: ChoreCompletion[];
  reminderPrefs: ReminderPrefs;
  calendarSync: CalendarSync;
  personalReminders: PersonalReminder[];
  notices: Notice[];
};

const STORAGE_KEY = 'ctbh.local-store';
/** Bump when the shape changes: old local data is dropped and the demo reseeded. */
const VERSION = 1;

function initialState(today = new Date()): State {
  return {
    version: VERSION,
    requests: seed.initialRequests(today),
    payments: seed.initialPayments(today),
    documents: seed.initialDocuments(today),
    expenses: seed.initialExpenses(today),
    settlements: [],
    choreSwaps: [],
    choreCompletions: [],
    reminderPrefs: seed.initialReminderPrefs,
    calendarSync: seed.initialCalendarSync,
    personalReminders: [],
    notices: seed.initialNotices(today),
  };
}

let state: State = initialState();
let hydrated = false;
const listeners = new Set<() => void>();
const hydrationListeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, 250);
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<State>;
    if (saved.version === VERSION) state = { ...state, ...saved };
  })
  .catch(() => {})
  .finally(() => {
    hydrated = true;
    emit();
    hydrationListeners.forEach((l) => l());
  });

export function getState() {
  return state;
}

/** Immutable update: always return a new object for what changed. */
export function setState(update: (s: State) => Partial<State>) {
  state = { ...state, ...update(state) };
  emit();
  persist();
}

/** Used by the Supabase realtime layer in wave 2, and by "reset demo". */
export function replaceState(next: State) {
  state = next;
  emit();
  persist();
}

export function resetDemo() {
  replaceState(initialState());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Read the store in a component. The selector runs on every render, so it may build new
 * arrays freely; the component re-renders whenever the store changes.
 */
export function useStore<T>(selector: (s: State) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);
  return selector(snapshot);
}

export function useHydrated() {
  return useSyncExternalStore(
    (l) => {
      hydrationListeners.add(l);
      return () => hydrationListeners.delete(l);
    },
    () => hydrated,
    () => hydrated,
  );
}

let counter = 0;
/** Local ids; Supabase generates uuids after wave 2. */
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
