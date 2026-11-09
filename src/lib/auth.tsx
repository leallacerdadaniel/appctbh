import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { appApi, AppApiError } from '@/lib/app-api';

/**
 * The app's own login (separate from the website's accounts): e‑mail of the contract + temporary
 * password created in the panel → mandatory change on first login. The session token is kept in the
 * phone's secure storage (Keychain / Keystore) so the student stays signed in; it stops working when
 * the team resets the password or disables the account, and 30 days after the stay ends.
 */
const STORAGE_KEY = 'ctbh.session';
/** Device-level preferences that survive signing out and deleting the account. */
const KEEP_ON_DELETE = ['ctbh.lang'];

export type SignInError = 'invalidEmail' | 'wrongCredentials' | 'accessEnded' | 'network';
/** Why the student was signed out without asking: the login screen explains it. */
export type SignOutReason = 'accessEnded' | 'deleted';
export type DeleteAccountError = 'wrongCredentials' | 'network' | 'server';

type Session = { token: string | null; mustChangePassword: boolean };

type AuthState = {
  ready: boolean;
  isSignedIn: boolean;
  mustChangePassword: boolean;
  token: string | null;
  /** Password typed at sign-in, kept in memory only so the new one can be checked against it. */
  lastPassword: string | null;
  signOutReason: SignOutReason | null;
  signIn: (email: string, password: string) => Promise<SignInError | null>;
  /** After "forgot password": the new password was saved and the server opened a session. */
  signInWithToken: (token: string) => void;
  changePassword: (password: string) => Promise<boolean>;
  deleteAccount: (password: string, reason?: string) => Promise<DeleteAccountError | null>;
  signOut: (reason?: SignOutReason) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const signedOut: Session = { token: null, mustChangePassword: false };

// Secure storage on the phone; the web build (previews only) falls back to AsyncStorage.
const store = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(STORAGE_KEY) : SecureStore.getItemAsync(STORAGE_KEY)),
  set: (value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(STORAGE_KEY, value) : SecureStore.setItemAsync(STORAGE_KEY, value),
  remove: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(STORAGE_KEY) : SecureStore.deleteItemAsync(STORAGE_KEY)),
};

/** Sessions saved before 2026-11-09 were in AsyncStorage: move them to the secure store once. */
async function loadSession(): Promise<string | null> {
  const saved = await store.get();
  if (saved || Platform.OS === 'web') return saved;
  const legacy = await AsyncStorage.getItem(STORAGE_KEY);
  if (!legacy) return null;
  await store.set(legacy);
  await AsyncStorage.removeItem(STORAGE_KEY);
  return legacy;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(signedOut);
  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then((raw) => {
        if (raw) setSession({ ...signedOut, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  function update(next: Session) {
    setSession(next);
    (next.token ? store.set(JSON.stringify(next)) : store.remove()).catch(() => {});
  }

  async function signIn(email: string, pwd: string): Promise<SignInError | null> {
    if (!email.includes('@')) return 'invalidEmail';
    try {
      const r = await appApi<{ token: string; mustChangePassword: boolean }>('login', { body: { email, password: pwd } });
      setLastPassword(pwd);
      setSignOutReason(null);
      update({ token: r.token, mustChangePassword: r.mustChangePassword });
      return null;
    } catch (e) {
      if (e instanceof AppApiError && e.code === 'network') return 'network';
      if (e instanceof AppApiError && e.code === 'accessEnded') return 'accessEnded';
      return 'wrongCredentials';
    }
  }

  function signInWithToken(token: string) {
    setLastPassword(null);
    setSignOutReason(null);
    update({ token, mustChangePassword: false });
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

  async function deleteAccount(password: string, reason?: string): Promise<DeleteAccountError | null> {
    try {
      await appApi('account-delete', { token: session.token, body: { password, reason } });
    } catch (e) {
      if (e instanceof AppApiError && e.code === 'wrongCredentials') return 'wrongCredentials';
      return e instanceof AppApiError && e.code === 'network' ? 'network' : 'server';
    }
    // Everything the app kept on this phone for the student goes too (journal, recap, progress, cache).
    const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('ctbh.') && !KEEP_ON_DELETE.includes(k))).catch(() => {});
    signOut('deleted');
    return null;
  }

  function signOut(reason?: SignOutReason) {
    setLastPassword(null);
    setSignOutReason(reason ?? null);
    // The offline copy of the student's data (lib/home.tsx) leaves with the session.
    AsyncStorage.removeItem('ctbh.home.cache.v1').catch(() => {});
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
        signOutReason,
        signIn,
        signInWithToken,
        changePassword,
        deleteAccount,
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
