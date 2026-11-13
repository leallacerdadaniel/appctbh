/**
 * No links in anything a student writes (owner, 2026-11-09: "se for malicioso nos complicamos. Em nenhum lugar").
 * The API client checks every request body before sending (src/lib/app-api.ts), so each screen shows
 * `t.common.noLinks` instead of a generic error. The server applies the SAME four patterns (app-api, app-community,
 * app-house, app-requests, app-feedback) and so does the database (`app_has_link`, supabase/appctbh/025): change
 * all of them together, and the cases in src/lib/__tests__/no-links.test.ts.
 *
 * Rewritten after the review of 2026-11-10: the old rule was one list of endings, which refused ordinary
 * sentences ("Merci.De rien", "à 18h.Es-tu dispo ?") and let real links through (linktr.ee/x, site.ru/login).
 */
/** http://, https://, ftp:// and www. */
const SCHEME = /(?:https?|ftp):\/\/|\bwww\.[a-z0-9-]/i;
/** Any domain followed by a path, whatever its ending: bit.ly/x, wa.me/55…, linktr.ee/lea, site.ru/login. */
const WITH_PATH = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\/[^\s]/i;
/** A bare IP address. */
const IP = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
/**
 * A bare domain (no path) with a common ending, e-mail addresses included. Case-sensitive on purpose: a capital
 * after the full stop is a new sentence ("Super soirée.Top !"), and two-letter words that are also country endings
 * (de, me, to, be, us, es, it, co) only count with a path, a scheme or www.
 */
const BARE =
  /\b[A-Za-z0-9-]{2,}\.(?:com|net|org|io|fr|br|eu|uk|pt|ru|cn|xyz|info|online|link|shop|store|site|app|ly|gg|ee|gy)(?![A-Za-z0-9À-ÿ-])/;

export const hasLink = (text: string | null | undefined) =>
  !!text && (SCHEME.test(text) || WITH_PATH.test(text) || IP.test(text) || BARE.test(text));

/**
 * Fields that legitimately hold an address, a handle or an opaque value: the login e-mail, passwords, codes, the
 * Instagram name, and what the server signed and the app only sends back (the first-access `ticket`, the
 * `signature` of an answer): about 1 in 3,000 tickets happened to look like a link.
 */
const ALLOWED_KEYS = new Set([
  'email',
  'password',
  'currentPassword',
  'code',
  'token',
  'ticket',
  'signature',
  'instagram',
  'lang',
  'expoToken',
  'platform',
]);

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
