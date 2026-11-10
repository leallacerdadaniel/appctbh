import type { Lang } from '@/i18n';
import { bhToday } from '@/lib/bh-time';

/** "Rua Turfa, 833 - Prado. Belo Horizonte - MG" → "Rua Turfa, 833 – Prado". Display only: copy and maps keep the full address. */
export function shortAddress(address: string) {
  return address
    .replace(/[\s.,-]*Belo Horizonte(\s*-\s*MG)?/, '')
    .replace(/[.,\s]+$/, '')
    .replace(/\s+-\s+/g, ' – ');
}

/** "2027-02-01" → true while February 2027 hasn't started yet in Belo Horizonte (`today`: YYYY-MM-DD). */
export function isFutureMonth(iso: string, today = bhToday()) {
  return iso.slice(0, 7) > today.slice(0, 7);
}

/** 2027-01-20 → 20/01/2027 (fr) · Jan 20, 2027 (en) */
export function formatDate(iso: string, lang: Lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: lang === 'fr' ? '2-digit' : 'numeric',
    month: lang === 'fr' ? '2-digit' : 'short',
    year: 'numeric',
  });
}

/** 2027-02-05 → 05/02 (fr) · Feb 5 (en) */
export function formatShortDate(iso: string, lang: Lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: lang === 'fr' ? '2-digit' : 'numeric',
    month: lang === 'fr' ? '2-digit' : 'short',
  });
}

/** Sun, Nov 15 (en) · dim. 15 nov. (fr). `year`: add the year when it isn't this one. */
export function formatDayDate(iso: string, lang: Lang, year = false) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: year && y !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * An amount with the reader's grouping. Whole amounts stay without decimals; one with cents always shows
 * both (37.5 → 37,50, never 37,5).
 */
function amount(value: number, lang: Lang) {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Brazilian reais: R$ 2 400 · R$ 37,50 (fr) · R$2,400 · R$37.50 (en) */
export function formatBrl(value: number, lang: Lang) {
  const n = amount(value, lang);
  return lang === 'fr' ? `R$ ${n}` : `R$${n}`;
}

/** Rent in the contract's currency: R$ for most contracts, € for the "commission_eur" ones. */
export function formatMoney(value: number, currency: 'BRL' | 'EUR', lang: Lang) {
  if (currency === 'BRL') return formatBrl(value, lang);
  const n = amount(value, lang);
  return lang === 'fr' ? `${n} €` : `€${n}`;
}

/** 10:00 → 10h00 (fr) · 10:00 AM (en) */
export function formatTime(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(':').map(Number);
  if (lang === 'fr') return `${h}h${String(m).padStart(2, '0')}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Centavos → "R$ 12,50" / "12,50 €" (fr) · "R$12.50" / "€12.50" (en), always two decimals. */
export function formatCents(cents: number, lang: Lang, currency: 'BRL' | 'EUR' = 'BRL') {
  const n = (cents / 100).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'EUR') return lang === 'fr' ? `${n} €` : `€${n}`;
  return lang === 'fr' ? `R$ ${n}` : `R$${n}`;
}
