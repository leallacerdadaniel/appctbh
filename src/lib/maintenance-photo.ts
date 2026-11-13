/**
 * Hands the assistant's photo to the maintenance form inside the app (security review, 2026-11-09).
 *
 * The form used to read the photo from the route params (`/requests/maintenance?photo=file://…`), so a link from
 * outside the app could attach any local file to a request. Text still travels in the params (description,
 * category, room); the photo only through here, which only the app's own code can call:
 *
 *   handOffMaintenancePhoto(photo.uri);
 *   router.push({ pathname: '/requests/maintenance', params: { description } });
 */
const MAX_AGE_MS = 60_000;

let pending: { uri: string; at: number } | null = null;

export function handOffMaintenancePhoto(uri: string) {
  pending = { uri, at: Date.now() };
}

/** The photo handed over in the last minute, if any. Pure read: safe in a state initializer. */
export function peekMaintenancePhoto(): string | null {
  return pending && Date.now() - pending.at <= MAX_AGE_MS ? pending.uri : null;
}

/** Called once the form has taken the photo, so a later visit doesn't get it again. */
export function clearMaintenancePhoto() {
  pending = null;
}
