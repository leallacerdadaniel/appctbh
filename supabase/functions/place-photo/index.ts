// Supabase Edge Function, deployed to the Chez Toi BH project (miucfiiporxhvvbefonh).
// Redeploy: npx supabase functions deploy place-photo --project-ref miucfiiporxhvvbefonh --no-verify-jwt --use-api
// Secret GOOGLE_MAPS_API_KEY is set on the project (npx supabase secrets set …).
import { handlePhoto } from './handler.ts';

Deno.serve((req) => handlePhoto(req, Deno.env.get('GOOGLE_MAPS_API_KEY') ?? ''));
