/**
 * Local twin of the `place-photo` Edge Function, so photos work in development before it is deployed.
 * Same handler, key read from the environment or Chez Toi BH/.env.
 *
 *   node scripts/photo-proxy.mts            → http://localhost:8787/?placeId=…
 *   EXPO_PUBLIC_PHOTO_ENDPOINT=http://<mac-ip>:8787 in .env.local for the phone (Expo Go).
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';

import { handlePhoto } from '../supabase/functions/place-photo/handler.ts';

function loadKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY;
  const env = readFileSync(`${homedir()}/Desktop/Chez Toi BH/.env`, 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('GOOGLE_MAPS_API_KEY='));
  return line?.split('=')[1].trim().replace(/^["']|["']$/g, '') ?? '';
}

const key = loadKey();
const port = Number(process.env.PORT) || 8787;

createServer(async (req, res) => {
  const response = await handlePhoto(new Request(`http://localhost${req.url}`, { method: req.method }), key);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '0.0.0.0', () => console.log(`place-photo dev proxy on http://localhost:${port}`));
