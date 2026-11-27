// Supabase Edge Function, deployed to the Chez Toi BH project (miucfiiporxhvvbefonh).
// Redeploy: npx supabase functions deploy place-photo --project-ref miucfiiporxhvvbefonh --no-verify-jwt --use-api
// Secret GOOGLE_PLACES_API_KEY: the Chez Toi key (Places API New), set on the project on 27/11/2026. The old
// GOOGLE_MAPS_API_KEY (Arthur's, legacy Places API) is only the fallback until it is removed.
import { handlePhoto } from './handler.ts';

Deno.serve((req) =>
  handlePhoto(req, Deno.env.get('GOOGLE_PLACES_API_KEY') ?? Deno.env.get('GOOGLE_MAPS_API_KEY') ?? ''),
);
