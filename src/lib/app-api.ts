/**
 * Client for the "app-api" Edge Function (supabase/functions/app-api/index.ts): the app's only
 * door to the database. Login is the app's own (not the website's Supabase Auth); the token it
 * returns is sent as a Bearer header.
 */
import { bodyHasLink } from '@/lib/no-links';

const BASE_URL = process.env.EXPO_PUBLIC_APP_API_URL ?? '';
/**
 * Requests (wave 6) live in a second function, "app-requests", in the same Supabase project; it accepts
 * the same session token. Defaults to the sibling of the app-api URL.
 */
const REQUESTS_URL =
  process.env.EXPO_PUBLIC_REQUESTS_API_URL ?? BASE_URL.replace(/\/[^/]*$/, '/app-requests');

export type ApiError =
  | 'wrongCredentials'
  | 'unauthorized'
  | 'noRental'
  | 'noContract'
  | 'tooShort'
  | 'invalid'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'server'
  | 'tooSoon'
  | 'taken'
  | 'limit'
  | 'busy'
  | 'notConfigured'
  // account (2026-11-09): stay ended more than 30 days ago; "forgot password" code
  | 'accessEnded'
  | 'invalidCode'
  | 'expired'
  // community (2026-11-09): charter not accepted yet, suspended by the team, trip or event full
  | 'terms'
  | 'suspended'
  | 'full'
  // 2026-11-09: a link in something the student wrote (src/lib/no-links.ts), refused before sending
  | 'links'
  // first access (2026-11-09): details don't match the form, too many tries, form without passport, disabled
  | 'noMatch'
  | 'tooMany'
  | 'incomplete'
  | 'disabled'
  // security review (2026-11-09): the account already has a password, so first access sends to "forgot password"
  | 'hasAccount';

export class AppApiError extends Error {
  constructor(public code: ApiError) {
    super(code);
  }
}

/** `allowLinks`: only for the assistant, whose questions never reach other people. */
type CallOptions = { token?: string | null; body?: unknown; allowLinks?: boolean };

export function appApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(BASE_URL, route, options);
}

/** Same as appApi, for the "app-requests" function. */
export function requestsApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(REQUESTS_URL, route, options);
}

/** Sibling functions in the same Supabase project; all accept the app-api session token. */
const sibling = (name: string) => BASE_URL.replace(/\/[^/]*$/, `/${name}`);

/** "app-house": chores, notices (the bell), how to pay Chez Toi, push device registration. */
export function houseApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_HOUSE_API_URL ?? sibling('app-house'), route, options);
}

/** "app-assistant": the AI assistant (contract, rules, guide, the student's own data). */
export function assistantApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_ASSISTANT_API_URL ?? sibling('app-assistant'), route, { ...options, allowLinks: true });
}

/** "app-events": what's on in BH (CCBB, Palácio das Artes, city open data, links pasted by the team). */
export function eventsApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_EVENTS_API_URL ?? sibling('app-events'), route, options);
}

/** "app-feedback" (wave 14): feedback to the team and its replies, the stay surveys, refer a friend. */
export function feedbackApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_FEEDBACK_API_URL ?? sibling('app-feedback'), route, options);
}

/** "app-community": the residents' wall, group trips, Chez Toi events, reports and blocks (wave 15). */
export function communityApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_COMMUNITY_API_URL ?? sibling('app-community'), route, options);
}

async function call<T>(base: string, route: string, options: CallOptions): Promise<T> {
  // No links in anything a student writes (owner, 2026-11-09); usage stats are not student text.
  if (!options.allowLinks && route !== 'track' && bodyHasLink(options.body)) throw new AppApiError('links');
  let res: Response;
  try {
    res = await fetch(`${base}/${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(options.body ?? {}),
    });
  } catch {
    throw new AppApiError('network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AppApiError((data.error as ApiError) ?? 'server');
  return data as T;
}
