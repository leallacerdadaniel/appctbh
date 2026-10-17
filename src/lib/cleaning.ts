import type { Lang } from '@/i18n';
import type { Localized } from '@/lib/mock-data';
import { demoNext } from '@/lib/mock-data';

/**
 * Apartment cleaning: visits (done and scheduled) and the supplies the student must keep at home.
 * Demo data until Supabase is wired (the old panel already tracks cleanings per apartment).
 */

export type CleaningVisit = { date: string; time: string; status: 'done' | 'scheduled' };

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

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Demo: weekly visits on the apartment's cleaning day — the last 3 done, the next 4 scheduled. */
function demoVisits(today = new Date()): CleaningVisit[] {
  const { weekday, time } = demoNext.cleaning;
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  next.setDate(next.getDate() + ((weekday - next.getDay() + 7) % 7));
  return [-3, -2, -1, 0, 1, 2, 3].map((week) => {
    const d = new Date(next);
    d.setDate(d.getDate() + week * 7);
    return { date: iso(d), time, status: week < 0 ? 'done' : 'scheduled' };
  });
}

export const cleaningVisits = demoVisits();
export const upcomingCleanings = cleaningVisits.filter((v) => v.status === 'scheduled');
export const pastCleanings = cleaningVisits.filter((v) => v.status === 'done').reverse();

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
