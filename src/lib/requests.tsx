import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';

import type { Lang } from '@/i18n';
import { AppApiError, requestsApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { useSessionState } from '@/lib/session-state';

/**
 * Requests to the Chez Toi team (wave 6): extra services, maintenance, late check-out, early check-in
 * and gourmet-space bookings. One shape for all of them, served by the "app-requests" function.
 *
 * Billing (owner's decision of 2026-11-06): extras accumulate and are billed with the rent; Chez Toi
 * advances the cost. `billingMonth` is the first day of the rent month that carries the charge.
 * Money is in centavos end to end.
 */

export type Localized = Partial<Record<Lang, string>>;
export const localized = (value: Localized | null | undefined, lang: Lang) =>
  value?.[lang] ?? value?.fr ?? value?.en ?? '';

export type Currency = 'BRL' | 'EUR';

export type ServiceCategory = 'cleaning' | 'laundry' | 'chef' | 'transfer' | 'other';

export type CatalogItem = {
  id: string;
  category: ServiceCategory;
  emoji: string;
  name: Localized;
  description: Localized;
  /** What the price is for: "par sac", "per trip". */
  unit: Localized;
  priceCents: number;
  currency: Currency;
  /** Minimum notice before the chosen date and time. */
  leadTimeHours: number;
  allowsQuantity: boolean;
  maxQuantity: number;
};

export type Gourmet = {
  name: Localized;
  capacity: number;
  openFrom: string; // HH:MM
  openUntil: string; // HH:MM
  maxHours: number;
  rules: Localized;
};

/** Arrival and departure used as defaults for early check-in and late check-out. */
export type Stay = {
  arrivalDate: string | null;
  arrivalTime: string | null;
  departureDate: string | null;
  departureTime: string | null;
};

export type RequestKind = 'service' | 'maintenance' | 'late_checkout' | 'early_checkin' | 'gourmet';
export type RequestStatus = 'received' | 'scheduled' | 'in_progress' | 'done' | 'cancelled' | 'declined';
export const OPEN_STATUSES: RequestStatus[] = ['received', 'scheduled', 'in_progress'];

export type MaintenanceCategory = 'plumbing' | 'electrical' | 'appliance' | 'furniture' | 'internet' | 'other';
export type Urgency = 'low' | 'normal' | 'urgent';

export type RequestEvent = { status: RequestStatus; byTeam: boolean; note: string | null; at: string };

export type TeamRequest = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  serviceId: string | null;
  /** Frozen at request time: later catalog changes don't rename past requests. */
  serviceName: Localized | null;
  quantity: number;
  unitPriceCents: number | null;
  currency: Currency;
  /** Set by the team for late check-out / early check-in, billed with the rent. */
  feeCents: number | null;
  billingMonth: string | null; // YYYY-MM-01
  date: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  guests: number | null;
  room: string | null;
  category: MaintenanceCategory | null;
  urgency: Urgency | null;
  description: string | null;
  note: string | null;
  photoCount: number;
  /** Only filled by `loadRequest` (temporary links, 10 minutes). */
  photoUrls: string[];
  rating: number | null;
  ratingComment: string | null;
  createdAt: string;
  updatedAt: string;
  events: RequestEvent[];
};

export type RequestsData = {
  catalog: CatalogItem[];
  gourmet: Gourmet | null;
  stay: Stay;
  requests: TeamRequest[];
};

export const isOpen = (r: TeamRequest) => OPEN_STATUSES.includes(r.status);
export const canCancel = (r: TeamRequest) => r.status === 'received' || r.status === 'scheduled';

/** Total of an extra service in centavos (quantity × frozen unit price). */
export const serviceTotal = (r: Pick<TeamRequest, 'quantity' | 'unitPriceCents'>) => r.quantity * (r.unitPriceCents ?? 0);

/** What a request adds to the rent bill, if anything (cancelled and declined never count). */
export function billedCents(r: TeamRequest) {
  if (r.status === 'cancelled' || r.status === 'declined') return 0;
  if (r.kind === 'service') return serviceTotal(r);
  return r.feeCents ?? 0;
}

/** Rent month that carries a service on `date` (YYYY-MM-DD): the following month, as YYYY-MM-01. */
export function billingMonthFor(date: string) {
  const [y, m] = date.split('-').map(Number);
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Extras not yet billed, grouped by the rent month they go to (soonest first). */
export function upcomingCharges(requests: TeamRequest[], today = new Date()) {
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const byMonth = new Map<string, { month: string; currency: Currency; cents: number; requests: TeamRequest[] }>();
  for (const r of requests) {
    const cents = billedCents(r);
    if (!cents || !r.billingMonth || r.billingMonth < thisMonth) continue;
    const key = `${r.billingMonth}|${r.currency}`;
    const entry = byMonth.get(key) ?? { month: r.billingMonth, currency: r.currency, cents: 0, requests: [] };
    entry.cents += cents;
    entry.requests.push(r);
    byMonth.set(key, entry);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

type State = { status: 'loading' } | { status: 'ready'; data: RequestsData } | { status: 'error' };

const RequestsContext = createContext<{ state: State; reload: () => Promise<void> } | null>(null);

const LOADING: State = { status: 'loading' };

export function RequestsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  // Emptied on sign-out; answers for another session are dropped (lib/session-state.ts).
  const { state, setFor } = useSessionState<State>(token, LOADING);

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    const set = setFor(token);
    return requestsApi<RequestsData>('list', { token })
      .then((data) => set({ status: 'ready', data }))
      .catch(() => set((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, [token, setFor]);

  useEffect(() => {
    reload();
  }, [reload]);

  return <RequestsContext.Provider value={{ state, reload }}>{children}</RequestsContext.Provider>;
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used inside RequestsProvider');
  return ctx;
}

export type CreateInput =
  | { kind: 'service'; serviceId: string; date: string; time: string; quantity: number; note?: string }
  | {
      kind: 'maintenance';
      room: string;
      category: MaintenanceCategory;
      urgency: Urgency;
      description: string;
      photoPaths?: string[];
      note?: string;
    }
  | { kind: 'late_checkout' | 'early_checkin'; date: string; time: string; note?: string }
  | { kind: 'gourmet'; date: string; startTime: string; endTime: string; guests: number; note?: string };

/**
 * Everything the student can do with requests. Each call refreshes the list; failures throw
 * AppApiError (codes: invalid, tooSoon, taken, forbidden, notFound, network, server).
 */
export function useRequestActions() {
  const { token } = useAuth();
  const { reload } = useRequests();

  return {
    async create(input: CreateInput) {
      const r = await requestsApi<{ request: TeamRequest }>('create', { token, body: input });
      await reload();
      return r.request;
    },
    async cancel(id: string) {
      const r = await requestsApi<{ request: TeamRequest }>('cancel', { token, body: { id } });
      await reload();
      return r.request;
    },
    async rate(id: string, rating: number, comment?: string) {
      const r = await requestsApi<{ request: TeamRequest }>('rate', { token, body: { id, rating, comment } });
      await reload();
      return r.request;
    },
    /** Full request with the timeline and temporary photo links. */
    async load(id: string) {
      const r = await requestsApi<{ request: TeamRequest }>('detail', { token, body: { id } });
      return r.request;
    },
    /**
     * Uploads one photo picked with expo-image-picker and returns its storage path, to send in
     * `photoPaths` when creating a maintenance request.
     */
    async uploadPhoto(uri: string, contentType: string) {
      const { path, signedUrl } = await requestsApi<{ path: string; signedUrl: string }>('photo-upload', {
        token,
        body: { contentType },
      });
      const file = await fetch(uri).then((res) => res.blob());
      const res = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!res.ok) throw new AppApiError('server');
      return path;
    },
  };
}

export { AppApiError };
