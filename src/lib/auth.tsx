import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { appApi, AppApiError } from '@/lib/app-api';

/**
 * The app's own login (separate from the website's accounts): e‑mail of the contract + temporary
 * password created in the admin → mandatory change on first login. The session token is kept so
 * the student stays signed in; it stops working when the team resets the password or disables
 * the account.
 */
const STORAGE_KEY = 'ctbh.session';

export type SignInError = 'invalidEmail' | 'wrongCredentials' | 'network';

type Session = { token: string | null; mustChangePassword: boolean };

type AuthState = {
  ready: boolean;
  isSignedIn: boolean;
  mustChangePassword: boolean;
  token: string | null;
  /** Password typed at sign-in, kept in memory only so the new one can be checked against it. */
  lastPassword: string | null;
  signIn: (email: string, password: string) => Promise<SignInError | null>;
  changePassword: (password: string) => Promise<boolean>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const signedOut: Session = { token: null, mustChangePassword: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(signedOut);
  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSession({ ...signedOut, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  function update(next: Session) {
    setSession(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }

  async function signIn(email: string, pwd: string): Promise<SignInError | null> {
    if (!email.includes('@')) return 'invalidEmail';
    try {
      const r = await appApi<{ token: string; mustChangePassword: boolean }>('login', { body: { email, password: pwd } });
      setLastPassword(pwd);
      update({ token: r.token, mustChangePassword: r.mustChangePassword });
      return null;
    } catch (e) {
      return e instanceof AppApiError && e.code === 'network' ? 'network' : 'wrongCredentials';
    }
  }

  async function changePassword(newPassword: string) {
    try {
      const r = await appApi<{ token: string }>('change-password', { token: session.token, body: { password: newPassword } });
      setLastPassword(null);
      update({ token: r.token, mustChangePassword: false });
      return true;
    } catch (e) {
      if (e instanceof AppApiError && e.code === 'unauthorized') signOut();
      return false;
    }
  }

  function signOut() {
    setLastPassword(null);
    update(signedOut);
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        isSignedIn: !!session.token,
        mustChangePassword: session.mustChangePassword,
        token: session.token,
        lastPassword,
        signIn,
        changePassword,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
