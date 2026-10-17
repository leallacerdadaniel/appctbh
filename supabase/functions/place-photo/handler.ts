/**
 * Place photo proxy — shared by the Supabase Edge Function (index.ts) and the local dev server
 * (scripts/photo-proxy.ts). Uses only web-standard APIs so it runs on Deno and Node.
 *
 * GET ?placeId=<Google place id>&w=<max width px>&i=<photo index 0–9, default 0>
 *  → { uri, author, authorUrl }
 *
 * The Google key stays here. `uri` is the keyless lh3.googleusercontent.com address Google redirects
 * to, so the app never sees the key. Google's terms: show the author credit, do not store photos —
 * the app loads them live and only lets the HTTP cache keep them briefly.
 */
import allowed from './allowed.json' with { type: 'json' };

const ALLOWED = new Set<string>(allowed as string[]);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

export async function handlePhoto(req: Request, key: string): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const placeId = url.searchParams.get('placeId') ?? '';
  const width = Math.min(Math.max(Number(url.searchParams.get('w')) || 800, 200), 1600);
  // Which of the place's photos (the team picks a better one when the first is weak).
  const index = Math.min(Math.max(Number(url.searchParams.get('i')) || 0, 0), 9);

  // Only places the team curated: the endpoint is public, the key must not become an open proxy.
  if (!ALLOWED.has(placeId)) return json({ error: 'unknown place' }, 404);

  const details = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({
      place_id: placeId,
      fields: 'photos',
      key,
    })}`,
  ).then((r) => r.json());

  const photos = details?.result?.photos ?? [];
  const photo = photos[index] ?? photos[0];
  if (!photo) return json({ error: 'no photo' }, 404, { 'Cache-Control': 'public, max-age=3600' });

  const media = await fetch(
    `https://maps.googleapis.com/maps/api/place/photo?${new URLSearchParams({
      maxwidth: String(width),
      photo_reference: photo.photo_reference,
      key,
    })}`,
    { redirect: 'manual' },
  );
  const uri = media.headers.get('location');
  if (!uri || uri.includes(key)) return json({ error: 'photo unavailable' }, 502);

  // html_attributions: ['<a href="https://maps.google.com/maps/contrib/…">Name</a>']
  const attribution: string = photo.html_attributions?.[0] ?? '';
  const author = attribution.replace(/<[^>]+>/g, '').trim() || null;
  const authorUrl = attribution.match(/href="([^"]+)"/)?.[1] ?? null;

  return json({ uri, author, authorUrl }, 200, { 'Cache-Control': 'public, max-age=3600' });
}
