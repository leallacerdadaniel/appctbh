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

export type SignInError = 'invalidEmail' | 'wrongCredentials' | 'accessEnded' | 'tooMany' | 'network' | 'server';
/**
 * Why the student was signed out without asking: the login screen explains it. `expired`: the server no longer
 * accepts the session (signed out elsewhere, password changed, account switched off).
 */
export type SignOutReason = 'accessEnded' | 'deleted' | 'expired';
export type DeleteAccountError = 'wrongCredentials' | 'links' | 'network' | 'server';

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
      const code = e instanceof AppApiError ? e.code : 'server';
      if (code === 'network' || code === 'accessEnded' || code === 'tooMany') return code;
      // Only what the server calls wrong credentials is shown as such: a blocked or failing login is not a typo.
      return code === 'wrongCredentials' || code === 'invalid' ? 'wrongCredentials' : 'server';
    }
  }

  function signInWithToken(token: string) {
    setLastPassword(null);
    setSignOutReason(null);
    update({ token, mustChangePassword: false });
  }

  async function changePassword(newPassword: string) {
    try {
      const r = await appApi<{ token: string }>('change-password', {
        token: session.token,
        // The server asks for the current password unless this is the forced change after a temporary one.
        body: { password: newPassword, ...(lastPassword ? { currentPassword: lastPassword } : {}) },
      });
      setLastPassword(null);
      update({ token: r.token, mustChangePassword: false });
      return true;
    } catch (e) {
      if (e instanceof AppApiError && e.code === 'unauthorized') signOut('expired');
      return false;
    }
  }

  async function deleteAccount(password: string, reason?: string): Promise<DeleteAccountError | null> {
    try {
      await appApi('account-delete', { token: session.token, body: { password, reason } });
    } catch (e) {
      const code = e instanceof AppApiError ? e.code : 'server';
      return code === 'wrongCredentials' || code === 'links' || code === 'network' ? code : 'server';
    }
    // Everything the app kept on this phone for the student goes too (journal, recap, progress, cache).
    const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('ctbh.') && !KEEP_ON_DELETE.includes(k))).catch(() => {});
    signOut('deleted');
    return null;
  }

  function signOut(reason?: SignOutReason) {
    // Called from a button handler by mistake, `reason` would be the press event: only the known words count.
    const why = typeof reason === 'string' ? reason : null;
    // Only when the student chose to leave (no reason): end the session on the server too, so a copy of the
    // token stops working (security review, 2026-11-09). Never for `expired`: the server already refused it, and
    // if that refusal was a passing failure the logout would sign the student out of every phone.
    // Fire and forget: no network must not keep anyone signed in.
    if (!why && session.token) appApi('logout', { token: session.token }).catch(() => {});
    setLastPassword(null);
    setSignOutReason(why);
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
