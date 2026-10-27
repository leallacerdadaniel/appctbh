import type { Lang } from '@/i18n';

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

/** Brazilian reais with the reader's grouping: R$ 2 400 (fr) · R$2,400 (en) */
export function formatBrl(value: number, lang: Lang) {
  const n = value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
  return lang === 'fr' ? `R$ ${n}` : `R$${n}`;
}

/** Rent in the contract's currency: R$ for most contracts, € for the "commission_eur" ones. */
export function formatMoney(value: number, currency: 'BRL' | 'EUR', lang: Lang) {
  if (currency === 'BRL') return formatBrl(value, lang);
  const n = value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
  return lang === 'fr' ? `${n} €` : `€${n}`;
}

/** 10:00 → 10h00 (fr) · 10:00 AM (en) */
export function formatTime(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(':').map(Number);
  if (lang === 'fr') return `${h}h${String(m).padStart(2, '0')}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}
