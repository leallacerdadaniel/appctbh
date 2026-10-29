import type { Lang } from '@/i18n';
import type { Localized } from '@/lib/mock-data';

/**
 * Apartment cleaning: visits (done and scheduled) and the supplies the student must keep at home.
 * Visits come from the website's panel (cleaning_records) through the app-api.
 */

export type CleaningFeedback = { rating: number; comment: string };

export type CleaningVisit = {
  id?: string;
  date: string;
  time: string;
  status: 'done' | 'scheduled';
  /** Last day the student can rate this visit (done visits only). */
  feedbackUntil?: string;
  /** The signed-in student's own rating (roommates' ratings are never sent). */
  feedback?: CleaningFeedback | null;
};

/** Done visit still inside the 7-day window to give or edit a rating. */
export const canRate = (v: CleaningVisit) =>
  v.status === 'done' && !!v.id && !!v.feedbackUntil && daysUntil(v.feedbackUntil) >= 0;

/** Product names in the student's language + the Portuguese name to find it at the supermarket. */
export type CleaningSupply = { name: Localized; pt: string };

export const cleaningSupplies: CleaningSupply[] = [
  { name: { fr: 'Liquide vaisselle', en: 'Dish soap' }, pt: 'Detergente' },
  { name: { fr: 'Désinfectant multi-usage (Veja)', en: 'Disinfectant / multi-purpose cleaner (Veja)' }, pt: 'Veja / Desinfetante' },
  { name: { fr: 'Serpillière', en: 'Floor cloth' }, pt: 'Pano de chão' },
  { name: { fr: 'Éponge', en: 'Sponge' }, pt: 'Esponja' },
  { name: { fr: 'Sacs poubelle', en: 'Trash bags' }, pt: 'Sacos de lixo' },
  { name: { fr: 'Nettoyant vitres', en: 'Glass cleaner' }, pt: 'Limpa vidros' },
  { name: { fr: 'Eau de Javel', en: 'Bleach' }, pt: 'Água sanitária' },
  { name: { fr: 'Dégraissant cuisine', en: 'Kitchen degreaser' }, pt: 'Desengordurante' },
  { name: { fr: 'Chiffons', en: 'Cleaning cloths' }, pt: 'Panos de limpeza' },
];

/** Scheduled visits from today on, soonest first. */
export const upcomingCleanings = (visits: CleaningVisit[]) =>
  visits.filter((v) => v.status === 'scheduled' && daysUntil(v.date) >= 0);

/** Done visits, most recent first. */
export const pastCleanings = (visits: CleaningVisit[]) => visits.filter((v) => v.status === 'done').reverse();

/** 2026-10-21 → "mercredi 21 octobre" (fr) · "Wednesday, October 21" (en) */
export function formatLongDate(isoDate: string, lang: Lang) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Whole days from today to the date (0 = today). */
export function daysUntil(isoDate: string, today = new Date()) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86_400_000);
}
