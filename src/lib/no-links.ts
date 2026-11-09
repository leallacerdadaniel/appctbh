/**
 * No links in anything a student writes (owner, 2026-11-09: "se for malicioso nos complicamos. Em nenhum lugar").
 * Same rule as the database (`app_has_link`, supabase/appctbh/019) and the app-community function: http(s)://,
 * www. and anything that looks like a domain (exemple.com, bit.ly/x, wa.me/…, an e-mail address).
 * The API client checks every request body before sending (src/lib/app-api.ts), so each screen shows
 * `t.common.noLinks` instead of a generic error.
 */
export const LINK =
  /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|fr|io|me|ly|gl|co|app|link|info|xyz|site|online|shop|store|tv|gg|to|be|us|eu|es|it|de|uk|ai|dev|page|club|live|click|top|vip|lat|pro|biz|cc|ws|tk|gov|edu)\b)/i;

export const hasLink = (text: string | null | undefined) => !!text && LINK.test(text);

/** Fields that legitimately hold an address or a handle: the login e-mail, passwords, codes, the Instagram name. */
const ALLOWED_KEYS = new Set(['email', 'password', 'code', 'token', 'instagram', 'lang', 'expoToken', 'platform']);

/** True when some text the student typed in this request body contains a link. */
export function bodyHasLink(body: unknown, key = ''): boolean {
  if (ALLOWED_KEYS.has(key)) return false;
  if (typeof body === 'string') return hasLink(body);
  if (Array.isArray(body)) return body.some((v) => bodyHasLink(v, key));
  if (body && typeof body === 'object') {
    return Object.entries(body as Record<string, unknown>).some(([k, v]) => bodyHasLink(v, k));
  }
  return false;
}
