import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Demo auth. Mirrors the real flow (temporary password → mandatory change on
 * first login) so screens can be reviewed before Supabase Auth is wired in.
 * The session survives reloads, like a real Supabase session will.
 */
export const DEMO_TEMP_PASSWORD = 'ctbh2027';
const STORAGE_KEY = 'ctbh.demo-session';

export type SignInError = 'invalidEmail' | 'wrongCredentials';

type Session = { isSignedIn: boolean; mustChangePassword: boolean; password: string };

type AuthState = {
  ready: boolean;
  isSignedIn: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<SignInError | null>;
  changePassword: (password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const initial: Session = { isSignedIn: false, mustChangePassword: false, password: DEMO_TEMP_PASSWORD };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSession({ ...initial, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  function update(next: Session) {
    setSession(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }

  async function signIn(email: string, pwd: string): Promise<SignInError | null> {
    await wait(600);
    if (!email.includes('@')) return 'invalidEmail';
    if (pwd !== session.password) return 'wrongCredentials';
    update({ ...session, isSignedIn: true, mustChangePassword: pwd === DEMO_TEMP_PASSWORD });
    return null;
  }

  async function changePassword(newPassword: string) {
    await wait(600);
    update({ isSignedIn: true, mustChangePassword: false, password: newPassword });
  }

  function signOut() {
    update({ ...session, isSignedIn: false, mustChangePassword: false });
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        isSignedIn: session.isSignedIn,
        mustChangePassword: session.mustChangePassword,
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

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
