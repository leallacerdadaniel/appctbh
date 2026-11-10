import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { AppApiError, communityApi, type ApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { formatDayDate, formatShortDate } from '@/lib/format';

/**
 * The residents' community (wave 15, owner 2026-11-09), served by the "app-community" function: the wall
 * (roommates or every resident), group trips, Chez Toi events, reports and blocks. Every post, comment and trip
 * goes through the AI moderator before it shows; the team decides what it holds (panel › Comunidade).
 */

/** Version of the community guidelines (strings `community.charter`); same constant in app-community. */
export const COMMUNITY_TERMS_VERSION = '2026-11';

export type Localized = { fr: string; en: string };
export type Author = { id: string; name: string; me: boolean };
export type PostKind = 'post' | 'question' | 'giveaway';
export type Scope = 'all' | 'apartment';
/** pending: held for the team · hidden: not published (AI or reports) · removed never reaches the app. */
export type ContentStatus = 'pending' | 'published' | 'hidden';

export type Post = {
  id: string;
  author: Author;
  scope: Scope;
  kind: PostKind;
  body: string;
  status: ContentStatus;
  /** Why it isn't published, for the author only. */
  reason: Localized | null;
  createdAt: string;
  comments: number;
};

export type Comment = {
  id: string;
  author: Author;
  body: string;
  status: ContentStatus;
  reason: Localized | null;
  createdAt: string;
};

export type Trip = {
  id: string;
  creator: Author;
  destination: string;
  /** A destination of the Voyages page, when the student picked one. */
  destinationId: string | null;
  startsOn: string;
  endsOn: string;
  seats: number | null;
  description: string | null;
  membersCount: number;
  joined: boolean;
  full: boolean;
  status: ContentStatus | 'cancelled';
  reason: Localized | null;
  createdAt: string;
};

export type TripMember = { id: string; name: string; me: boolean; creator: boolean };

/** A trip as its page shows it: the group chat is only for the people going (no links: owner, 2026-11-09). */
export type TripDetail = { trip: Trip; members: TripMember[]; canTalk: boolean; comments: Comment[] };

export type ChezEvent = {
  id: string;
  title: Localized;
  description: Partial<Localized>;
  startsAt: string;
  endsAt: string | null;
  venue: string;
  address: string | null;
  capacity: number | null;
  photoUrl: string | null;
  cancelled: boolean;
  goingCount: number;
  full: boolean;
  myRsvp: 'going' | 'notGoing' | null;
};

export type CommunityStatus = {
  me: { id: string; name: string };
  termsVersion: string;
  termsAccepted: boolean;
  suspendedUntil: string | null;
};

export type ReportTarget = 'post' | 'comment' | 'trip';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'danger' | 'personal_data' | 'other';
export type SaveResult = { id: string; status: ContentStatus; reason: Localized | null };

type Query<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; code: ApiError };

/**
 * One route of app-community, loaded when the screen gains focus (so coming back from a sub-page shows the
 * change). A failed refresh keeps what is on screen.
 */
export function useCommunity<T>(route: string, body?: Record<string, unknown>) {
  const { token } = useAuth();
  const key = JSON.stringify(body ?? {});
  // The query the state belongs to: when the body changes (the wall's scope), show loading, not the old list.
  const [stored, setStored] = useState<{ key: string; query: Query<T> }>({ key, query: { status: 'loading' } });

  const load = useCallback(async () => {
    // The state now belongs to this query; an answer for another one (the wall's scope changed while it was on
    // its way) is dropped below, or it would take the place of this one and the list would spin forever.
    setStored((s) => (s.key === key ? s : { key, query: { status: 'loading' } }));
    try {
      const data = await communityApi<T>(route, { token, body: JSON.parse(key) });
      setStored((s) => (s.key === key ? { key, query: { status: 'ready', data } } : s));
    } catch (e) {
      const code = errorCode(e);
      // A failed refresh keeps what is on screen.
      setStored((s) =>
        s.key !== key || s.query.status === 'ready' ? s : { key, query: { status: 'error', code } },
      );
    }
  }, [route, key, token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const state: Query<T> = stored.key === key ? stored.query : { status: 'loading' };
  return { state, reload: load };
}

export function useCommunityActions() {
  const { token } = useAuth();
  const call = <T>(route: string, body: Record<string, unknown>) => communityApi<T>(route, { token, body });
  return {
    acceptTerms: (lang: Lang) => call('terms-accept', { version: COMMUNITY_TERMS_VERSION, lang }),
    savePost: (b: { scope: Scope; kind: PostKind; body: string }) => call<SaveResult>('post-save', b),
    deletePost: (id: string) => call('post-delete', { id }),
    saveComment: (postId: string, body: string) => call<SaveResult>('comment-save', { postId, body }),
    deleteComment: (id: string) => call('comment-delete', { id }),
    report: (type: ReportTarget, id: string, reason: ReportReason, note?: string) =>
      call('report', { type, id, reason, note }),
    block: (cp: string) => call('block', { cp }),
    unblock: (cp: string) => call('unblock', { cp }),
    saveTrip: (b: {
      id?: string;
      destination: string;
      destinationId: string | null;
      startsOn: string;
      endsOn: string;
      seats: number | null;
      description: string | null;
    }) => call<SaveResult>('trip-save', b),
    saveTripComment: (tripId: string, body: string) => call<SaveResult>('trip-comment-save', { tripId, body }),
    cancelTrip: (id: string) => call('trip-cancel', { id }),
    joinTrip: (id: string) => call('trip-join', { id }),
    leaveTrip: (id: string) => call('trip-leave', { id }),
    rsvp: (id: string, going: boolean) => call('event-rsvp', { id, going }),
  };
}

export const errorCode = (e: unknown): ApiError => (e instanceof AppApiError ? e.code : 'server');

/**
 * Before the corrected text of something the AI refused goes out, the refused one is deleted (it is already stored,
 * and its author still sees it): one attempt stays one item. Already gone (`notFound`) is fine; any other failure
 * stops the send, so nothing is doubled.
 */
export async function replaceRefused(refusedId: string | null, remove: (id: string) => Promise<unknown>) {
  if (!refusedId) return;
  try {
    await remove(refusedId);
  } catch (e) {
    if (errorCode(e) !== 'notFound') throw e;
  }
}

/** The message for an error of this function, in the student's language. */
export function communityError(e: unknown, t: Strings) {
  const code = errorCode(e);
  if (code === 'links') return t.common.noLinks;
  const known = t.community.errors as Record<string, string>;
  return known[code] ?? t.community.errors.server;
}

/** "sam. 15 nov." for a day trip, "15/11 – 17/11" otherwise. */
export function tripDates(from: string, to: string, lang: Lang) {
  return from === to ? formatDayDate(from, lang, true) : `${formatShortDate(from, lang)} – ${formatShortDate(to, lang)}`;
}

/** Days between two YYYY-MM-DD dates, both counted (a day trip is 1). */
export function tripLength(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;
}

export const initialsOf = (name: string) =>
  name
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
