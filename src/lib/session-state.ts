import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

/**
 * State that belongs to one signed-in session (review, 2026-11-10). The data providers stay mounted at the root
 * for the whole life of the app, so without this the next student to sign in on the same phone saw the previous
 * one's home, requests, chores and expenses until their own arrived, and for the whole session if it failed.
 *
 * - Signing out (token → null) puts the state back to `initial`. A new token for the same student (password
 *   change) keeps it.
 * - `setFor(token)` gives a setter that only applies while that token is still the session on screen, so an
 *   answer that arrives after a sign-out, or for the previous account, is dropped.
 */
export function useSessionState<S>(token: string | null, initial: S) {
  const [state, setState] = useState<S>(initial);

  const [prevToken, setPrevToken] = useState(token);
  if (token !== prevToken) {
    setPrevToken(token);
    if (!token) setState(initial);
  }

  const current = useRef(token);
  useEffect(() => {
    current.current = token;
  }, [token]);

  const isCurrent = useCallback((forToken: string | null) => current.current === forToken, []);
  const setFor = useCallback(
    (forToken: string | null) => (value: SetStateAction<S>) => {
      if (current.current === forToken) setState(value);
    },
    [],
  );

  return { state, setState, setFor, isCurrent };
}
