import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n';
import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { formatDistance, WALK_LIMIT_MIN, type NearbyData } from '@/lib/nearby';

/**
 * What depends on where the student lives: the everyday places around the apartment and the
 * time from the apartment to each place of the app's curated lists. One row per apartment,
 * precomputed by `scripts/apartment_places.py` (the Google key never ships in the app).
 *
 * The distances in `src/data/*.json` were measured from a single demo address, so they are never
 * shown: while an apartment has no row yet, the app shows no distance at all rather than a wrong one.
 */

type Times = { distanceM?: number; walkMin?: number; driveMin?: number };
type ApartmentPlaces = { nearby: Omit<NearbyData, 'origin'>; times: Record<string, Times> };

const PlacesContext = createContext<ApartmentPlaces | null>(null);

export function PlacesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [loaded, setLoaded] = useState<{ token: string; data: ApartmentPlaces | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    appApi<{ places: ApartmentPlaces | null }>('places', { token })
      .then((r) => live && setLoaded({ token, data: r.places }))
      .catch(() => live && setLoaded({ token, data: null }));
    return () => {
      live = false;
    };
  }, [token]);

  // Never another account's apartment after a logout.
  const value = loaded?.token === token ? (loaded?.data ?? null) : null;
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export const usePlaces = () => useContext(PlacesContext);

/** The place with its times from the student's apartment (none until they are known). */
export function useTimes<T extends { placeId: string }>(place: T): T;
export function useTimes<T extends { placeId: string }>(place: T | undefined): T | undefined;
export function useTimes<T extends { placeId: string }>(place: T | undefined) {
  const times = useContext(PlacesContext)?.times;
  return useMemo(() => {
    if (!place) return undefined;
    const t = times?.[place.placeId];
    return { ...place, distanceM: t?.distanceM, walkMin: t?.walkMin, driveMin: t?.driveMin };
  }, [place, times]);
}

/** A beauty card with several units: closest unit first, and it gives the card its time. */
export function useUnitTimes<U extends { placeId: string }, T extends { units: U[] }>(place: T): T & Times;
export function useUnitTimes<U extends { placeId: string }, T extends { units: U[] }>(
  place: T | undefined,
): (T & Times) | undefined;
export function useUnitTimes<U extends { placeId: string }, T extends { units: U[] }>(place: T | undefined) {
  const times = useContext(PlacesContext)?.times;
  return useMemo(() => {
    if (!place) return undefined;
    const units = place.units
      .map((u) => {
        const t = times?.[u.placeId];
        return { ...u, distanceM: t?.distanceM, walkMin: t?.walkMin, driveMin: t?.driveMin };
      })
      .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    return { ...place, units, walkMin: units[0].walkMin, driveMin: units[0].driveMin };
  }, [place, times]);
}

/** "2,4 km · 9 min en voiture": the distance and the way a student would actually go. */
export function useFromHome(place: { distanceM?: number | null; walkMin?: number | null; driveMin?: number | null } | undefined) {
  const { t, lang } = useI18n();
  if (place?.walkMin == null) return null;
  const drive = place.walkMin > WALK_LIMIT_MIN && place.driveMin != null;
  return [
    place.distanceM != null ? formatDistance(place.distanceM, lang) : null,
    drive ? t.restaurants.drive(place.driveMin!) : t.restaurants.walk(place.walkMin),
  ]
    .filter(Boolean)
    .join(' · ');
}
