import type { Href } from 'expo-router';

import type { Lang } from '@/i18n';
import type { Expense, ExpenseSplit, ID } from '@/store/types';

/** Helpers for house chores and shared expenses (money is kept in reais, rounded to cents). */

export const EXPENSE_CATEGORIES: Expense['category'][] = ['groceries', 'utilities', 'home', 'outing', 'other'];

export const isExpenseCategory = (v: unknown): v is Expense['category'] =>
  typeof v === 'string' && (EXPENSE_CATEGORIES as string[]).includes(v);

export const toCents = (brl: number) => Math.round(brl * 100);
export const fromCents = (cents: number) => cents / 100;

/** Always two decimals: R$ 62,30 (fr) · R$62.30 (en). */
export function formatMoney(value: number, lang: Lang) {
  const n = Math.abs(value).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = value < 0 ? '−' : '';
  return lang === 'fr' ? `${sign}R$ ${n}` : `${sign}R$${n}`;
}

/**
 * Reads what the student typed: "12,50", "12.50", "R$ 1.234,56", "1,234.56".
 * Returns reais rounded to cents, or null when it is not a number.
 */
export function parseMoney(input: string): number | null {
  let s = input.replace(/R\$|\s| | /g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : '.';
  const groupSep = decimalSep === ',' ? '.' : ',';
  // A single separator followed by exactly 3 digits and nothing else (e.g. "1.234") is a group.
  if ((lastComma === -1) !== (lastDot === -1) && /^\d{1,3}([.,]\d{3})+$/.test(s)) {
    s = s.replace(/[.,]/g, '');
  } else {
    s = s.split(groupSep).join('').replace(decimalSep, '.');
  }
  if (!/^\d+(\.\d{0,2})?$/.test(s) && !/^\.\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? fromCents(toCents(n)) : null;
}

/**
 * Splits `total` equally between `ids` so the cents add up exactly.
 * The leftover cents go to the payer when they are in the split, otherwise to the first people.
 */
export function splitEqually(total: number, ids: ID[], payer: ID): ExpenseSplit[] {
  if (ids.length === 0) return [];
  const cents = toCents(total);
  const base = Math.floor(cents / ids.length);
  let rest = cents - base * ids.length;
  const order = ids.includes(payer) ? [payer, ...ids.filter((id) => id !== payer)] : ids;
  const extra = new Map<ID, number>();
  for (const id of order) {
    if (rest <= 0) break;
    extra.set(id, 1);
    rest -= 1;
  }
  return ids.map((id) => ({ residentId: id, amountBrl: fromCents(base + (extra.get(id) ?? 0)) }));
}

/** Part of an expense that `id` owes (0 when not in the split). */
export const shareOf = (e: Expense, id: ID) => e.split.find((p) => p.residentId === id)?.amountBrl ?? 0;

/** Routes added after the typed-routes file was generated are typed loosely here. */
export const houseHref = (pathname: string, params?: Record<string, string>) =>
  (params ? { pathname, params } : pathname) as Href;
