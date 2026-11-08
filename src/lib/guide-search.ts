import { normalize } from '@/components/search-field';
import { strings } from '@/i18n/strings';
import type { BeautyGroup } from '@/lib/beauty';
import type { NearbyCategoryId } from '@/lib/nearby';
import type { SportGroup } from '@/lib/sports';

/**
 * Search of the Guide tab: only what the Guide shows (its sections, their lists and the places
 * around the apartment). Matching works on word starts, in French, English and Portuguese, so
 * "sport" doesn't find "transport" and "pharmacie" finds "Pharmacies".
 */

const words = (text: string) =>
  normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Each query word must start a word of the item (a plural query still finds the singular). */
export function makeMatcher(query: string) {
  const q = words(query);
  if (!q.length) return null;
  return (parts: (string | undefined | null)[]) => {
    const w = words(parts.filter(Boolean).join(' '));
    return q.every((qw) =>
      w.some((tw) => tw.startsWith(qw) || (tw.length >= 4 && qw.startsWith(tw) && qw.length - tw.length <= 2)),
    );
  };
}

/** A label in both app languages. */
const both = (pick: (s: typeof strings.fr) => string) => [pick(strings.fr), pick(strings.en)];

export type GuideSection = {
  id: string;
  path:
    | '/admin'
    | '/services'
    | '/nearby'
    | '/emergency'
    | '/restaurants'
    | '/restaurants/dishes'
    | '/nightlife'
    | '/sports'
    | '/beauty';
  title: (s: typeof strings.fr) => string;
  keywords: string[];
};

/** The tiles of the Guide, with the words a student would type to reach them. */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'admin',
    path: '/admin',
    title: (s) => s.admin.title,
    keywords: [
      'démarches',
      'papiers',
      'administratif',
      'paperwork',
      'documents',
      'visa',
      'cpf',
      'rnm',
      'polícia federal',
      'documentos',
    ],
  },
  {
    id: 'services',
    path: '/services',
    title: (s) => s.services.title,
    keywords: [
      'applis',
      'apps',
      'application',
      'services',
      'aplicativo',
      'transport',
      'livraison',
      'delivery',
      'banque',
      'bank',
      'avion',
      'flight',
      'voiture',
      'car',
    ],
  },
  {
    id: 'nearby',
    path: '/nearby',
    title: (s) => s.nearby.title,
    keywords: ['quartier', 'autour', 'nearby', 'neighbourhood', 'neighborhood', 'bairro', 'perto'],
  },
  {
    id: 'emergency',
    path: '/emergency',
    title: (s) => s.home.emergency,
    keywords: [
      'urgence',
      'emergency',
      'emergência',
      'samu',
      'ambulance',
      'police',
      'polícia',
      'pompiers',
      'fire',
      'bombeiros',
      'secours',
      '190',
      '192',
      '193',
    ],
  },
  {
    id: 'restaurants',
    path: '/restaurants',
    title: (s) => s.restaurants.title,
    keywords: ['restaurant', 'restaurante', 'manger', 'eat', 'dîner', 'dinner', 'déjeuner', 'lunch', 'comer'],
  },
  {
    id: 'dishes',
    path: '/restaurants/dishes',
    title: (s) => s.dishes.entry,
    keywords: ['plats', 'dishes', 'food', 'cuisine', 'comida', 'pratos', 'goûter', 'mineira'],
  },
  {
    id: 'nightlife',
    path: '/nightlife',
    title: (s) => s.nightlife.title,
    keywords: [
      'nuit',
      'sortir',
      'soirée',
      'bar',
      'boîte',
      'night',
      'nightlife',
      'club',
      'party',
      'balada',
      'boate',
      'festa',
    ],
  },
  {
    id: 'sports',
    path: '/sports',
    title: (s) => s.sports.title,
    keywords: ['sport', 'esporte', 'courir', 'running', 'corrida', 'fitness'],
  },
  {
    id: 'beauty',
    path: '/beauty',
    title: (s) => s.beauty.title,
    keywords: [
      'beauté',
      'bien-être',
      'beauty',
      'coiffeur',
      'coiffure',
      'cheveux',
      'hair',
      'cabelo',
      'cabeleireiro',
      'salão',
      'ongles',
      'manucure',
      'nails',
      'unha',
      'manicure',
      'épilation',
      'waxing',
      'depilação',
      'sourcils',
      'brows',
      'sobrancelha',
      'spa',
      'massage',
      'massagem',
    ],
  },
];

export const sectionWords = (s: GuideSection) => [...both(s.title), ...s.keywords];

/** Words for each category of "À proximité" (the labels in both languages are added too). */
export const NEARBY_KEYWORDS: Record<NearbyCategoryId, string[]> = {
  supermarket: ['supermarché', 'courses', 'épicerie', 'groceries', 'supermercado', 'mercado'],
  pharmacy: ['pharmacie', 'médicament', 'medicine', 'farmácia', 'drogaria', 'remédio'],
  bakery: ['boulangerie', 'pain', 'bread', 'padaria', 'pão'],
  mall: ['centre commercial', 'shopping', 'mall'],
  gym: ['salle de sport', 'musculation', 'gym', 'fitness', 'academia'],
  laundry: ['laverie', 'pressing', 'laundry', 'lavanderia'],
  hospital: ['hôpital', 'clinique', 'médecin', 'hospital', 'clinic', 'doctor', 'médico'],
};

export const nearbyWords = (id: NearbyCategoryId) => [...both((s) => s.nearby.categories[id]), ...NEARBY_KEYWORDS[id]];

/** Extra words that find the places of a beauty group (e.g. "coiffeur" → hair salons). */
export const BEAUTY_GROUP_KEYWORDS: Record<BeautyGroup, string[]> = {
  hair: ['coiffeur', 'coiffure', 'cheveux', 'coupe', 'hair', 'haircut', 'cabelo', 'cabeleireiro', 'salão'],
  barber: ['barbier', 'barbe', 'barber', 'beard', 'barbearia', 'barba'],
  nails: ['ongles', 'manucure', 'onglerie', 'nails', 'manicure', 'unha'],
  brows: ['sourcils', 'cils', 'brows', 'lashes', 'sobrancelha', 'cílios'],
  waxing: ['épilation', 'cire', 'waxing', 'depilação'],
  spa: ['spa', 'massage', 'massagem'],
};

/** Extra words for some sport groups (the labels in both languages already count). */
export const SPORT_GROUP_KEYWORDS: Partial<Record<SportGroup, string[]>> = {
  run: ['courir', 'course', 'jogging', 'run', 'corrida'],
  gym: ['salle de sport', 'musculation', 'gym', 'fitness', 'academia', 'musculação'],
  bike: ['vélo', 'spinning', 'bike'],
};
