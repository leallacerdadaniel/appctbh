import { Platform } from 'react-native';

import type { Localized } from '@/lib/mock-data';

/**
 * "Applis et services": the companies students use day to day and to travel in Brazil (chosen with the owner,
 * research 2026-10-19). Requirements for foreigners checked on the companies' own pages where they exist;
 * logos are the official App Store icons.
 */

export type ServiceGroup = 'ride' | 'food' | 'bank' | 'air' | 'bus' | 'car';

/** Order of the sections and filter chips: what is used most often first. */
export const SERVICE_GROUPS: ServiceGroup[] = ['ride', 'food', 'bank', 'air', 'bus', 'car'];

const L = (fr: string, en: string): Localized => ({ fr, en });

// The same advice applies to every bank and every rental company.
const bankTip = L(
  'Le compte s’ouvre dans l’appli, mais il faut d’abord un CPF et, en général, votre RNM (registre migratoire) : le passeport seul ne suffit pas. Vérifiez les documents demandés dans l’appli avant de commencer.',
  'You open the account in the app, but you first need a CPF and usually your RNM (migration registration): a passport alone is not enough. Check the documents the app asks for before starting.',
);
const carTip = L(
  'Il faut votre passeport, une carte de crédit à votre nom et le permis de votre pays, valable 180 jours après l’arrivée au Brésil. Prenez aussi le permis international : il est exigé pour les pays de la Convention de Vienne, comme la France.',
  'You need your passport, a credit card in your name and your home driving licence, valid for 180 days after arriving in Brazil. Bring an international driving permit too: it is required for Vienna Convention countries such as France.',
);

type Service = {
  id: string;
  name: string;
  group: ServiceGroup;
  kind: Localized;
  description: Localized;
  tip: Localized;
  website: string;
  /** App Store id; Android opens a Play Store search for the name. */
  appStoreId: string;
  logo: number;
};

export const services: Service[] = [
  /* ---------- Rides ---------- */
  {
    id: 'uber',
    name: 'Uber',
    group: 'ride',
    kind: L('VTC par appli', 'Ride-hailing app'),
    description: L(
      'L’appli de VTC la plus connue : UberX pour le quotidien, Comfort pour plus d’espace et Uber Moto. Votre compte Uber habituel fonctionne au Brésil.',
      'The best-known ride-hailing app: UberX for everyday trips, Comfort for more room and Uber Moto. Your usual Uber account works in Brazil.',
    ),
    tip: L(
      'Vérifiez la plaque et le nom du chauffeur avant de monter. On peut aussi payer en espèces ou par Pix.',
      'Check the plate and the driver’s name before getting in. You can also pay in cash or by Pix.',
    ),
    website: 'https://www.uber.com/br/pt-br/',
    appStoreId: '368677368',
    logo: require('@/assets/services/uber.jpg'),
  },
  {
    id: '99',
    name: '99',
    group: 'ride',
    kind: L('VTC et taxis par appli', 'Rides and taxis app'),
    description: L(
      'L’appli de VTC née au Brésil : voitures (99Pop), taxis et motos, dans les grandes villes du pays.',
      'The ride-hailing app born in Brazil: cars (99Pop), taxis and motorbikes, in the country’s big cities.',
    ),
    tip: L(
      'Comparez avec Uber avant de commander : selon l’heure, l’une ou l’autre est moins chère.',
      'Compare with Uber before booking: depending on the time, either one can be cheaper.',
    ),
    website: 'https://99app.com/',
    appStoreId: '553663691',
    logo: require('@/assets/services/99.jpg'),
  },

  /* ---------- Food delivery ---------- */
  {
    id: 'ifood',
    name: 'iFood',
    group: 'food',
    kind: L('Livraison de repas et de courses', 'Food and grocery delivery'),
    description: L(
      'La grande appli de livraison du Brésil : restaurants, mais aussi supermarchés et pharmacies.',
      'Brazil’s big delivery app: restaurants, but also supermarkets and pharmacies.',
    ),
    tip: L(
      'L’inscription demande un CPF, et les cartes étrangères sont souvent refusées : payez par Pix, avec une carte brésilienne, ou à la livraison (« pagar na entrega ») quand le restaurant le propose.',
      'Signing up requires a CPF, and foreign cards are often refused: pay by Pix, with a Brazilian card, or on delivery (“pagar na entrega”) when the restaurant offers it.',
    ),
    website: 'https://www.ifood.com.br/',
    appStoreId: '483017239',
    logo: require('@/assets/services/ifood.jpg'),
  },

  /* ---------- Digital banks ---------- */
  {
    id: 'nubank',
    name: 'Nubank',
    group: 'bank',
    kind: L('Banque numérique', 'Digital bank'),
    description: L(
      'La plus grande banque numérique du Brésil, à la carte violette : compte gratuit, Pix et carte de crédit sans frais annuels.',
      'Brazil’s biggest digital bank, with the purple card: free account, Pix and a credit card with no annual fee.',
    ),
    tip: bankTip,
    website: 'https://nubank.com.br/',
    appStoreId: '814456780',
    logo: require('@/assets/services/nubank.jpg'),
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    group: 'bank',
    kind: L('Banque numérique', 'Digital bank'),
    description: L(
      'Banque numérique avec compte gratuit et Pix, et une « Conta Global » en dollars ou en euros, pratique pour l’argent venu de l’étranger.',
      'A digital bank with a free account and Pix, plus a “Conta Global” in dollars or euros, handy for money from abroad.',
    ),
    tip: bankTip,
    website: 'https://www.c6bank.com.br/',
    appStoreId: '1463463143',
    logo: require('@/assets/services/c6.jpg'),
  },
  {
    id: 'inter',
    name: 'Inter',
    group: 'bank',
    kind: L('Banque numérique', 'Digital bank'),
    description: L(
      'Banque numérique née à Belo Horizonte : compte gratuit, Pix et une appli qui réunit aussi achats en ligne et cashback.',
      'A digital bank born in Belo Horizonte: free account, Pix and an app that also brings together online shopping and cashback.',
    ),
    tip: bankTip,
    website: 'https://inter.co/',
    appStoreId: '839711154',
    logo: require('@/assets/services/inter.jpg'),
  },

  /* ---------- Airlines ---------- */
  {
    id: 'azul',
    name: 'Azul',
    group: 'air',
    kind: L('Compagnie aérienne', 'Airline'),
    description: L(
      'Confins est le deuxième plus grand hub d’Azul, avec une soixantaine de destinations au Brésil et à l’étranger.',
      'Confins is Azul’s second-biggest hub, with around sixty destinations in Brazil and abroad.',
    ),
    tip: L(
      'Les vols partent de Confins (CNF), à ≈ 40 km : comptez ≈ 1 h en Uber, ou prenez le bus Conexão Aeroporto.',
      'Flights leave from Confins (CNF), ≈ 40 km away: allow ≈ 1 h by Uber, or take the Conexão Aeroporto bus.',
    ),
    website: 'https://www.voeazul.com.br/',
    appStoreId: '690105616',
    logo: require('@/assets/services/azul.jpg'),
  },
  {
    id: 'gol',
    name: 'Gol',
    group: 'air',
    kind: L('Compagnie aérienne', 'Airline'),
    description: L(
      'Compagnie brésilienne à petits prix, avec des vols de Confins vers les grandes villes comme São Paulo, Rio et Salvador.',
      'A Brazilian low-cost airline, with flights from Confins to big cities such as São Paulo, Rio and Salvador.',
    ),
    tip: L(
      'Comparez les trois compagnies sur Google Flights : les prix varient beaucoup selon le jour.',
      'Compare the three airlines on Google Flights: prices vary a lot from day to day.',
    ),
    website: 'https://www.voegol.com.br/',
    appStoreId: '337961662',
    logo: require('@/assets/services/gol.jpg'),
  },
  {
    id: 'latam',
    name: 'LATAM',
    group: 'air',
    kind: L('Compagnie aérienne', 'Airline'),
    description: L(
      'Le plus grand groupe aérien d’Amérique latine : pratique pour les voyages en Amérique du Sud et les correspondances internationales via São Paulo.',
      'Latin America’s biggest airline group: handy for trips around South America and international connections through São Paulo.',
    ),
    tip: L(
      'Pour l’Amérique du Sud, vérifiez les documents demandés dans l’onglet BH, rubrique Explorer, page de chaque destination.',
      'For South America, check the required documents in the BH tab, Explore section, on each destination’s page.',
    ),
    website: 'https://www.latamairlines.com/br/pt',
    appStoreId: '1497908631',
    logo: require('@/assets/services/latam.jpg'),
  },

  /* ---------- Bus ---------- */
  {
    id: 'buser',
    name: 'Buser',
    group: 'bus',
    kind: L('Voyages en bus', 'Bus trips'),
    description: L(
      'Appli de voyages en bus affrétés, souvent moins chers que les compagnies classiques, avec des départs de BH vers d’autres villes.',
      'An app for chartered bus trips, often cheaper than the classic bus companies, with departures from BH to other cities.',
    ),
    tip: L(
      'Le départ n’est pas toujours à la gare routière : vérifiez l’adresse dans l’appli avant de partir.',
      'Departures are not always from the bus station: check the address in the app before leaving.',
    ),
    website: 'https://www.buser.com.br/',
    appStoreId: '1383778218',
    logo: require('@/assets/services/buser.jpg'),
  },

  /* ---------- Car rental ---------- */
  {
    id: 'localiza',
    name: 'Localiza',
    group: 'car',
    kind: L('Location de voitures', 'Car rental'),
    description: L(
      'Le leader de la location de voitures au Brésil, né à Belo Horizonte en 1973, avec des agences en ville et à l’aéroport de Confins. Âge minimum 18 ans, avec un supplément « jeune conducteur » avant 21 ans.',
      'Brazil’s car rental leader, born in Belo Horizonte in 1973, with branches in town and at Confins airport. Minimum age 18, with a “young driver” extra under 21.',
    ),
    tip: carTip,
    website: 'https://www.localiza.com/brasil/pt-br',
    appStoreId: '429739212',
    logo: require('@/assets/services/localiza.jpg'),
  },
  {
    id: 'movida',
    name: 'Movida',
    group: 'car',
    kind: L('Location de voitures', 'Car rental'),
    description: L(
      'L’une des grandes loueuses de voitures du Brésil, avec des agences dans tout le pays. Vérifiez l’âge minimum au moment de réserver.',
      'One of Brazil’s big car rental companies, with branches across the country. Check the minimum age when booking.',
    ),
    tip: carTip,
    website: 'https://www.movida.com.br/',
    appStoreId: '418900431',
    logo: require('@/assets/services/movida.jpg'),
  },
];

export type ServiceItem = (typeof services)[number];

export function getService(id: string) {
  return services.find((s) => s.id === id);
}

/** App Store page on iOS; elsewhere a Play Store search (package names change, the name doesn't). */
export function appUrl(s: ServiceItem) {
  return Platform.OS === 'ios'
    ? `https://apps.apple.com/br/app/id${s.appStoreId}`
    : `https://play.google.com/store/search?q=${encodeURIComponent(s.name)}&c=apps`;
}
