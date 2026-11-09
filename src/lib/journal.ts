import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { useHome } from '@/lib/home';
import { dayKey, usePortugueseProgress } from '@/lib/portuguese-progress';
import { guidePlaceAt, isInBH, knownCity, nearbyNeighborhood, roughly, type PlaceRef } from '@/lib/recap-geo';

/**
 * The recap journal (owner, 2026-11-08: "um monthly recap… usar a localização do telefone pra ir montando
 * uma timeline"). Everything stays on the phone, one journal per student (email):
 * - "Ta carte de BH" (opt-in): when the app comes to the foreground, at most every 2 hours, one rough
 *   position (3 decimals ≈ 110 m), the day, the city and neighbourhood, and the guide place when the student
 *   is right at one (≤ 80 m). Nothing is asked of the system before the student turns it on.
 * - The month's photos (up to 6), copied into the app's documents folder; their EXIF date and GPS place
 *   them on the timeline. Never uploaded.
 * - Portuguese totals seen each month, so a month's recap can count that month's phrases and lessons
 *   (src/lib/portuguese-progress.ts only keeps the totals).
 *
 * TODO(dev build): background location (Location.startLocationUpdatesAsync + expo-task-manager) or
 * geofencing around the guide places would catch visits while the app is closed. Neither works in Expo Go:
 * it needs a development build, the "always" permission and the expo-location config plugin in app.json
 * (isIosBackgroundLocationEnabled, locationAlwaysAndWhenInUsePermission).
 */

export type Ping = {
  id: string;
  /** Local calendar day, "2026-10-12". */
  day: string;
  /** Rounded to 3 decimals. */
  lat: number;
  lng: number;
  city: string | null;
  neighborhood: string | null;
  outside: boolean;
  place: PlaceRef | null;
};

export type RecapPhoto = {
  id: string;
  /** The month's recap it was added to, "2026-10". */
  month: string;
  /** File name inside the student's photo folder (the folder's full path can change between app updates). */
  file: string;
  /** From EXIF, when the photo has a date. */
  day: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  outside: boolean | null;
  place: PlaceRef | null;
};

export type PtSnapshot = { learned: number; lessons: number; streak: number };

export type Journal = {
  optIn: boolean;
  lastPingAt: string | null;
  pings: Ping[];
  photos: RecapPhoto[];
  /** Portuguese totals last seen in each month ("2026-10"), and the longest streak seen that month. */
  pt: Record<string, PtSnapshot>;
};

export const MAX_PHOTOS = 6;
const PING_EVERY_MS = 2 * 60 * 60 * 1000;
const MAX_PINGS = 3000;
const EMPTY: Journal = { optIn: false, lastPingAt: null, pings: [], photos: [], pt: {} };

/* ---------- Store (one per student, like src/lib/visited.ts) ---------- */

type Snapshot = { email: string | null; loaded: boolean; journal: Journal };

const key = (email: string) => `ctbh.journal.v1.${email.toLowerCase()}`;

let snapshot: Snapshot = { email: null, loaded: false, journal: EMPTY };
let loading: { email: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function load(email: string) {
  if (loading?.email === email) return loading.promise;
  publish({ email, loaded: false, journal: EMPTY });
  const promise = AsyncStorage.getItem(key(email))
    .then((raw) => {
      const parsed = raw ? (JSON.parse(raw) as Partial<Journal>) : null;
      if (snapshot.email === email) publish({ email, loaded: true, journal: { ...EMPTY, ...parsed } });
    })
    .catch(() => {
      if (snapshot.email === email) publish({ email, loaded: true, journal: EMPTY });
    });
  loading = { email, promise };
  return promise;
}

/** Waits for the saved journal first; an update returning the same object writes nothing. */
async function save(email: string, update: (j: Journal) => Journal) {
  await load(email);
  if (snapshot.email !== email) return;
  const journal = update(snapshot.journal);
  if (journal === snapshot.journal) return;
  publish({ email, loaded: true, journal });
  await AsyncStorage.setItem(key(email), JSON.stringify(journal)).catch(() => {});
}

async function read(email: string) {
  await load(email);
  return snapshot.email === email ? snapshot.journal : EMPTY;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const monthOf = (day: string) => day.slice(0, 7);

/* ---------- Places and cities ---------- */

/**
 * City and neighbourhood of a rough position. With the opt-in (and the permission), the phone's own map
 * service names them; otherwise, or when it fails, the app's tables do (BH, the trips of Explorer).
 */
async function describe(p: { lat: number; lng: number }, geocode: boolean) {
  let city: string | null = null;
  let neighborhood: string | null = null;
  if (geocode && Platform.OS !== 'web') {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng });
      city = address?.city ?? address?.subregion ?? null;
      neighborhood = address?.district ?? null;
    } catch {
      // Offline or too many requests: the tables below still give a name.
    }
  }
  const inBH = isInBH(p);
  return {
    city: city ?? knownCity(p),
    neighborhood: neighborhood ?? (inBH ? nearbyNeighborhood(p) : null),
    outside: !inBH,
  };
}

async function canUseLocation(journal: Journal) {
  if (!journal.optIn || Platform.OS === 'web') return false;
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

let pinging = false;

/**
 * One point of "Ta carte de BH": only with the opt-in and the permission, at most every 2 hours (`force`
 * on the first one, right after turning it on). The exact position is used once to find the guide place
 * and is then rounded before anything is saved.
 */
export async function recordPing(email: string, force = false) {
  if (pinging || Platform.OS === 'web') return;
  pinging = true;
  try {
    const journal = await read(email);
    if (!journal.optIn) return;
    if (!force && journal.lastPingAt && Date.now() - Date.parse(journal.lastPingAt) < PING_EVERY_MS) return;
    if (!(await canUseLocation(journal))) return;

    const fix =
      (await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 100 })) ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15_000));
    if (!fix) return;

    const exact = { lat: fix.coords.latitude, lng: fix.coords.longitude };
    const place = (fix.coords.accuracy ?? Infinity) <= 100 ? guidePlaceAt(exact) : null;
    const rough = { lat: roughly(exact.lat), lng: roughly(exact.lng) };
    const where = await describe(rough, true);
    const ping: Ping = { id: newId(), day: dayKey(new Date()), ...rough, ...where, place };
    await save(email, (j) => ({ ...j, lastPingAt: new Date().toISOString(), pings: [...j.pings, ping].slice(-MAX_PINGS) }));
  } catch {
    // No fix (indoors, airplane mode): try again next time the app opens.
  } finally {
    pinging = false;
  }
}

export type EnableResult = 'on' | 'denied' | 'blocked' | 'unavailable';

/** The student turned "Ta carte de BH" on: the system asks for "while using the app", then the first point. */
export async function enableLocation(email: string): Promise<EnableResult> {
  if (Platform.OS === 'web') return 'unavailable';
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';
  await save(email, (j) => ({ ...j, optIn: true }));
  await recordPing(email, true);
  return 'on';
}

/** The permission as the system sees it now; only called once the student has opted in. */
export async function locationPermission(): Promise<'granted' | 'denied' | 'blocked'> {
  if (Platform.OS === 'web') return 'denied';
  const p = await Location.getForegroundPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'denied' : 'blocked';
}

/* ---------- Photos ---------- */

const folderName = (email: string) => email.toLowerCase().replace(/[^a-z0-9]+/g, '_');
const photoDir = (email: string) => new Directory(Paths.document, 'recap-photos', folderName(email));

export function photoUri(email: string, photo: RecapPhoto) {
  return new File(photoDir(email), photo.file).uri;
}

const num = (v: unknown) =>
  typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;

/** Date and position from the photo's EXIF (iOS: positive values + N/S, E/W refs; Android: signed values). */
function readExif(exif: Record<string, unknown> | null | undefined) {
  const dateText = [exif?.DateTimeOriginal, exif?.DateTimeDigitized, exif?.DateTime].find((v) => typeof v === 'string') as
    | string
    | undefined;
  const m = dateText?.match(/^(\d{4})[:-](\d{2})[:-](\d{2})/);
  const day = m ? `${m[1]}-${m[2]}-${m[3]}` : null;

  const lat = num(exif?.GPSLatitude);
  const lng = num(exif?.GPSLongitude);
  const signed = (v: number, ref: unknown, negative: string) =>
    ref === negative ? -Math.abs(v) : typeof ref === 'string' ? Math.abs(v) : v;
  const gps =
    lat != null && lng != null && !(lat === 0 && lng === 0)
      ? { lat: signed(lat, exif?.GPSLatitudeRef, 'S'), lng: signed(lng, exif?.GPSLongitudeRef, 'W') }
      : null;
  return { day, gps };
}

export type AddPhotosResult = 'added' | 'canceled' | 'full' | 'failed';

/**
 * "Ajoute tes photos du mois": the system photo picker (no permission needed), up to the 6 of the month.
 * Each photo is copied into the app's documents folder, so it stays even if deleted from the gallery.
 */
export async function addPhotos(email: string, month: string): Promise<AddPhotosResult> {
  if (Platform.OS === 'web') return 'failed';
  const journal = await read(email);
  const room = MAX_PHOTOS - journal.photos.filter((p) => p.month === month).length;
  if (room <= 0) return 'full';

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: room,
    orderedSelection: true,
    exif: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return 'canceled';

  const dir = photoDir(email);
  dir.create({ intermediates: true, idempotent: true });
  const geocode = await canUseLocation(journal);
  const added: RecapPhoto[] = [];
  for (const asset of result.assets.slice(0, room)) {
    try {
      const id = newId();
      const ext = /\.(png|jpe?g|heic|webp)$/i.exec(asset.fileName ?? asset.uri)?.[1]?.toLowerCase() ?? 'jpg';
      const file = `${id}.${ext}`;
      await new File(asset.uri).copy(new File(dir, file));
      const { day, gps } = readExif(asset.exif as Record<string, unknown> | null | undefined);
      let where: { city: string | null; outside: boolean | null; place: PlaceRef | null } = {
        city: null,
        outside: null,
        place: null,
      };
      if (gps) {
        const rough = { lat: roughly(gps.lat), lng: roughly(gps.lng) };
        const described = await describe(rough, geocode);
        where = { city: described.city, outside: described.outside, place: guidePlaceAt(gps) };
        gps.lat = rough.lat;
        gps.lng = rough.lng;
      }
      added.push({ id, month, file, day, lat: gps?.lat ?? null, lng: gps?.lng ?? null, ...where });
    } catch {
      // One photo that can't be copied doesn't stop the others.
    }
  }
  if (!added.length) return 'failed';
  await save(email, (j) => ({ ...j, photos: [...j.photos, ...added] }));
  return 'added';
}

/* ---------- Hooks ---------- */

/** The signed-in student's journal and what they can do with it. */
export function useJournal() {
  const { email } = useHome().student;
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    load(email);
  }, [email]);

  const mine = current.email === email;
  const journal = mine ? current.journal : EMPTY;

  return {
    email,
    loaded: mine && current.loaded,
    journal,
    photoUri: (photo: RecapPhoto) => photoUri(email, photo),
    removePing: (id: string) => save(email, (j) => ({ ...j, pings: j.pings.filter((p) => p.id !== id) })),
    removePhoto: (id: string) => {
      const photo = journal.photos.find((p) => p.id === id);
      if (photo) {
        try {
          const file = new File(photoDir(email), photo.file);
          if (file.exists) file.delete();
        } catch {
          // The entry goes anyway.
        }
      }
      return save(email, (j) => ({ ...j, photos: j.photos.filter((p) => p.id !== id) }));
    },
    /** The photo stays in the collage but no longer places anything on the timeline. */
    forgetPhotoPlace: (id: string) =>
      save(email, (j) => ({
        ...j,
        photos: j.photos.map((p) => (p.id === id ? { ...p, lat: null, lng: null, city: null, outside: null, place: null } : p)),
      })),
    pauseLocation: () => save(email, (j) => ({ ...j, optIn: false })),
    eraseLocation: () => save(email, (j) => ({ ...j, optIn: false, lastPingAt: null, pings: [] })),
  };
}

function recordPortuguese(email: string, now: PtSnapshot) {
  const month = monthOf(dayKey(new Date()));
  save(email, (j) => {
    const prev = j.pt[month];
    if (prev && prev.learned === now.learned && prev.lessons === now.lessons && prev.streak >= now.streak) return j;
    return { ...j, pt: { ...j.pt, [month]: { ...now, streak: Math.max(prev?.streak ?? 0, now.streak) } } };
  });
}

/**
 * Keeps the journal going while the app is used: a point of "Ta carte de BH" each time the app comes back
 * (only with the opt-in), and the month's Portuguese totals. Mounted by RecapEntry and the recap screens;
 * mounting it twice is harmless.
 */
export function useJournalTracker() {
  const { email } = useHome().student;
  const pt = usePortugueseProgress();

  useEffect(() => {
    recordPing(email);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recordPing(email);
    });
    return () => sub.remove();
  }, [email]);

  useEffect(() => {
    if (pt.loaded) recordPortuguese(email, { learned: pt.learnedCount, lessons: pt.lessons, streak: pt.streak });
  }, [email, pt.loaded, pt.learnedCount, pt.lessons, pt.streak]);
}
