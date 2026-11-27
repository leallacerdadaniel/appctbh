import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * The language question (owner, 2026-11-27: "antes do pequeno tour da Charlotte, uma pergunta da preferência pela
 * língua"): once per phone, first of the first-run screens (language → house rules → permissions → tour), so the
 * rules are already read in the chosen language. The choice itself is the app's language (`ctbh.lang`).
 */

const KEY = 'ctbh.lang.asked.v1';
const doneListeners = new Set<() => void>();

/** `true` while this phone hasn't answered; `null` while reading. */
export function useLanguageIntro() {
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
    AsyncStorage.getItem(KEY)
      .then((v) => alive && setNeeded(!v))
      // Storage unreadable: don't block the app on it.
      .catch(() => alive && setNeeded(false));
    return () => {
      alive = false;
    };
  }, []);

  return needed;
}

export function useFinishLanguage() {
  return useCallback(async () => {
    await AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
    doneListeners.forEach((listener) => listener());
  }, []);
}
