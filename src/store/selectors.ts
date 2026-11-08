import type { Lang } from '@/i18n';

import { addDays, addMonths, daysBetween, isoDate, monthOf, mondayOf, parseDate } from './dates';
import type { State } from './index';
import { chores, ME, residents, serviceCatalog, stay } from './seed';
import type {
  AnyRequest,
  Charge,
  Chore,
  ID,
  Invoice,
  IsoDate,
  Month,
  RequestStatus,
  Resident,
  ServiceRequest,
} from './types';

/* ---------- People ---------- */

export const me = (): Resident => residents.find((r) => r.id === ME)!;
export const roommates = (): Resident[] => residents.filter((r) => r.id !== ME);
export const residentById = (id: ID) => residents.find((r) => r.id === id);
export const serviceById = (id: ID) => serviceCatalog.find((s) => s.id === id);

/* ---------- Requests ---------- */

export const OPEN_STATUSES: RequestStatus[] = ['received', 'scheduled', 'in_progress'];
export const isOpen = (r: AnyRequest) => OPEN_STATUSES.includes(r.status);

export function sortedRequests(s: State) {
  return [...s.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const requestById = (s: State, id: ID) => s.requests.find((r) => r.id === id);

/** Date the request happens on (service day, booking day…), if it has one. */
export function requestDate(r: AnyRequest): IsoDate | undefined {
  return r.kind === 'maintenance' ? undefined : r.date;
}

export function serviceTotal(r: ServiceRequest) {
  return Math.round(r.unitPriceBrl * r.quantity * 100) / 100;
}

/* ---------- Billing ---------- */

/**
 * Decision of 2026-11-06: extras accumulate and are billed with the rent.
 * Rule used here (to confirm with Chez Toi): an extra consumed in month M is billed on the rent
 * of month M+1, due on `stay.rentDueDay`. Cancelled or declined requests are never billed.
 */
export function charges(s: State): Charge[] {
  const out: Charge[] = [];
  for (let m = monthOf(stay.moveIn); m <= monthOf(stay.moveOut); m = addMonths(m, 1)) {
    out.push({
      id: `rent-${m}`,
      kind: 'rent',
      billingMonth: m,
      label: { fr: 'Loyer', en: 'Rent' },
      amountBrl: stay.monthlyRentBrl,
    });
  }
  for (const r of s.requests) {
    if (r.status === 'cancelled' || r.status === 'declined') continue;
    if (r.kind === 'service') {
      const svc = serviceById(r.serviceId);
      out.push({
        id: `svc-${r.id}`,
        kind: 'service',
        billingMonth: addMonths(monthOf(r.date), 1),
        label: svc?.name ?? { fr: 'Service', en: 'Service' },
        amountBrl: serviceTotal(r),
        requestId: r.id,
      });
    } else if ((r.kind === 'late_checkout' || r.kind === 'early_checkin') && r.feeBrl) {
      out.push({
        id: `fee-${r.id}`,
        kind: 'fee',
        billingMonth: addMonths(monthOf(r.date), 1),
        label:
          r.kind === 'late_checkout'
            ? { fr: 'Départ tardif', en: 'Late check‑out' }
            : { fr: 'Arrivée anticipée', en: 'Early check‑in' },
        amountBrl: r.feeBrl,
        requestId: r.id,
      });
    }
  }
  return out;
}

export function dueDateOf(month: Month): IsoDate {
  return `${month}-${String(stay.rentDueDay).padStart(2, '0')}`;
}

export function invoices(s: State, today = new Date()): Invoice[] {
  const all = charges(s);
  const months = [...new Set(all.map((c) => c.billingMonth))].sort();
  const todayIso = isoDate(today);
  return months.map((month) => {
    const list = all.filter((c) => c.billingMonth === month);
    const totalBrl = Math.round(list.reduce((sum, c) => sum + c.amountBrl, 0) * 100) / 100;
    const dueDate = dueDateOf(month);
    const paidAt = s.payments[month];
    const status = paidAt
      ? 'paid'
      : todayIso > dueDate
        ? 'overdue'
        : month <= addMonths(monthOf(todayIso), 1) && daysBetween(todayIso, dueDate) <= 31
          ? 'open'
          : 'upcoming';
    return { month, dueDate, charges: list, totalBrl, status, paidAt };
  });
}

/** The bill the student should look at now: the first one not paid. */
export function currentInvoice(s: State, today = new Date()): Invoice | undefined {
  return invoices(s, today).find((i) => i.status !== 'paid');
}

/** Extras of the current month: they will be on next month's bill. */
export function accumulating(s: State, today = new Date()): Charge[] {
  const next = addMonths(monthOf(isoDate(today)), 1);
  return charges(s).filter((c) => c.kind !== 'rent' && c.billingMonth === next);
}

/* ---------- Chores ---------- */

export function weekIndex(chore: Chore, weekStart: IsoDate) {
  return Math.floor(daysBetween(chore.startWeek, weekStart) / 7);
}

/** Who does `chore` in the week starting `weekStart` (swaps win over the rotation). */
export function choreAssignee(s: State, chore: Chore, weekStart: IsoDate): ID {
  const swap = s.choreSwaps.find((w) => w.choreId === chore.id && w.weekStart === weekStart);
  if (swap) return swap.residentId;
  const i = weekIndex(chore, weekStart);
  const n = chore.rotation.length;
  return chore.rotation[((i % n) + n) % n];
}

export function choreWeek(s: State, weekStart: IsoDate) {
  return chores.map((chore) => ({
    chore,
    assignee: choreAssignee(s, chore, weekStart),
    done: s.choreCompletions.some((c) => c.choreId === chore.id && c.weekStart === weekStart),
  }));
}

export const thisWeek = (today = new Date()) => mondayOf(today);
export const weekAfter = (weekStart: IsoDate, n: number) => isoDate(addDays(parseDate(weekStart), 7 * n));

/* ---------- Expenses ---------- */

/** Net balance per resident: positive = others owe them. */
export function balances(s: State): Record<ID, number> {
  const out: Record<ID, number> = Object.fromEntries(residents.map((r) => [r.id, 0]));
  for (const e of s.expenses) {
    out[e.paidBy] += e.amountBrl;
    for (const part of e.split) out[part.residentId] -= part.amountBrl;
  }
  for (const p of s.settlements) {
    out[p.from] += p.amountBrl;
    out[p.to] -= p.amountBrl;
  }
  for (const id of Object.keys(out)) out[id] = Math.round(out[id] * 100) / 100;
  return out;
}

/** Fewest transfers that settle everyone ("who owes whom"). */
export function simplifiedDebts(s: State): { from: ID; to: ID; amountBrl: number }[] {
  const bal = balances(s);
  const debtors = Object.entries(bal).filter(([, v]) => v < -0.009).map(([id, v]) => ({ id, v: -v }));
  const creditors = Object.entries(bal).filter(([, v]) => v > 0.009).map(([id, v]) => ({ id, v }));
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);
  const out: { from: ID; to: ID; amountBrl: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].id, to: creditors[j].id, amountBrl: Math.round(amount * 100) / 100 });
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v < 0.01) i += 1;
    if (creditors[j].v < 0.01) j += 1;
  }
  return out;
}

/* ---------- Notices ---------- */

export const unreadNotices = (s: State) => s.notices.filter((n) => !n.read).length;

/** Month name for a YYYY-MM, in the reader's language ("novembre 2026"). */
export function monthLabel(month: Month, lang: Lang) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}
