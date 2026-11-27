import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * The permissions screen (owner, 2026-11-27: "quando o cara abrir o app já temos que pedir"): notifications and
 * location, explained first, once per student on this phone, right after the house rules and before the tour.
 * Tracking across apps and the local network are not asked: the app does neither (its privacy policy says so),
 * and the "local network" prompt seen in development comes from Expo Go itself.
 */

const key = (email: string) => `ctbh.permissions.v1.${email.toLowerCase()}`;
const doneListeners = new Set<() => void>();

/** `true` while the student hasn't been through the screen on this phone; `null` while reading. */
export function usePermissionsIntro(email: string) {
  const [needed, setNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    const onDone = () => setNeeded(false);
    doneListeners.add(onDone);
    return () => {
      doneListeners.delete(onDone);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key(email))
      .then((v) => alive && setNeeded(!v))
      // Storage unreadable: don't block the app on it.
      .catch(() => alive && setNeeded(false));
    return () => {
      alive = false;
    };
  }, [email]);

  return needed;
}

/** The student went through the screen (whatever they answered): it doesn't open again on this phone. */
export function useFinishPermissions(email: string) {
  return useCallback(async () => {
    await AsyncStorage.setItem(key(email), new Date().toISOString()).catch(() => {});
    doneListeners.forEach((listener) => listener());
  }, [email]);
}
