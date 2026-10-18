import data from '@/data/nightlife.json';
import type { Localized } from '@/lib/mock-data';
import type { Period } from '@/lib/restaurants';

/**
 * Going out at night: bars and clubs chosen by the owner (2026-10-18).
 * Google facts from scripts/nightlife.py; descriptions, party days and tips written here.
 * Clubs open on party nights only, so their Google hours are hidden and `when` says when to go.
 */

export type NightKind = 'bar' | 'club';

type NightContent = {
  name: string;
  kind: NightKind;
  vibe: Localized;
  description: Localized;
  when: Localized;
  tip: Localized;
  /** Shown as a badge and on the page: the place exists but is not open now. */
  closed?: Localized;
  /** Google's neighbourhood is wrong for a few places. */
  neighborhood?: string;
  /** Hand-checked link when Google's points to the wrong page. */
  website?: string;
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: Record<string, NightContent> = {
  /* ---------- Bars ---------- */

  redentor: {
    name: 'Redentor Bar',
    kind: 'bar',
    vibe: L('Bar, chope et musique live', 'Bar, draught beer and live music'),
    description: L(
      'Un classique de la Savassi depuis une vingtaine d’années, au coin des rues Fernandes Tourinho et Sergipe : grande véranda, chope bien fraîche, petiscos et plats brésiliens, avec de la musique live certains soirs.',
      'A Savassi classic for about twenty years, on the corner of Fernandes Tourinho and Sergipe streets: a big veranda, cold draught beer, petiscos and Brazilian dishes, with live music on some nights.',
    ),
    when: L('Tous les jours, jusqu’à minuit ou 1 h', 'Every day, until midnight or 1 AM'),
    tip: L('Le Berilo est juste en face : facile d’enchaîner les deux.', 'Berilo is right across the street: easy to do both.'),
  },
  berilo: {
    name: 'Berilo Cozinha & Drinks',
    kind: 'bar',
    vibe: L('Cocktails et cuisine contemporaine', 'Cocktails and contemporary food'),
    description: L(
      'Bar à cocktails et cuisine contemporaine en face du Redentor : un endroit agréable pour commencer la soirée autour d’un drink et de quelques plats à partager.',
      'A cocktail bar with contemporary food across from Redentor: a nice place to start the evening with a drink and a few dishes to share.',
    ),
    when: L('Tous les jours ; jusqu’à 23 h 30 du jeudi au samedi', 'Every day; until 11:30 PM Thursday to Saturday'),
    tip: L('Pas de réservation le vendredi soir : arrivez tôt.', 'No bookings on Friday nights: arrive early.'),
  },
  moema: {
    name: 'Moema Bar e Cozinha',
    kind: 'bar',
    vibe: L('Drinks et petiscos', 'Drinks and petiscos'),
    description: L(
      'Bar récent de la rue Sergipe, tout près du Redentor : drinks, petiscos et plats dans une ambiance agréable pour discuter.',
      'A recent bar on Rua Sergipe, very close to Redentor: drinks, petiscos and dishes in a pleasant setting for talking.',
    ),
    when: L('Tous les jours ; jusqu’à minuit du jeudi au dimanche', 'Every day; until midnight Thursday to Sunday'),
    tip: L('Bon point de départ avant de sortir dans la Savassi.', 'A good starting point before going out in Savassi.'),
  },
  'estacao-savassi': {
    name: 'Estação Savassi',
    kind: 'bar',
    vibe: L('Bar, musique live et tables dehors', 'Bar, live music and outdoor tables'),
    description: L(
      'Bar animé à deux pas de l’appartement, avec musique live et tables en terrasse : idéal pour une chope entre amis.',
      'A lively bar a short walk from the apartment, with live music and outdoor tables: ideal for a beer with friends.',
    ),
    when: L('Tous les jours ; jusqu’à 2 h 30 le vendredi et le samedi', 'Every day; until 2:30 AM on Fridays and Saturdays'),
    tip: L('Venez pour la chope et la musique plutôt que pour manger.', 'Come for the beer and the music rather than the food.'),
  },
  'mercado-novo': {
    name: 'Mercado Novo',
    kind: 'bar',
    vibe: L('Bars, brasseries et petits restaurants', 'Bars, breweries and small restaurants'),
    description: L(
      'Un vieux marché du centre rénové par une nouvelle génération : bars, brasseries artisanales, petits restaurants et créateurs locaux, très animé le soir.',
      'An old downtown market revived by a new generation: bars, craft breweries, small restaurants and local designers, very lively at night.',
    ),
    when: L('Le soir du mardi au samedi, jusqu’à minuit', 'Evenings Tuesday to Saturday, until midnight'),
    tip: L('Faites le tour des étages avant de choisir où vous asseoir.', 'Walk around the floors before choosing where to sit.'),
  },

  /* ---------- Clubs and parties ---------- */

  lab: {
    name: 'LAB',
    kind: 'club',
    vibe: L('Boîte, styles variés', 'Club, mixed styles'),
    description: L(
      'Boîte de la Savassi, sur l’avenue do Contorno, qui accueille des soirées de styles très variés selon les nuits.',
      'A Savassi club on Avenida do Contorno that hosts parties in very different styles depending on the night.',
    ),
    when: L('Le vendredi et le week-end, selon la programmation', 'On Fridays and at weekends, depending on the programme'),
    tip: L('Regardez l’Instagram de la boîte pour savoir quelle soirée a lieu.', 'Check the club’s Instagram to see which party is on.'),
  },
  'major-lock': {
    name: 'Major Lock Pub',
    kind: 'club',
    vibe: L('Pub alternatif avec DJs', 'Alternative pub with DJs'),
    description: L(
      'Pub alternatif du centre, avec drapeaux suspendus au plafond, DJs et drinks : l’ambiance change selon la soirée.',
      'An alternative downtown pub with flags hanging from the ceiling, DJs and drinks: the vibe changes with each party.',
    ),
    when: L('Du jeudi au samedi, de 20 h à 2 h', 'Thursday to Saturday, 8 PM to 2 AM'),
    tip: L('Les billets des soirées sont vendus sur Sympla.', 'Party tickets are sold on Sympla.'),
  },
  'night-market': {
    name: 'Night Market',
    kind: 'club',
    vibe: L('Rooftop avec vue sur la ville', 'Rooftop with a city view'),
    description: L(
      'Rooftop en haut de l’Estoril, à 500 m du BH Shopping, avec une vue sur toute la ville : drinks, petiscos et soirées jusqu’au petit matin.',
      'A rooftop high in Estoril, 500 m from BH Shopping, with a view over the whole city: drinks, petiscos and parties until dawn.',
    ),
    when: L('Soirées le vendredi et le samedi, de 22 h à 5 h ; coucher de soleil le dimanche', 'Parties on Fridays and Saturdays, 10 PM to 5 AM; sunset on Sundays'),
    tip: L('Loin de l’appartement : prévoyez un Uber pour l’aller et le retour.', 'Far from the apartment: plan an Uber both ways.'),
    website: 'https://www.nightmarket.com.br/',
  },
  raro: {
    name: 'Raro Club',
    kind: 'club',
    vibe: L('Boîte haut de gamme', 'High-end club'),
    description: L(
      'Boîte haut de gamme à Vila da Serra, juste après la limite de BH : elle n’ouvre que certaines nuits, annoncées sur son site et ses réseaux.',
      'A high-end club in Vila da Serra, just past the BH city limit: it only opens on some nights, announced on its website and social media.',
    ),
    when: L('Certains vendredis et samedis, de 21 h à 6 h', 'Some Fridays and Saturdays, 9 PM to 6 AM'),
    tip: L('Allez-y en Uber : la boîte est à Nova Lima, en haut de la colline.', 'Take an Uber: the club is in Nova Lima, up the hill.'),
    neighborhood: 'Vila da Serra (Nova Lima)',
  },
  chalezinho: {
    name: 'Chalezinho',
    kind: 'club',
    vibe: L('Musique brésilienne live', 'Live Brazilian music'),
    description: L(
      'Grande maison de fêtes de l’Estoril, connue depuis plus de 20 ans pour ses concerts de musique brésilienne et son ambiance festive.',
      'A big party venue in Estoril, known for more than 20 years for its Brazilian music shows and festive vibe.',
    ),
    when: L('Fermé pour travaux en ce moment', 'Closed for renovation at the moment'),
    tip: L('Suivez ses réseaux pour connaître la date de réouverture.', 'Follow its social media to know when it reopens.'),
    closed: L('Fermé pour travaux', 'Closed for renovation'),
  },
};

type NightFacts = {
  id: string;
  name: string;
  placeId: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  hours: Period[];
  website: string | null;
  distanceM?: number;
  walkMin?: number;
  driveMin?: number;
};

/** Team-chosen photos, bundled with the app (replace the Google ones). */
const teamPhotos: Record<string, number> = {
  redentor: require('@/assets/nightlife/redentor.jpg'),
  berilo: require('@/assets/nightlife/berilo.jpg'),
  moema: require('@/assets/nightlife/moema.jpg'),
  'estacao-savassi': require('@/assets/nightlife/estacao-savassi.jpg'),
  lab: require('@/assets/nightlife/lab.jpg'),
  'major-lock': require('@/assets/nightlife/major-lock.jpg'),
  'night-market': require('@/assets/nightlife/night-market.jpg'),
  raro: require('@/assets/nightlife/raro.jpg'),
  chalezinho: require('@/assets/nightlife/chalezinho.jpg'),
  // Same place as in Explorer.
  'mercado-novo': require('@/assets/attractions/mercado-novo.jpg'),
};

export const nightPlaces = (data as { places: NightFacts[] }).places
  .filter((f) => content[f.id])
  .map((f) => {
    const c = content[f.id];
    return {
      ...f,
      ...c,
      neighborhood: c.neighborhood ?? f.neighborhood,
      website: c.website ?? f.website,
      // Clubs open on party nights only: Google's weekly hours would mislead.
      hours: c.kind === 'club' ? [] : f.hours,
      photo: teamPhotos[f.id] as number | undefined,
    };
  });

export type NightPlace = (typeof nightPlaces)[number];

export const NIGHT_KINDS: NightKind[] = ['bar', 'club'];

export function getNightPlace(id: string) {
  return nightPlaces.find((p) => p.id === id);
}

export function nightMapsUrl(p: NightPlace) {
  const params = new URLSearchParams({ api: '1', query: p.name, query_place_id: p.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}
