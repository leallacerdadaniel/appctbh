import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { daysUntil } from '@/lib/cleaning';
import type { Home } from '@/lib/home';

/** The arrival checklist on Accueil (v3, owner 2026-11-08: "quando chegar ele quer conectar no wifi"). */
export const WELCOME_STEPS = ['wifi', 'address', 'apps', 'roommates', 'rules'] as const;
export type WelcomeStep = (typeof WELCOME_STEPS)[number];

/** Shown from a week before the arrival to two weeks after it. */
const BEFORE_DAYS = 7;
const AFTER_DAYS = 14;

type Stored = { done: WelcomeStep[]; hidden: boolean };
const EMPTY: Stored = { done: [], hidden: false };

const key = (email: string) => `ctbh.welcome.v1.${email.toLowerCase()}`;

/** Days until the arrival (negative once arrived): the real arrival date when the team filled it in, else the move-in date. */
export function arrivalDays(home: Home) {
  const date = home.contract.arrival?.date ?? home.contract.moveIn;
  return date ? daysUntil(date) : null;
}

/**
 * Steps the student already did, kept on the phone. The checklist shows around the arrival until every
 * step is done or the student hides it; `force` shows it anyway (link `/?welcome=1`, to preview it).
 */
export function useWelcome(home: Home, force = false) {
  const [stored, setStored] = useState<Stored | null>(null);
  const email = home.student.email;

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key(email))
      .then((raw) => {
        if (alive) setStored(raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Stored>) } : EMPTY);
      })
      .catch(() => alive && setStored(EMPTY));
    return () => {
      alive = false;
    };
  }, [email]);

  const save = useCallback(
    (update: (s: Stored) => Stored) => {
      setStored((prev) => {
        const next = update(prev ?? EMPTY);
        AsyncStorage.setItem(key(email), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [email],
  );

  const markDone = useCallback(
    (step: WelcomeStep) => save((s) => (s.done.includes(step) ? s : { ...s, done: [...s.done, step] })),
    [save],
  );
  const hide = useCallback(() => save((s) => ({ ...s, hidden: true })), [save]);

  const days = arrivalDays(home);
  const inWindow = days != null && days <= BEFORE_DAYS && days >= -AFTER_DAYS;
  const done = stored?.done ?? [];
  const allDone = WELCOME_STEPS.every((s) => done.includes(s));
  const visible = stored != null && (force || (inWindow && !stored.hidden && !allDone));

  return { visible, loaded: stored != null, days, done, markDone, hide };
}
