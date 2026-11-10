import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';

import { useI18n } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { useSessionState } from '@/lib/session-state';
import { formatCents } from '@/lib/format';
import { person, type Person } from '@/lib/home';

/**
 * Shared expenses between roommates (Splitwise-like). The group is the student's rental:
 * every active tenant, with or without the app. Money is in centavos (integers) end to end.
 * Data comes from app-api (/expenses); balances are computed here.
 */

/** `former`: appears in the expenses but no longer lives in the apartment. */
export type Member = Person & { id: string; former?: boolean };

/** Each expense and payment is in reais or euros; balances are kept per currency, never converted. */
export type Currency = 'BRL' | 'EUR';
export const CURRENCIES: Currency[] = ['BRL', 'EUR'];

export type Share = { cp: string; amountCents: number };

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  currency: Currency;
  paidBy: string;
  spentOn: string; // YYYY-MM-DD
  splitMode: 'equal' | 'exact';
  createdBy: string;
  createdAt: string;
  shares: Share[];
};

export type Settlement = {
  id: string;
  from: string;
  to: string;
  amountCents: number;
  currency: Currency;
  paidOn: string; // YYYY-MM-DD
  createdBy: string;
  createdAt: string;
};

export type ExpensesData = {
  me: string;
  /** The active tenants: the only people a new expense can be paid by or shared with. */
  members: Member[];
  /**
   * People in the expenses, shares or repayments who are no longer tenants, with their names (review, 2026-11-10:
   * they showed as "?" and their debt could never be settled). Missing while the server doesn't send it: those
   * people then show as "Ancien colocataire" (`formerPeople`, `personLabel`).
   */
  former?: Member[];
  expenses: Expense[];
  settlements: Settlement[];
};

type RawPerson = { id: string; name: string };
type Raw = Omit<ExpensesData, 'members' | 'former'> & { members: RawPerson[]; former?: RawPerson[] };

/** What the server sent, with names split for display; a former roommate is never also an active one. */
export function toExpensesData(r: Raw): ExpensesData {
  const members = r.members.map((m) => ({ id: m.id, ...person(m.name) }));
  const former = (r.former ?? [])
    .filter((f) => f.id !== r.me && !members.some((m) => m.id === f.id))
    .map((f) => ({ id: f.id, ...person(f.name), former: true }));
  return { ...r, members, former };
}

/* ---------- Roommates who left ---------- */

/** Someone in the data who is not an active tenant any more (named by the server or not). */
export const hasLeft = (d: Pick<ExpensesData, 'me' | 'members'>, cp: string) =>
  cp !== d.me && !d.members.some((m) => m.id === cp);

/** The person behind an id: an active tenant, or a former one the server named. */
export const findPerson = (d: Pick<ExpensesData, 'members' | 'former'>, cp: string) =>
  d.members.find((m) => m.id === cp) ?? d.former?.find((m) => m.id === cp);

/**
 * Every former roommate found in the expenses and repayments. An id the server did not name (it doesn't send
 * `former` yet) still gets an entry, without a name.
 */
export function formerPeople(d: ExpensesData): Member[] {
  const ids = new Set<string>();
  for (const e of d.expenses) {
    ids.add(e.paidBy);
    for (const s of e.shares) ids.add(s.cp);
  }
  for (const s of d.settlements) ids.add(s.from).add(s.to);
  return [...ids]
    .filter((cp) => hasLeft(d, cp))
    .map((cp) => d.former?.find((m) => m.id === cp) ?? { id: cp, firstName: '', fullName: '', initials: '?', former: true });
}

/** Paid by, or shared with, someone who left: it can be deleted, not edited (the server answers `former`). */
export const involvesFormer = (d: Pick<ExpensesData, 'me' | 'members'>, e: Expense) =>
  hasLeft(d, e.paidBy) || e.shares.some((s) => hasLeft(d, s.cp));

type PersonWords = Pick<Strings['expenses'], 'youCap' | 'leftMark' | 'formerRoommate'>;

/**
 * A person as two pieces, so a screen can write the marker more quietly than the name: "Vous" · "Hugo" ·
 * "Hugo" + "(parti·e)" · "Ancien colocataire" (left, and the server did not name them).
 */
export function personParts(
  d: ExpensesData,
  cp: string,
  words: PersonWords,
  name: 'firstName' | 'fullName' = 'firstName',
): { name: string; mark?: string } {
  if (cp === d.me) return { name: words.youCap };
  const p = findPerson(d, cp);
  if (!p?.[name]) return { name: words.formerRoommate };
  return hasLeft(d, cp) ? { name: p[name], mark: words.leftMark } : { name: p[name] };
}

/** The same in one string: "Hugo (parti·e)". */
export function personLabel(d: ExpensesData, cp: string, words: PersonWords, name: 'firstName' | 'fullName' = 'firstName') {
  const parts = personParts(d, cp, words, name);
  return parts.mark ? `${parts.name} ${parts.mark}` : parts.name;
}

/** A repayment in words: "Vous avez payé Hugo" · "Hugo vous a payé" · "Hugo a payé Chloé" (never "Vous a payé"). */
export function paymentLabel(d: ExpensesData, from: string, to: string, words: Strings['expenses']) {
  if (from === d.me) return words.youPaid(personLabel(d, to, words));
  if (to === d.me) return words.paidYou(personLabel(d, from, words));
  return words.payment(personLabel(d, from, words), personLabel(d, to, words));
}

/* ---------- Balances ---------- */

/**
 * Net balance per person in one currency: > 0 the group owes them, < 0 they owe the group. Every active tenant
 * has an entry; someone who left gets one as soon as an expense or a repayment names them.
 */
export function netBalances(d: Pick<ExpensesData, 'members' | 'expenses' | 'settlements'>, currency: Currency) {
  const net = new Map(d.members.map((m) => [m.id, 0]));
  const add = (cp: string, cents: number) => net.set(cp, (net.get(cp) ?? 0) + cents);
  for (const e of d.expenses) {
    if (e.currency !== currency) continue;
    add(e.paidBy, e.amountCents);
    for (const s of e.shares) add(s.cp, -s.amountCents);
  }
  for (const s of d.settlements) {
    if (s.currency !== currency) continue;
    add(s.from, s.amountCents);
    add(s.to, -s.amountCents);
  }
  return net;
}

/** The student's non-zero balance in each currency (R$ first). */
export function myBalances(d: ExpensesData) {
  return CURRENCIES.map((currency) => ({ currency, cents: netBalances(d, currency).get(d.me) ?? 0 })).filter(
    (b) => b.cents !== 0,
  );
}

export type Debt = { from: string; to: string; amountCents: number; currency: Currency };

/** Who pays whom, per currency, with the fewest transfers. */
export function allDebts(d: ExpensesData): Debt[] {
  return CURRENCIES.flatMap((currency) =>
    simplifyDebts(netBalances(d, currency)).map((x) => ({ ...x, currency })),
  );
}

/** Fewest transfers that settle everyone (largest debtor pays largest creditor first). */
export function simplifyDebts(net: Map<string, number>): Omit<Debt, 'currency'>[] {
  const debtors = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, left: -v }));
  const creditors = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, left: v }));
  debtors.sort((a, b) => b.left - a.left);
  creditors.sort((a, b) => b.left - a.left);
  const debts: Omit<Debt, 'currency'>[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    if (amount > 0) debts.push({ from: debtors[i].id, to: creditors[j].id, amountCents: amount });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }
  return debts;
}

/** Equal split in centavos; the leftover centavos go to the first people so the sum is exact. */
export function splitEqual(amountCents: number, cps: string[]): Share[] {
  if (cps.length === 0) return [];
  const base = Math.floor(amountCents / cps.length);
  const rest = amountCents - base * cps.length;
  return cps.map((cp, i) => ({ cp, amountCents: base + (i < rest ? 1 : 0) }));
}

/** "12,50" · "12.50" · "1 200" → 1250 / 120000 centavos; null when it isn't a positive amount. */
export function parseCents(text: string): number | null {
  const clean = text.replace(/[^\d,.]/g, '');
  if (!clean) return null;
  const sep = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'));
  const decimals = sep >= 0 && clean.length - sep - 1 <= 2 ? clean.slice(sep + 1) : '';
  const whole = (decimals || sep === clean.length - 1 ? clean.slice(0, sep) : clean).replace(/[,.]/g, '');
  const cents = Number(whole || '0') * 100 + Number(decimals.padEnd(2, '0') || '0');
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** 1250 → "12,50" (input value). */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: ExpensesData }
  | { status: 'error' };

const ExpensesContext = createContext<{ state: State; reload: () => Promise<void> } | null>(null);

const LOADING: State = { status: 'loading' };

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  // Emptied on sign-out; answers for another session are dropped (lib/session-state.ts).
  const { state, setFor } = useSessionState<State>(token, LOADING);

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    const set = setFor(token);
    return appApi<Raw>('expenses', { token })
      .then((r) => set({ status: 'ready', data: toExpensesData(r) }))
      // A failed refresh (pull-to-refresh offline) keeps what is already on screen.
      .catch(() => set((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, [token, setFor]);

  useEffect(() => {
    reload();
  }, [reload]);

  return <ExpensesContext.Provider value={{ state, reload }}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside ExpensesProvider');
  return ctx;
}

/** Calls an expenses route and refreshes the data; throws AppApiError on failure. */
export function useExpenseAction() {
  const { token } = useAuth();
  const { reload } = useExpenses();
  return async (route: string, body: unknown) => {
    await appApi(route, { token, body });
    await reload();
  };
}

/** One-line status for the entry points (Maison tile): "Vous devez R$ 45,00". */
export function useBalanceLabel() {
  const { t, lang } = useI18n();
  const { state } = useExpenses();
  if (state.status !== 'ready') return state.status === 'error' ? t.expenses.unavailable : '';
  const mine = myBalances(state.data);
  if (mine.length === 0) return t.expenses.settled;
  return mine
    .map((b) =>
      b.cents > 0
        ? t.expenses.youAreOwed(formatCents(b.cents, lang, b.currency))
        : t.expenses.youOwe(formatCents(-b.cents, lang, b.currency)),
    )
    .join(' · ');
}

export { AppApiError };
