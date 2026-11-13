import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import type { Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { AppApiError, feedbackApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * Wave 14 (owner, 2026-11-09), served by the "app-feedback" function:
 * - Avis: feedback or ideas for Chez Toi at any time; the team replies from the panel and the reply comes
 *   back here (a database trigger also posts it to the bell, with href "/feedback").
 * - Questionnaire: a short survey around the middle and at the end of the stay (0–10 + four optional
 *   1–5 stars + a comment that may become a testimonial at the end). The server says which one is due.
 * - Parrainage: the student's personal code to share; the team records the friends who came with it
 *   (the app only ever gets the friend's first name).
 * Service ratings stay on each request (wave 6).
 *
 * Each list is a small shared store like the ones in house-social.ts: loads on first use, refreshes when
 * a screen opens after STALE_MS, and after each action.
 */

/* ---------- Types (same shapes as the function's answers) ---------- */

export const FEEDBACK_TOPICS = ['general', 'apartment', 'cleaning', 'team', 'app', 'idea'] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export type FeedbackItem = {
  id: string;
  topic: FeedbackTopic;
  body: string;
  status: 'open' | 'answered' | 'closed';
  reply: string | null;
  repliedAt: string | null;
  /** true when there is no reply yet, or the student already saw it. */
  replyRead: boolean;
  createdAt: string;
};

export type FeedbackData = { items: FeedbackItem[] };

export type SurveyKind = 'mid' | 'end';
export type SurveyStatus = { due: SurveyKind | null; answered: SurveyKind[] };

export const SURVEY_SCORES = ['apartment', 'cleaning', 'team', 'app'] as const;
export type SurveyScoreKey = (typeof SURVEY_SCORES)[number];

export type SurveyInput = {
  kind: SurveyKind;
  nps: number;
  scores: Partial<Record<SurveyScoreKey, number>>;
  comment: string | null;
  testimonialOk: boolean;
  lang: Lang;
};

export type ReferralStatus = 'lead' | 'visit' | 'signed' | 'rewarded' | 'lost';
export type Localized = { fr: string; en: string };

export type ReferralData = {
  code: string;
  program: { active: boolean; reward: Localized | null; terms: Localized | null };
  referrals: { friendFirstName: string; status: ReferralStatus; createdAt: string }[];
};

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

/** The site the share message points to. */
export const SITE_URL = 'https://housing.cheztoibh.com.br';

/* ---------- Shared stores ---------- */

const STALE_MS = 30_000;

function createStore<T>(route: string) {
  let token: string | null = null;
  let state: LoadState<T> = { status: 'loading' };
  let loadedAt = 0;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: LoadState<T>) => {
    state = next;
    listeners.forEach((l) => l());
  };

  /** `fresh`: after a change, don't reuse a load that started before it. */
  const load = (fresh = false): Promise<void> => {
    if (!token) return Promise.resolve();
    if (inflight) return fresh ? inflight.then(() => load()) : inflight;
    const asked = token;
    inflight = feedbackApi<T>(route, { token: asked })
      .then((data) => {
        if (token !== asked) return;
        loadedAt = Date.now();
        emit({ status: 'ready', data });
      })
      // A failed refresh keeps what is on screen.
      .catch(() => {
        if (token === asked && state.status !== 'ready') emit({ status: 'error' });
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    bind(next: string | null) {
      if (next === token) return;
      token = next;
      state = { status: 'loading' };
      loadedAt = 0;
      inflight = null;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => state,
    load,
    ensure() {
      if (state.status !== 'ready' || Date.now() - loadedAt > STALE_MS) load();
    },
    reload() {
      if (state.status === 'error') emit({ status: 'loading' });
      return load();
    },
    patch(fn: (data: T) => T) {
      if (state.status === 'ready') emit({ status: 'ready', data: fn(state.data) });
    },
  };
}

type Store<T> = ReturnType<typeof createStore<T>>;

const feedbackStore = createStore<FeedbackData>('feedback');
const surveyStore = createStore<SurveyStatus>('survey-status');
const referralStore = createStore<ReferralData>('referral');

function useStore<T>(store: Store<T>) {
  const { token } = useAuth();
  store.bind(token);
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  useEffect(() => {
    store.ensure();
  }, [store, token]);
  const reload = useCallback(() => store.reload(), [store]);
  const ensure = useCallback(() => store.ensure(), [store]);
  return { state, reload, ensure };
}

export const useFeedback = () => useStore(feedbackStore);
export const useSurveyStatus = () => useStore(surveyStore);
export const useReferral = () => useStore(referralStore);

/* ---------- Actions ---------- */

/** Failures throw AppApiError (invalid, limit, taken, tooSoon, noRental, network, server). */
export function useFeedbackActions() {
  const { token } = useAuth();

  return useMemo(() => {
    async function run<T>(route: string, body: unknown) {
      if (!token) throw new AppApiError('unauthorized');
      return feedbackApi<T>(route, { token, body });
    }

    return {
      /** Waits for the list to refresh, so "Mes avis" shows the new message when the form closes. */
      async sendFeedback(input: { topic: FeedbackTopic; body: string; lang: Lang }) {
        const r = await run<{ id: string }>('feedback-send', input);
        await feedbackStore.load(true);
        return r.id;
      },
      /** The team's replies on screen are read; not critical, a failure only keeps the badge. */
      markRepliesRead(ids: string[]) {
        if (ids.length === 0) return Promise.resolve();
        feedbackStore.patch((d) => ({
          items: d.items.map((f) => (ids.includes(f.id) ? { ...f, replyRead: true } : f)),
        }));
        return run('feedback-read', { ids }).catch(() => feedbackStore.load(true));
      },
      async sendSurvey(input: SurveyInput) {
        try {
          await run('survey-send', input);
        } catch (e) {
          // Already answered (another phone, a double tap): the survey is done all the same.
          if (!(e instanceof AppApiError && e.code === 'taken')) throw e;
        }
        surveyStore.patch((s) => ({
          due: s.due === input.kind ? null : s.due,
          answered: s.answered.includes(input.kind) ? s.answered : [...s.answered, input.kind],
        }));
        surveyStore.load(true);
      },
    };
  }, [token]);
}

/** What to tell the student when sending fails. */
export function feedbackErrorText(error: unknown, t: Strings) {
  const code = error instanceof AppApiError ? error.code : 'server';
  if (code === 'links') return t.common.noLinks;
  if (code === 'limit') return t.feedback.errors.limit;
  if (code === 'invalid') return t.feedback.errors.empty;
  return t.feedback.errors.server;
}

export function surveyErrorText(error: unknown, t: Strings) {
  const code = error instanceof AppApiError ? error.code : 'server';
  if (code === 'links') return t.common.noLinks;
  if (code === 'tooSoon') return t.survey.errors.tooSoon;
  if (code === 'noRental') return t.survey.errors.noRental;
  return t.survey.errors.server;
}

/** Unread replies from the team (the Séjour row and the list's "Nouveau"). */
export const unreadReplies = (data: FeedbackData) => data.items.filter((f) => f.reply && !f.replyRead);

/** "8 nov." · "Nov 8" for a database timestamp, in Belo Horizonte (UTC−3 all year). */
export function bhDay(at: string, lang: Lang) {
  const [y, m, d] = new Date(Date.parse(at) - 3 * 3_600_000).toISOString().slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: y !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
