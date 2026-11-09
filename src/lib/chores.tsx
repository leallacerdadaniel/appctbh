import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useI18n, type Lang } from '@/i18n';
import { AppApiError, houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { person, type Person } from '@/lib/home';

/**
 * House chores between roommates (Maison › Entre colocataires), served by the "app-house" function.
 * Each chore has a turn order (`rotation`, counterparty ids); the server works out whose week it is,
 * with the one-off swaps and the "done" ticks. Weeks start on Monday, Belo Horizonte time.
 */

export type ChoreMember = Person & { id: string };

export type Chore = { id: string; emoji: string; name: string; rotation: string[] };

export type ChoreItem = {
  choreId: string;
  assignee: string;
  /** Someone took this week instead of the person in the rotation. */
  swapped: boolean;
  done: boolean;
  doneBy: string | null;
};

export type ChoreWeek = { weekStart: string; items: ChoreItem[] };

export type ChoresData = {
  me: string;
  members: ChoreMember[];
  chores: Chore[];
  /** This week first, then the next ones. */
  weeks: ChoreWeek[];
};

type Raw = Omit<ChoresData, 'members'> & { members: { id: string; name: string }[] };

/** This week and the 3 next (the screen previews them). */
const WEEKS = 4;

/** Emoji offered when creating a chore. */
export const CHORE_EMOJI = ['🗑️', '🧹', '🍽️', '🛒', '🧺', '🚽', '🧽', '♻️', '🪴', '🧴'];

type State = { status: 'loading' } | { status: 'ready'; data: ChoresData } | { status: 'error' };

type Ctx = {
  state: State;
  reload: () => Promise<void>;
  /** Local change shown at once (done tick), before the server confirms it. */
  patch: (fn: (data: ChoresData) => ChoresData) => void;
};

const ChoresContext = createContext<Ctx | null>(null);

export function ChoresProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    return houseApi<Raw>('chores', { token, body: { weeks: WEEKS } })
      .then((r) =>
        setState({
          status: 'ready',
          data: { ...r, members: r.members.map((m) => ({ id: m.id, ...person(m.name) })) },
        }),
      )
      // A failed refresh (pull-to-refresh offline) keeps what is already on screen.
      .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, [token]);

  const patch = useCallback((fn: (data: ChoresData) => ChoresData) => {
    setState((s) => (s.status === 'ready' ? { status: 'ready', data: fn(s.data) } : s));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return <ChoresContext.Provider value={{ state, reload, patch }}>{children}</ChoresContext.Provider>;
}

export function useChores() {
  const ctx = useContext(ChoresContext);
  if (!ctx) throw new Error('useChores must be used inside ChoresProvider');
  return ctx;
}

/**
 * Everything the student can do with chores. Each call refreshes the data; failures throw
 * AppApiError (codes: invalid, notFound, noRental, network, server).
 */
export function useChoreActions() {
  const { token } = useAuth();
  const { reload, patch } = useChores();

  return {
    async save(input: { id?: string; emoji: string; name: string; rotation: string[] }) {
      const r = await houseApi<{ id: string }>('chore-save', { token, body: input });
      await reload();
      return r.id;
    },
    /**
     * Deactivates the chore (its history stays on the server). The list refreshes in the background,
     * so the edit screen can leave before the chore disappears from the data.
     */
    async remove(id: string) {
      await houseApi('chore-delete', { token, body: { id } });
      reload();
    },
    /** `cp` does the chore on the week starting `weekStart` instead of the rotation's person. */
    async swap(choreId: string, weekStart: string, cp: string) {
      await houseApi('chore-swap', { token, body: { choreId, weekStart, cp } });
      await reload();
    },
    /** The tick shows at once; the server's answer replaces it (or undoes it on failure). */
    async setDone(choreId: string, weekStart: string, done: boolean, me: string) {
      patch((d) => ({
        ...d,
        weeks: d.weeks.map((w) =>
          w.weekStart !== weekStart
            ? w
            : {
                ...w,
                items: w.items.map((i) => (i.choreId === choreId ? { ...i, done, doneBy: done ? me : null } : i)),
              },
        ),
      }));
      try {
        await houseApi('chore-done', { token, body: { choreId, weekStart, done } });
      } finally {
        await reload();
      }
    },
  };
}

/* ---------- Helpers ---------- */

export const choreById = (data: ChoresData, id: string) => data.chores.find((c) => c.id === id);

/** "Vous" for the student, the first name for a roommate, "Ancien colocataire" for someone who left. */
export function memberLabel(data: ChoresData, cp: string | null, you: string, former: string) {
  if (!cp) return former;
  if (cp === data.me) return you;
  return data.members.find((m) => m.id === cp)?.firstName ?? former;
}

/** The student's chores this week, still to do first. */
export function myChoresThisWeek(data: ChoresData) {
  const week = data.weeks[0];
  if (!week) return [];
  return week.items
    .filter((i) => i.assignee === data.me && choreById(data, i.choreId))
    .sort((a, b) => Number(a.done) - Number(b.done));
}

/** "10 novembre" · "November 10" (the Monday of a week), with the year when it isn't this one. */
export function weekDate(weekStart: string, lang: Lang) {
  const [y, m, d] = weekStart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: y !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/** One-line status for the entry points (Maison tile): "Cette semaine : Poubelles". */
export function useChoreStatus() {
  const { t } = useI18n();
  const { state } = useChores();
  const c = t.chores;
  if (state.status === 'loading') return '';
  if (state.status === 'error') return c.unavailable;
  const { data } = state;
  if (data.chores.length === 0) return c.tileEmpty;
  const mine = myChoresThisWeek(data);
  const left = mine.filter((i) => !i.done);
  if (left.length) return c.tileThisWeek(left.map((i) => choreById(data, i.choreId)?.name ?? '').join(', '));
  return mine.length ? c.tileDone : c.tileNothing;
}

/** Error code of a failed call → the sentence to show. */
export function choreErrorText(error: unknown, t: ReturnType<typeof useI18n>['t'], fallback: 'server' | 'action') {
  const code = error instanceof AppApiError ? error.code : 'server';
  if (code === 'invalid') return t.chores.errors.invalid;
  if (code === 'notFound') return t.chores.notFound;
  return t.chores.errors[fallback];
}

export { AppApiError };
