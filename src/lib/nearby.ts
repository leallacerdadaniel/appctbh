import type { Lang } from '@/i18n';

/**
 * Places around the student's apartment, precomputed per apartment by `scripts/apartment_places.py`
 * (Google Places + Distance Matrix) so the Google key never ships in the app. See `lib/places.tsx`.
 */

export type NearbyCategoryId =
  | 'supermarket'
  | 'pharmacy'
  | 'bakery'
  | 'mall'
  | 'gym'
  | 'laundry'
  | 'hospital';

export type NearbyPlace = {
  name: string;
  address: string;
  placeId: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number | null;
  /** Google's 0 (free) to 4 (very expensive); only in the top-rated lists. */
  priceLevel?: number | null;
  distanceM?: number;
  walkMin?: number;
  driveMin?: number;
};

/** "Les mieux notés près de chez vous" (owner, 2026-11-09), by `scripts/nearby.py` (TOP_RATED). */
export type TopRatedCategoryId = 'restaurant' | 'bar' | 'cafe';

export type NearbyData = {
  origin: { address: string; lat: number; lng: number };
  skema: { distanceM?: number; walkMin?: number; driveMin?: number };
  categories: { id: NearbyCategoryId; places: NearbyPlace[] }[];
  /** Missing for apartments computed before 2026-11-09 (the section stays hidden). */
  topRated?: { id: TopRatedCategoryId; places: NearbyPlace[] }[];
};

/** The place's page in Google Maps (photos, reviews, hours, directions); opens the Maps app when installed. */
export function mapsPlaceUrl(place: Pick<NearbyPlace, 'name' | 'address' | 'placeId'>) {
  const params = new URLSearchParams({
    api: '1',
    query: place.placeId ? place.name : `${place.name}, ${place.address}`,
  });
  if (place.placeId) params.set('query_place_id', place.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

/** 840 → "840" · 2345 → "2,3 k" (fr) / "2.3k" (en). */
export function formatCount(n: number, lang: Lang) {
  if (n < 1000) return String(n);
  const k = (n / 1000).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: n < 10000 ? 1 : 0,
  });
  return lang === 'fr' ? `${k} k` : `${k}k`;
}

/** Over this, walking is not realistic and the car time is shown too (same rule as location-info). */
export const WALK_LIMIT_MIN = 20;

/** Walking directions from the apartment, in the Google Maps app when installed. */
export function directionsUrl(origin: string, place: NearbyPlace) {
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination: place.placeId ? place.name : `${place.name}, ${place.address}`,
    // Hospitals and most malls are a drive away: walking directions would be useless there.
    travelmode: place.walkMin != null && place.walkMin > WALK_LIMIT_MIN ? 'driving' : 'walking',
  });
  if (place.placeId) params.set('destination_place_id', place.placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}

/** 350 → 350 m · 1700 → 1,7 km (fr) / 1.7 km (en) */
export function formatDistance(meters: number, lang: Lang) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = (meters / 1000).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 1,
  });
  return `${km} km`;
}

/** 4.6 / 1862 → 4,6 (1,9 k) (fr) · 4.6 (1.9K) (en) */
export function formatRating(rating: number, count: number | null, lang: Lang) {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const r = rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (!count) return r;
  const c = count.toLocaleString(locale, { notation: 'compact', maximumFractionDigits: 1 });
  return `${r} (${c})`;
}
