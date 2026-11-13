import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { useHome } from '@/lib/home';
import { dayKey } from '@/lib/portuguese-progress';

/**
 * "J'y suis allé" check-ins on the place pages (restaurants, bars and clubs, attractions), kept on the
 * phone only, one list per student (email). The monthly and semester recaps count them with the places
 * found by "Ta carte de BH" and the photos (src/lib/journal.ts). A place has one check-in: tapping again removes it.
 * Ids are unique across the three lists (Mercado Novo is the same place in nightlife and attractions).
 */

export type VisitKind = 'restaurant' | 'bar' | 'club' | 'attraction';

export type Visit = {
  id: string;
  /** Name when checked in, in case the place later leaves the app's lists. */
  name: string;
  kind: VisitKind;
  /** Local calendar day, "2026-11-08". */
  date: string;
};

type Snapshot = { email: string | null; loaded: boolean; visits: Visit[] };

const key = (email: string) => `ctbh.visited.v1.${email.toLowerCase()}`;

let snapshot: Snapshot = { email: null, loaded: false, visits: [] };
let loading: { email: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function load(email: string) {
  if (loading?.email === email) return loading.promise;
  publish({ email, loaded: false, visits: [] });
  const promise = AsyncStorage.getItem(key(email))
    .then((raw) => {
      const parsed = raw ? (JSON.parse(raw) as { visits?: Visit[] }) : null;
      if (snapshot.email === email) publish({ email, loaded: true, visits: parsed?.visits ?? [] });
    })
    .catch(() => {
      if (snapshot.email === email) publish({ email, loaded: true, visits: [] });
    });
  loading = { email, promise };
  return promise;
}

/** Waits for the saved list first, so a quick tap never overwrites it with an empty one. */
function save(email: string, update: (visits: Visit[]) => Visit[]) {
  load(email).then(() => {
    if (snapshot.email !== email) return;
    const visits = update(snapshot.visits);
    publish({ email, loaded: true, visits });
    AsyncStorage.setItem(key(email), JSON.stringify({ visits })).catch(() => {});
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;

/** The signed-in student's check-ins, oldest first. */
export function useVisits() {
  const { email } = useHome().student;
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    load(email);
  }, [email]);

  const mine = current.email === email;
  const visits = mine ? [...current.visits].sort((a, b) => a.date.localeCompare(b.date)) : [];

  return {
    loaded: mine && current.loaded,
    visits,
    visitOf: (id: string) => visits.find((v) => v.id === id) ?? null,
    remove: (id: string) => save(email, (list) => list.filter((v) => v.id !== id)),
    /** Checks the place in today, or removes its check-in. */
    toggle: (place: { id: string; name: string; kind: VisitKind }) =>
      save(email, (list) =>
        list.some((v) => v.id === place.id)
          ? list.filter((v) => v.id !== place.id)
          : [...list, { ...place, date: dayKey(new Date()) }],
      ),
  };
}
