/**
 * Place photo proxy — shared by the Supabase Edge Function (index.ts) and the local dev server
 * (scripts/photo-proxy.ts). Uses only web-standard APIs so it runs on Deno and Node.
 *
 * GET ?placeId=<Google place id>&w=<max width px>&i=<photo index 0–9, default 0>
 *  → { uri, author, authorUrl }
 *
 * The Google key stays here. `uri` is the keyless lh3.googleusercontent.com address Google gives back,
 * so the app never sees the key. Google's terms: show the author credit, do not store photos — the app
 * loads them live and only lets the HTTP cache keep them briefly.
 *
 * Places API (New) since 27/11/2026, with the Chez Toi key (project "Chez Toi BH app"): Place Details with the
 * `photos` field, then the photo's /media with skipHttpRedirect. The legacy Place Details / Place Photo calls used
 * Arthur's key. The photo order may differ a little from the legacy one (the `photoIndex` chosen per place).
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

  const headers = { 'X-Goog-Api-Key': key };
  const details = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { ...headers, 'X-Goog-FieldMask': 'photos' },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const photos: { name: string; authorAttributions?: { displayName?: string; uri?: string }[] }[] =
    details?.photos ?? [];
  const photo = photos[index] ?? photos[0];
  if (!photo) return json({ error: 'no photo' }, 404, { 'Cache-Control': 'public, max-age=3600' });

  const media = await fetch(
    `https://places.googleapis.com/v1/${photo.name}/media?${new URLSearchParams({
      maxWidthPx: String(width),
      skipHttpRedirect: 'true',
    })}`,
    { headers },
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const uri: string | undefined = media?.photoUri;
  if (!uri || uri.includes(key)) return json({ error: 'photo unavailable' }, 502);

  const credit = photo.authorAttributions?.[0];
  const author = credit?.displayName?.trim() || null;
  const authorUrl = credit?.uri ?? null;

  return json({ uri, author, authorUrl }, 200, { 'Cache-Control': 'public, max-age=3600' });
}
