import data from '@/data/festivals.json';
import type { Localized } from '@/lib/mock-data';
import { isMustGo } from '@/lib/must-go';

/**
 * Events and festivals students can plan around (research 2026-10-18).
 * Dates move every year: `when` gives the usual period and what is known for 2027, and the
 * app tells students to check the organiser before going. Photos: Google Maps through the
 * place-photo function (placeId + photoIndex in src/data/festivals.json), of the place that hosts the event.
 */

export type FestivalContent = {
  id: string;
  name: string;
  /** Calendar order: month the event usually starts (1–12). */
  month: number;
  when: Localized;
  place: Localized;
  city: string;
  /** Free-text entry cost; left out when we can't state it reliably. */
  cost?: Localized;
  description: Localized;
  tip: Localized;
  website?: string;
  mapsQuery: string;
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: FestivalContent[] = [
  {
    id: 'carnaval',
    name: 'Carnaval de rue de BH',
    month: 1,
    when: L(
      'Du 23 janvier au 14 février 2027 ; défilés des écoles de samba avenida dos Andradas les 13 et 14 février',
      'From 23 January to 14 February 2027; samba school parades on Avenida dos Andradas on 13 and 14 February',
    ),
    place: L('Rues de toute la ville ; défilés avenida dos Andradas', 'Streets across the city; parades on Avenida dos Andradas'),
    city: 'Belo Horizonte, MG',
    cost: L('Gratuit dans la rue', 'Free in the street'),
    description: L(
      'Des centaines de blocos (cortèges de rue avec fanfare) envahissent BH pendant trois semaines. Le carnaval de BH est devenu l’un des plus grands du pays : costumes, musique live et places pleines de monde.',
      'Hundreds of blocos (street parades with live bands) take over BH for three weeks. BH’s carnival has become one of the biggest in the country: costumes, live music and packed squares.',
    ),
    tip: L(
      'Programme des blocos publié par la mairie en janvier. Emportez peu d’affaires, de l’eau, et gardez votre téléphone en lieu sûr.',
      'The city publishes the blocos programme in January. Carry little, bring water, and keep your phone safe.',
    ),
    mapsQuery: 'Avenida dos Andradas, Belo Horizonte',
  },
  {
    id: 'comida-di-buteco',
    name: 'Comida di Buteco',
    month: 4,
    when: L(
      'Environ un mois, d’avril à mai (2026 : du 10 avril au 10 mai) ; dates 2027 non annoncées',
      'About a month, April to May (2026: 10 April to 10 May); 2027 dates not announced',
    ),
    place: L('Plus de 120 botecos de la ville', 'More than 120 botecos across the city'),
    city: 'Belo Horizonte, MG',
    cost: L('Entrée libre : vous payez ce que vous mangez', 'Free entry: you pay for what you eat'),
    description: L(
      'Concours des meilleurs botecos : chaque bar participant crée un petit plat original (petiscos à R$ 40 en 2026), et le public et un jury secret votent. Né à BH, c’est l’occasion de découvrir la cuisine de bar mineira dans toute la ville.',
      'A contest between the best botecos: each bar creates one original dish (petiscos at R$ 40 in 2026), and the public and a secret jury vote. Born in BH, it’s a way to discover Minas bar food all over the city.',
    ),
    tip: L(
      'Le site officiel liste les bars participants et leurs plats. Faites un parcours de 2 ou 3 bars avec des amis.',
      'The official website lists the bars and their dishes. Plan a route of 2 or 3 bars with friends.',
    ),
    website: 'https://comidadibuteco.com.br',
    mapsQuery: 'Santa Tereza, Belo Horizonte',
  },
  {
    id: 'arraial',
    name: 'Arraial de BH & festas juninas',
    month: 6,
    when: L(
      'Fêtes de juin dans les quartiers ; le grand Arraial de Belô a eu lieu en 2026 du 24 juillet au 2 août',
      'June parties in the neighbourhoods; the big Arraial de Belô took place in 2026 from 24 July to 2 August',
    ),
    place: L('Mineirinho (Pampulha)', 'Mineirinho (Pampulha)'),
    city: 'Belo Horizonte, MG',
    cost: L('Entrée gratuite au Mineirinho', 'Free entry at the Mineirinho'),
    description: L(
      'Les festas juninas sont les fêtes de la Saint-Jean brésilienne : quadrilhas (danses en costume), forró, feu de camp, canjica, pamonha et vin chaud. L’Arraial de Belô, organisé par la mairie, en est la grande version à BH, avec concerts, quadrilhas et stands de cuisine.',
      'Festas juninas are Brazil’s June festivals (Saint John’s celebrations): quadrilhas (costumed dances), forró, canjica, pamonha and mulled wine. The Arraial de Belô, run by the city, is the big version in BH, with concerts, quadrilhas and food stalls.',
    ),
    tip: L(
      'Habillez‑vous en chemise à carreaux pour le style. Beaucoup d’églises et d’écoles font aussi leur festa junina : demandez à vos voisins.',
      'Wear a plaid shirt for the look. Many churches and schools hold their own festa junina: ask your neighbours.',
    ),
    mapsQuery: 'Mineirinho, Belo Horizonte',
  },
  {
    id: 'mangalarga',
    name: 'Exposição Nacional do Mangalarga Marchador',
    month: 7,
    when: L(
      'Deux semaines en juillet–août (2026 : du 18 juillet au 1er août) ; dates 2027 non annoncées',
      'Two weeks in July–August (2026: 18 July to 1 August); 2027 dates not announced',
    ),
    place: L('Parque de Exposições da Gameleira', 'Parque de Exposições da Gameleira'),
    city: 'Belo Horizonte, MG',
    description: L(
      'La plus grande exposition de la race Mangalarga Marchador, le cheval brésilien à l’allure « marchée » très douce : plus de 1 600 chevaux, concours, ventes et gastronomie. Une belle immersion dans la culture rurale du Minas.',
      'The biggest show of the Mangalarga Marchador, the Brazilian horse with a very smooth “marching” gait: more than 1,600 horses, contests, sales and food. A great dive into Minas rural culture.',
    ),
    tip: L(
      'Vérifiez le prix d’entrée et la programmation sur le site de l’association (ABCCMM) avant d’y aller.',
      'Check entry price and programme on the breeders’ association site (ABCCMM) before going.',
    ),
    website: 'https://abccmm.org.br',
    mapsQuery: 'Parque de Exposições da Gameleira, Belo Horizonte',
  },
  {
    id: 'inverno-ouro-preto',
    name: 'Festival de Inverno de Ouro Preto',
    month: 7,
    when: L('Pendant le mois de juillet ; dates 2027 non annoncées', 'During the month of July; 2027 dates not announced'),
    place: L('Centre historique d’Ouro Preto', 'Ouro Preto historic centre'),
    city: 'Ouro Preto, MG',
    cost: L('Programme en grande partie gratuit', 'Programme mostly free'),
    description: L(
      'Un mois de concerts, théâtre, danse et cinéma dans les rues et théâtres de la ville baroque, en pleine saison sèche. Les lieux changent parfois d’une année à l’autre.',
      'A month of concerts, theatre, dance and film in the streets and theatres of the baroque town, in the dry season. Venues sometimes change from year to year.',
    ),
    tip: L(
      'Les nuits sont fraîches en juillet : prenez une veste. Réservez le logement tôt, la ville est pleine.',
      'Nights are cool in July: bring a jacket. Book accommodation early, the town gets full.',
    ),
    mapsQuery: 'Centro Histórico, Ouro Preto',
  },
  {
    id: 'tiradentes-gastronomia',
    name: 'Festival Cultura e Gastronomia de Tiradentes',
    month: 8,
    when: L(
      'Dix jours fin août (2026 : du 21 au 30 août, 29e édition) ; la 30e est prévue en 2027',
      'Ten days in late August (2026: 21 to 30 August, 29th edition); the 30th is planned for 2027',
    ),
    place: L('Places du centre historique de Tiradentes', 'Squares of Tiradentes’ historic centre'),
    city: 'Tiradentes, MG',
    cost: L('Animations gratuites sur les places, repas payants', 'Free events in the squares, paid meals'),
    description: L(
      'Le plus ancien festival gastronomique du pays : grands chefs, cuisine mineira, dégustations et musique dans la petite ville coloniale. En 2026, il a réuni environ 70 000 personnes.',
      'The country’s longest-running gastronomy festival: top chefs, Minas cooking, tastings and music in the little colonial town. In 2026 it drew about 70,000 people.',
    ),
    tip: L(
      'À environ 3 h de BH : prévoyez un week-end et réservez tôt l’hébergement.',
      'About 3 h from BH: plan a weekend and book accommodation early.',
    ),
    mapsQuery: 'Centro Histórico, Tiradentes',
  },
  {
    id: 'casacor',
    name: 'Casa Cor Minas',
    month: 8,
    when: L(
      'Six à sept semaines à partir de mi-août (2026 : dès le 15 août, PUC Minas Lourdes) ; 2027 à confirmer',
      'Six to seven weeks from mid-August (2026: from 15 August, PUC Minas Lourdes); 2027 to be confirmed',
    ),
    place: L('Bâtiment de la PUC Minas, Lourdes (en 2026)', 'PUC Minas building, Lourdes (in 2026)'),
    city: 'Belo Horizonte, MG',
    cost: L('Entrée payante', 'Paid entry'),
    description: L(
      'La grande exposition d’architecture, de design d’intérieur, de paysagisme et d’art : des architectes aménagent chacun un espace dans un bâtiment visité par des dizaines de milliers de personnes. Le lieu change presque chaque année.',
      'The big exhibition of architecture, interior design, landscaping and art: architects each design a space inside a building visited by tens of thousands. The venue changes almost every year.',
    ),
    tip: L(
      'Achetez le billet en ligne sur le site officiel et venez en semaine pour éviter la foule.',
      'Buy the ticket online on the official site and go on a weekday to avoid the crowds.',
    ),
    website: 'https://casacor.com.br',
    mapsQuery: 'CASACOR Minas Gerais, Belo Horizonte',
  },
];

const photos = new Map((data as { id: string; placeId: string; photoIndex: number }[]).map((p) => [p.id, p]));

/** Team-chosen photos, bundled with the app (replace the Google ones). */
const teamPhotos: Record<string, number> = {
  carnaval: require('@/assets/festivals/carnaval.jpg'),
  'comida-di-buteco': require('@/assets/festivals/comida-di-buteco.jpg'),
  arraial: require('@/assets/festivals/arraial.jpg'),
  mangalarga: require('@/assets/festivals/mangalarga.jpg'),
  'inverno-ouro-preto': require('@/assets/festivals/inverno-ouro-preto.jpg'),
  'tiradentes-gastronomia': require('@/assets/festivals/tiradentes-gastronomia.jpg'),
  casacor: require('@/assets/festivals/casacor.jpg'),
};

export const festivals = content
  .map((e) => ({
    ...e,
    placeId: photos.get(e.id)!.placeId,
    photoIndex: photos.get(e.id)!.photoIndex,
    photo: teamPhotos[e.id] as number | undefined,
    mustGo: isMustGo(e.id),
  }))
  .sort((a, b) => a.month - b.month);

export type FestivalItem = (typeof festivals)[number];

export function getFestival(id: string) {
  return festivals.find((e) => e.id === id);
}

export function festivalMapsUrl(e: FestivalItem) {
  const params = new URLSearchParams({ api: '1', query: e.mapsQuery });
  return `https://www.google.com/maps/search/?${params}`;
}
