import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { CleaningVisit } from '@/lib/cleaning';

/**
 * The signed-in student's real data (apartment, contract, roommates, cleanings), loaded once from
 * the app-api "home" route and shared by every screen. Shapes match what the screens used with
 * the old demo data.
 */

/** Raw answer of the database function app_home_for. */
type HomeResponse = {
  student: { name: string; email: string };
  must_change_password: boolean;
  apartment: { title: string; location: string | null; address_complement: string | null; photo: string | null };
  rental: {
    name: string | null;
    semester: string;
    start_date: string;
    end_date: string;
    cleaning_day: string | null;
    cleaning_frequency: string | null;
    cleaning_time: string | null;
    currency: 'BRL' | 'EUR';
    has_contract: boolean;
  };
  tenant: { move_in_date: string | null; move_out_date: string | null; rent: number | null } | null;
  info: { wifi_name: string | null; wifi_password: string | null } | null;
  roommates: string[];
  cleanings: { date: string | null; completed: boolean }[];
};

export type Person = { firstName: string; fullName: string; initials: string };

export type Home = {
  student: Person & { email: string };
  apartment: {
    nickname: string;
    address: string;
    complement: string;
    mapsQuery: string;
    photoUrl: string | null;
    wifiName: string | null;
    wifiPassword: string | null;
  };
  contract: {
    semester: string;
    moveIn: string;
    moveOut: string;
    rent: number | null;
    currency: 'BRL' | 'EUR';
    hasDocument: boolean;
    cleaningFrequency: string | null;
  };
  roommates: Person[];
  /** Cleanings with a date, oldest first. */
  cleanings: CleaningVisit[];
};

export function person(name: string): Person {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return { firstName: parts[0] ?? '', fullName: name.trim(), initials };
}

function toHome(r: HomeResponse): Home {
  const location = r.apartment.location?.trim() ?? '';
  return {
    student: { ...person(r.student.name), email: r.student.email },
    apartment: {
      nickname: r.apartment.title,
      address: location,
      complement: r.apartment.address_complement?.trim() ?? '',
      mapsQuery: location,
      photoUrl: r.apartment.photo,
      wifiName: r.info?.wifi_name || null,
      wifiPassword: r.info?.wifi_password || null,
    },
    contract: {
      semester: r.rental.semester,
      moveIn: r.tenant?.move_in_date ?? r.rental.start_date,
      moveOut: r.tenant?.move_out_date ?? r.rental.end_date,
      rent: r.tenant?.rent ?? null,
      currency: r.rental.currency,
      hasDocument: r.rental.has_contract,
      cleaningFrequency: r.rental.cleaning_frequency,
    },
    roommates: r.roommates.map(person),
    cleanings: r.cleanings
      .filter((c): c is { date: string; completed: boolean } => !!c.date)
      .map((c) => ({ date: c.date, time: r.rental.cleaning_time?.slice(0, 5) ?? '', status: c.completed ? 'done' : 'scheduled' })),
  };
}

type HomeState =
  | { status: 'loading' }
  | { status: 'ready'; home: Home }
  | { status: 'noRental' }
  | { status: 'error' };

const HomeContext = createContext<{ state: HomeState; reload: () => void } | null>(null);

export function HomeProvider({ children }: { children: ReactNode }) {
  const { token, signOut } = useAuth();
  const [state, setState] = useState<HomeState>({ status: 'loading' });

  const load = useCallback(() => {
    if (!token) return;
    appApi<HomeResponse>('home', { token })
      .then((r) => setState({ status: 'ready', home: toHome(r) }))
      .catch((e) => {
        const code = e instanceof AppApiError ? e.code : 'server';
        if (code === 'unauthorized') signOut();
        else setState({ status: code === 'noRental' ? 'noRental' : 'error' });
      });
    // signOut changes identity on every render of AuthProvider; the token is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(load, [load]);

  function reload() {
    setState({ status: 'loading' });
    load();
  }

  return <HomeContext.Provider value={{ state, reload }}>{children}</HomeContext.Provider>;
}

export function useHomeState() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error('useHomeState must be used inside HomeProvider');
  return ctx;
}

/** Only for screens behind the home gate in _layout.tsx (data is always loaded there). */
export function useHome(): Home {
  const { state } = useHomeState();
  if (state.status !== 'ready') throw new Error('useHome used before the student data loaded');
  return state.home;
}
