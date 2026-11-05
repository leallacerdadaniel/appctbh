import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { CleaningVisit } from '@/lib/cleaning';
import type { Localized } from '@/lib/mock-data';

/**
 * The signed-in student's real data (apartment, contract, roommates, cleanings), loaded once from
 * the app-api "home" route and shared by every screen. Shapes match what the screens used with
 * the old demo data.
 */

/** Raw answer of the database function app_home_for. */
export type StudentDate = { date: string; time: string | null };

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
    contract_rent: number | null;
    has_contract: boolean;
  };
  tenant: { move_in_date: string | null; move_out_date: string | null; rent: number | null } | null;
  arrival?: StudentDate | null;
  departure?: StudentDate | null;
  info: {
    unit_number?: string | null;
    wifi_name: string | null;
    wifi_password: string | null;
    trash_info?: { fr?: string; en?: string; photos?: { url: string }[] } | null;
  } | null;
  roommates: string[];
  cleanings: {
    id: string;
    date: string | null;
    /** Time set for this visit on the website ("10:00:00"); falls back to the contract's usual time. */
    time?: string | null;
    completed: boolean;
    feedback_until: string | null;
    feedback: { rating: number; comment: string } | null;
  }[];
  /** Missing until the payments migration (20261029_app_payments.sql) is applied. */
  payments?: { month: string; paid: boolean }[];
  deposit?: { amount: number; currency: string; status: string; returned_date: string | null } | null;
};

/** pending = the student has not paid it yet; held = paid, kept by Chez Toi; returned = given back. */
export type Deposit = {
  amount: number;
  currency: 'BRL' | 'EUR';
  status: 'pending' | 'held' | 'returned';
  returnedDate: string | null;
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
    /** Trash instructions from the admin; null when nothing was entered for this apartment. */
    trash: { text: Localized; photos: string[] } | null;
  };
  contract: {
    semester: string;
    moveIn: string;
    moveOut: string;
    /** Real dates from the site's Chegada and Saída pages, once filled in. */
    arrival: StudentDate | null;
    departure: StudentDate | null;
    rent: number | null;
    currency: 'BRL' | 'EUR';
    hasDocument: boolean;
    cleaningFrequency: string | null;
  };
  roommates: Person[];
  /** Cleanings with a date, oldest first. */
  cleanings: CleaningVisit[];
  /** Monthly rent status only (amounts never reach the app), oldest month first. */
  payments: { month: string; paid: boolean }[];
  deposit: Deposit | null;
};

export function person(name: string): Person {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  return { firstName: parts[0] ?? '', fullName: name.trim(), initials };
}

/** If only one language was filled in, it is shown in both. */
function toTrash(raw: NonNullable<HomeResponse['info']>['trash_info']): Home['apartment']['trash'] {
  const fr = raw?.fr?.trim() ?? '';
  const en = raw?.en?.trim() ?? '';
  const photos = (raw?.photos ?? []).map((p) => p.url).filter(Boolean);
  if (!fr && !en && !photos.length) return null;
  return { text: { fr: fr || en, en: en || fr }, photos };
}

function toHome(r: HomeResponse): Home {
  const location = r.apartment.location?.trim() ?? '';
  return {
    student: { ...person(r.student.name), email: r.student.email },
    apartment: {
      nickname: r.apartment.title,
      address: location,
      // Apartment number from admin › Apartamentos first, then the site's address complement.
      complement: [r.info?.unit_number?.trim(), r.apartment.address_complement?.trim()].filter(Boolean).join(', '),
      mapsQuery: location,
      photoUrl: r.apartment.photo,
      wifiName: r.info?.wifi_name || null,
      wifiPassword: r.info?.wifi_password || null,
      trash: toTrash(r.info?.trash_info),
    },
    contract: {
      semester: r.rental.semester,
      moveIn: r.tenant?.move_in_date ?? r.rental.start_date,
      moveOut: r.tenant?.move_out_date ?? r.rental.end_date,
      arrival: r.arrival ?? null,
      departure: r.departure ?? null,
      rent: r.rental.contract_rent ?? null,
      currency: r.rental.currency,
      hasDocument: r.rental.has_contract,
      cleaningFrequency: r.rental.cleaning_frequency,
    },
    roommates: r.roommates.map(person),
    cleanings: r.cleanings
      .filter((c): c is HomeResponse['cleanings'][number] & { date: string } => !!c.date)
      .map((c) => ({
        id: c.id,
        date: c.date,
        time: (c.time ?? r.rental.cleaning_time)?.slice(0, 5) ?? '',
        status: c.completed ? 'done' : 'scheduled',
        feedbackUntil: c.feedback_until ?? undefined,
        feedback: c.feedback,
      })),
    payments: r.payments ?? [],
    deposit: r.deposit
      ? {
          amount: r.deposit.amount,
          currency: r.deposit.currency === 'EUR' ? 'EUR' : 'BRL',
          status: r.deposit.status === 'returned' ? 'returned' : r.deposit.status === 'pending' ? 'pending' : 'held',
          returnedDate: r.deposit.returned_date,
        }
      : null,
  };
}

type HomeState =
  | { status: 'loading' }
  | { status: 'ready'; home: Home }
  | { status: 'noRental' }
  | { status: 'error' };

/** reload shows the loading screen again; refresh swaps the data in place (after a save). */
const HomeContext = createContext<{ state: HomeState; reload: () => void; refresh: () => void } | null>(null);

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

  return <HomeContext.Provider value={{ state, reload, refresh: load }}>{children}</HomeContext.Provider>;
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
