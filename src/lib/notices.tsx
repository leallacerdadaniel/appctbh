import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { Lang } from '@/i18n';
import { houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * Notices from the Chez Toi team (the bell in the brand bar), served by the "app-house" function:
 * newest first, last 120 days, with what the student already read. Refreshed when the app comes
 * back to the foreground and on pull-to-refresh.
 */

export type NoticeText = { fr?: string | null; en?: string | null; pt?: string | null };

export type Notice = {
  id: string;
  title: NoticeText;
  body: NoticeText;
  /** In-app route ("/requests/…") or a web link; null when the notice is only text. */
  href: string | null;
  at: string;
  read: boolean;
};

/** The student's language, then French (the team writes in French first), then any. */
export const noticeText = (value: NoticeText | null | undefined, lang: Lang) =>
  (value?.[lang] || value?.fr || value?.en || value?.pt || '').trim();

type State = { status: 'loading' } | { status: 'ready'; notices: Notice[] } | { status: 'error' };

type Ctx = {
  state: State;
  unread: number;
  reload: () => Promise<void>;
  /** Marks these notices read, on screen at once and on the server. */
  markRead: (ids: string[]) => void;
  /** Read during this visit of the notices page: they keep their "new" dot until the page closes. */
  justRead: Set<string>;
  forgetJustRead: () => void;
};

/** Coming back to the app more often than this doesn't refetch. */
const FOREGROUND_MIN_MS = 15_000;

const NoticesContext = createContext<Ctx | null>(null);

export function NoticesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [justRead, setJustRead] = useState<Set<string>>(() => new Set());
  const lastLoad = useRef(0);

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    lastLoad.current = Date.now();
    return houseApi<{ notices: Notice[] }>('notices', { token })
      .then((r) => setState({ status: 'ready', notices: r.notices ?? [] }))
      // A failed refresh keeps what is on screen.
      .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && Date.now() - lastLoad.current > FOREGROUND_MIN_MS) reload();
    });
    return () => sub.remove();
  }, [reload]);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!token || ids.length === 0) return;
      const set = new Set(ids);
      setJustRead((prev) => new Set([...prev, ...ids]));
      setState((s) =>
        s.status === 'ready'
          ? { status: 'ready', notices: s.notices.map((n) => (set.has(n.id) ? { ...n, read: true } : n)) }
          : s,
      );
      // Not critical: if it fails, the notices show as unread again after the next refresh.
      houseApi('notices-read', { token, body: { ids } }).catch(() => {});
    },
    [token],
  );

  const forgetJustRead = useCallback(() => setJustRead(new Set()), []);

  const unread = state.status === 'ready' ? state.notices.filter((n) => !n.read).length : 0;

  return (
    <NoticesContext.Provider value={{ state, unread, reload, markRead, justRead, forgetJustRead }}>
      {children}
    </NoticesContext.Provider>
  );
}

export function useNotices() {
  const ctx = useContext(NoticesContext);
  if (!ctx) throw new Error('useNotices must be used inside NoticesProvider');
  return ctx;
}
