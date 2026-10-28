import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n';
import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { formatCents } from '@/lib/format';
import { person, type Person } from '@/lib/home';

/**
 * Shared expenses between roommates (Splitwise-like). The group is the student's rental:
 * every active tenant, with or without the app. Money is in centavos (integers) end to end.
 * Data comes from app-api (/expenses); balances are computed here.
 */

export type Member = Person & { id: string };

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
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
};

type Raw = Omit<ExpensesData, 'members'> & { members: { id: string; name: string }[] };

/** Net balance per member in one currency: > 0 the group owes them, < 0 they owe the group. */
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

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    return appApi<Raw>('expenses', { token })
      .then((r) =>
        setState({
          status: 'ready',
          data: { ...r, members: r.members.map((m) => ({ id: m.id, ...person(m.name) })) },
        }),
      )
      .catch(() => setState({ status: 'error' }));
  }, [token]);

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

/** One-line status for the entry points (Mon appart tile, Home shortcut): "Vous devez R$ 45,00". */
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
