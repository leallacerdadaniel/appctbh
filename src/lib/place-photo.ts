import { useEffect, useState } from 'react';

/**
 * Restaurant photos from Google Maps, loaded live through the `place-photo` function
 * (supabase/functions/place-photo). The Google key never reaches the app.
 * If the request fails, the UI simply keeps the placeholder.
 */

export type PlacePhoto = { uri: string; author: string | null; authorUrl: string | null };

// Deployed Supabase function (public URL, no secret). EXPO_PUBLIC_PHOTO_ENDPOINT overrides it,
// e.g. http://<mac-ip>:8787 to test changes with scripts/photo-proxy.mts before deploying.
const ENDPOINT =
  process.env.EXPO_PUBLIC_PHOTO_ENDPOINT ?? 'https://miucfiiporxhvvbefonh.supabase.co/functions/v1/place-photo';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// One request per place and size for the whole session (Google forbids storing photos, not reusing them).
const cache = new Map<string, Promise<PlacePhoto | null>>();

function fetchPhoto(placeId: string, width: number, index: number) {
  const id = `${placeId}:${width}:${index}`;
  if (!cache.has(id)) {
    const request = fetch(`${ENDPOINT}?${new URLSearchParams({ placeId, w: String(width), i: String(index) })}`, {
      headers: ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : undefined,
    })
      .then((r) => (r.ok ? (r.json() as Promise<PlacePhoto>) : null))
      .catch(() => null);
    cache.set(id, request);
  }
  return cache.get(id)!;
}

export function usePlacePhoto(placeId: string, width = 800, index = 0) {
  const [photo, setPhoto] = useState<PlacePhoto | null>(null);

  useEffect(() => {
    if (!ENDPOINT || !placeId) return;
    let alive = true;
    fetchPhoto(placeId, width, index).then((p) => alive && setPhoto(p));
    return () => {
      alive = false;
    };
  }, [placeId, width, index]);

  return photo;
}
