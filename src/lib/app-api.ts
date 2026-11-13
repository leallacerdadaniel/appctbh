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
  | 'hasAccount'
  // shared expenses (2026-11-10): editing an expense that involves a roommate who has left (delete it instead)
  | 'former';

export class AppApiError extends Error {
  constructor(public code: ApiError) {
    super(code);
  }
}

/**
 * `allowLinks`: only for the assistant, whose questions never reach other people.
 * `timeoutMs`: how long to wait before giving up with `network` (default below).
 */
type CallOptions = { token?: string | null; body?: unknown; allowLinks?: boolean; timeoutMs?: number };

/**
 * Every call gives up after a while (review, 2026-11-10): fetch has no timeout of its own on Android and about a
 * minute on iOS, so on a network that connects but never answers (airport portal) the opening stayed up forever
 * and the offline copy was never shown. The AI routes get longer: the model can take its time.
 */
const DEFAULT_TIMEOUT_MS = 20_000;
const AI_TIMEOUT_MS = 120_000;
const MODERATED_TIMEOUT_MS = 60_000;

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
  return call<T>(process.env.EXPO_PUBLIC_ASSISTANT_API_URL ?? sibling('app-assistant'), route, {
    timeoutMs: AI_TIMEOUT_MS,
    ...options,
    allowLinks: true,
  });
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
  // Posts, comments and trips wait for the AI moderation before answering.
  return call<T>(process.env.EXPO_PUBLIC_COMMUNITY_API_URL ?? sibling('app-community'), route, {
    timeoutMs: MODERATED_TIMEOUT_MS,
    ...options,
  });
}

async function call<T>(base: string, route: string, options: CallOptions): Promise<T> {
  // No links in anything a student writes (owner, 2026-11-09); usage stats are not student text.
  if (!options.allowLinks && route !== 'track' && bodyHasLink(options.body)) throw new AppApiError('links');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  let data: { error?: ApiError };
  try {
    res = await fetch(`${base}/${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(options.body ?? {}),
      signal: controller.signal,
    });
    data = await res.json().catch(() => ({}));
    // Timed out while reading the body: the empty object above is not an answer.
    if (controller.signal.aborted) throw new AppApiError('network');
  } catch {
    throw new AppApiError('network');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new AppApiError(data.error ?? 'server');
  return data as T;
}
