import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { Home } from '@/lib/home';
import { arrivalDays } from '@/lib/welcome';

/**
 * "Premiers pas au Brésil" on Accueil (owner, 2026-11-27: "o first steps poderia ser mais no Home que no Explore, e
 * isso podia sumir uma vez que o cara quisesse ou depois de uma semana aqui em BH; mas sempre acessível, tipo no
 * Explore"). Shown until the student hides it or a week after the arrival; Explorer › Pratique always has it.
 */
const DAYS_AFTER_ARRIVAL = 7;
const key = (email: string) => `ctbh.firststeps.hidden.v1.${email.toLowerCase()}`;

export function useFirstStepsCard(home: Home) {
  const email = home.student.email;
  // null while reading the phone's storage: nothing shows until then (no card that pops in and out).
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key(email))
      .then((v) => alive && setHidden(!!v))
      // Storage unreadable: show it; the student can still hide it for this session.
      .catch(() => alive && setHidden(false));
    return () => {
      alive = false;
    };
  }, [email]);

  const hide = useCallback(() => {
    setHidden(true);
    AsyncStorage.setItem(key(email), new Date().toISOString()).catch(() => {});
  }, [email]);

  // Before the arrival and during the first week; no date known yet: until the student hides it.
  const days = arrivalDays(home);
  const visible = hidden === false && (days == null || days >= -DAYS_AFTER_ARRIVAL);
  return { visible, hide };
}
