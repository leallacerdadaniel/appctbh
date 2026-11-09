import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { Lang } from '@/i18n';
import { houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';

/**
 * House rules intro (owner, 2026-11-08: "house rules could be something obligatory and simple, like the
 * Quittr intro"). Every student goes through it once per version of the rules; change the rules → bump
 * the version and everyone signs again. The signature is kept on the phone and on the server
 * (`app_rules_acceptances`, read by the team in the panel).
 */
export const RULES_VERSION = '2026-11';

type Stored = { version: string; synced: boolean };

/** Screens waiting for the signature (the tabs layout, to start the app tour right after). */
const signedListeners = new Set<() => void>();
const key = (email: string) => `ctbh.rules.v1.${email.toLowerCase()}`;

async function readStored(email: string): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(key(email));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/**
 * `needed` once we know the student hasn't signed this version (phone first, then the server, so a new
 * phone doesn't ask again). A signature that couldn't reach the server is sent again on the next launch.
 */
export function useRulesIntro(email: string) {
  const { token } = useAuth();
  const [needed, setNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    const onSigned = () => setNeeded(false);
    signedListeners.add(onSigned);
    return () => {
      signedListeners.delete(onSigned);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await readStored(email);
      if (stored?.version === RULES_VERSION) {
        if (alive) setNeeded(false);
        if (!stored.synced) {
          houseApi('rules-accept', { token, body: { version: RULES_VERSION } })
            .then(() => AsyncStorage.setItem(key(email), JSON.stringify({ version: RULES_VERSION, synced: true })))
            .catch(() => {});
        }
        return;
      }
      try {
        const { accepted } = await houseApi<{ accepted: string | null }>('rules-status', { token });
        if (accepted && accepted >= RULES_VERSION) {
          await AsyncStorage.setItem(key(email), JSON.stringify({ version: RULES_VERSION, synced: true }));
          if (alive) setNeeded(false);
          return;
        }
      } catch {
        // Offline or server down: ask anyway, signing works offline too.
      }
      if (alive) setNeeded(true);
    })();
    return () => {
      alive = false;
    };
  }, [email, token]);

  return needed;
}

/** Signs this version: on the phone at once, then on the server (retried at the next launch if it fails). */
export function useAcceptRules(email: string) {
  const { token } = useAuth();
  return useCallback(
    async (lang: Lang) => {
      await AsyncStorage.setItem(key(email), JSON.stringify({ version: RULES_VERSION, synced: false })).catch(() => {});
      signedListeners.forEach((listener) => listener());
      try {
        await houseApi('rules-accept', { token, body: { version: RULES_VERSION, lang } });
        await AsyncStorage.setItem(key(email), JSON.stringify({ version: RULES_VERSION, synced: true }));
      } catch {
        // Kept as not synced; useRulesIntro sends it again.
      }
    },
    [email, token],
  );
}
