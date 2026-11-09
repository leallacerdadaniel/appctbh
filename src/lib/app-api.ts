/**
 * Client for the "app-api" Edge Function (supabase/functions/app-api/index.ts): the app's only
 * door to the database. Login is the app's own (not the website's Supabase Auth); the token it
 * returns is sent as a Bearer header.
 */
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
  | 'notConfigured';

export class AppApiError extends Error {
  constructor(public code: ApiError) {
    super(code);
  }
}

type CallOptions = { token?: string | null; body?: unknown };

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
  return call<T>(process.env.EXPO_PUBLIC_ASSISTANT_API_URL ?? sibling('app-assistant'), route, options);
}

/** "app-events": what's on in BH (CCBB, Palácio das Artes, city open data, links pasted by the team). */
export function eventsApi<T>(route: string, options: CallOptions = {}): Promise<T> {
  return call<T>(process.env.EXPO_PUBLIC_EVENTS_API_URL ?? sibling('app-events'), route, options);
}

async function call<T>(base: string, route: string, options: CallOptions): Promise<T> {
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
