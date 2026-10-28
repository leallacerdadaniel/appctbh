/**
 * Client for the "app-api" Edge Function (supabase/functions/app-api/index.ts): the app's only
 * door to the database. Login is the app's own (not the website's Supabase Auth); the token it
 * returns is sent as a Bearer header.
 */
const BASE_URL = process.env.EXPO_PUBLIC_APP_API_URL ?? '';

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
  | 'server';

export class AppApiError extends Error {
  constructor(public code: ApiError) {
    super(code);
  }
}

export async function appApi<T>(route: string, options: { token?: string | null; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${route}`, {
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
