import { Platform } from 'react-native';

import type { Localized } from '@/lib/mock-data';

/**
 * "Applis et services": the companies students use day to day and to travel in Brazil (chosen with the owner,
 * research 2026-10-19). Requirements for foreigners checked on the companies' own pages where they exist;
 * logos are the official App Store icons.
 */

export type ServiceGroup = 'daily' | 'ride' | 'food' | 'money' | 'bank' | 'health' | 'events' | 'air' | 'bus' | 'car';

/** Order of the sections and filter chips: what is used most often first. */
export const SERVICE_GROUPS: ServiceGroup[] = ['daily', 'ride', 'food', 'money', 'bank', 'health', 'events', 'air', 'bus', 'car'];

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
  /* ---------- Added 2026-11-08 (owner's list). Texts from each app's App Store page (Brazil, 08/11/2026). ---------- */
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    group: 'daily',
    kind: L('Messagerie', 'Messaging'),
    description: L(
      'Au Brésil, presque tout passe par WhatsApp : la Chez Toi, les colocataires, les restaurants, les cabinets médicaux et beaucoup d’entreprises répondent par là.',
      'In Brazil almost everything happens on WhatsApp: Chez Toi, your roommates, restaurants, doctors’ offices and many companies answer there.',
    ),
    tip: L(
      'Votre compte habituel fonctionne au Brésil, même avec votre numéro français : pas besoin d’un numéro brésilien pour l’utiliser.',
      'Your usual account works in Brazil, even with your home number: you don’t need a Brazilian number to use it.',
    ),
    website: 'https://www.whatsapp.com/',
    appStoreId: '310633997',
    logo: require('@/assets/services/whatsapp.jpg'),
  },
  {
    id: 'mercado-livre',
    name: 'Mercado Livre',
    group: 'daily',
    kind: L('Achats en ligne', 'Online shopping'),
    description: L(
      'Le grand site d’achats en ligne du Brésil : électronique, maison, vêtements et presque tout le reste, livrés à l’appartement.',
      'Brazil’s big online store: electronics, home, clothes and almost everything else, delivered to the apartment.',
    ),
    tip: L(
      'Il faut un CPF pour créer le compte et recevoir les livraisons. Mettez l’adresse complète avec le numéro de l’appartement.',
      'You need a CPF to open the account and receive deliveries. Use the full address with the apartment number.',
    ),
    website: 'https://www.mercadolivre.com.br/',
    appStoreId: '463624852',
    logo: require('@/assets/services/mercado-livre.jpg'),
  },
  {
    id: 'govbr',
    name: 'gov.br',
    group: 'daily',
    kind: L('Services publics', 'Public services'),
    description: L(
      'Le compte unique du gouvernement brésilien : il ouvre les services en ligne qui affichent le bouton « Entrar com gov.br ».',
      'The Brazilian government’s single account: it opens the online services that show the “Entrar com gov.br” button.',
    ),
    tip: L(
      'Il faut un CPF pour créer le compte : faites-le une fois le CPF obtenu (voir Démarches).',
      'You need a CPF to create the account: do it once you have your CPF (see Paperwork).',
    ),
    website: 'https://www.gov.br/',
    appStoreId: '1506827551',
    logo: require('@/assets/services/govbr.jpg'),
  },
  {
    id: 'moovit',
    name: 'Moovit',
    group: 'ride',
    kind: L('Transports en commun', 'Public transport'),
    description: L(
      'Les itinéraires en bus et en métro à BH, avec les horaires, les arrêts et le trajet à pied jusqu’à l’arrêt.',
      'Bus and metro routes in BH, with schedules, stops and the walk to the stop.',
    ),
    tip: L(
      'Pratique en journée pour les trajets du quotidien ; le soir, Uber ou 99 restent plus simples et plus sûrs.',
      'Handy in the daytime for everyday trips; at night, Uber or 99 are simpler and safer.',
    ),
    website: 'https://moovit.com/',
    appStoreId: '498477945',
    logo: require('@/assets/services/moovit.jpg'),
  },
  {
    id: 'rappi',
    name: 'Rappi',
    group: 'food',
    kind: L('Livraison de repas et de courses', 'Food and grocery delivery'),
    description: L(
      'Repas, courses, boissons et produits de pharmacie livrés en quelques minutes, dans plus de 300 villes d’Amérique latine.',
      'Meals, groceries, drinks and pharmacy items delivered in minutes, in more than 300 Latin American cities.',
    ),
    tip: L(
      'Comparez avec iFood avant de commander : les promotions changent d’une appli à l’autre.',
      'Compare with iFood before ordering: the deals change from one app to the other.',
    ),
    website: 'https://www.rappi.com.br/',
    appStoreId: '984044296',
    logo: require('@/assets/services/rappi.jpg'),
  },
  {
    id: 'ze-delivery',
    name: 'Zé Delivery',
    group: 'food',
    kind: L('Livraison de boissons', 'Drinks delivery'),
    description: L(
      'Bière, vin et boissons fraîches livrées chez vous, avec glace, charbon et snacks ; en mode turbo, en 15 minutes au plus.',
      'Beer, wine and cold drinks delivered home, with ice, charcoal and snacks; in turbo mode, within 15 minutes.',
    ),
    tip: L(
      'La vente d’alcool est interdite aux moins de 18 ans au Brésil.',
      'Selling alcohol to under-18s is forbidden in Brazil.',
    ),
    website: 'https://www.ze.delivery/',
    appStoreId: '1070070438',
    logo: require('@/assets/services/ze-delivery.jpg'),
  },
  {
    id: 'duo-gourmet',
    name: 'Duo Gourmet',
    group: 'food',
    kind: L('Club de restaurants', 'Restaurant club'),
    description: L(
      'Un abonnement qui donne deux plats pour le prix d’un dans des milliers de restaurants, et des réductions sur d’autres sorties.',
      'A subscription that gives two dishes for the price of one in thousands of restaurants, plus discounts on other outings.',
    ),
    tip: L(
      'C’est un abonnement payant : faites le calcul si vous sortez souvent au restaurant.',
      'It’s a paid subscription: do the maths if you eat out often.',
    ),
    website: 'https://www.duogourmet.com.br/',
    appStoreId: '1222687142',
    logo: require('@/assets/services/duo-gourmet.jpg'),
  },
  {
    id: 'wise',
    name: 'Wise',
    group: 'money',
    kind: L('Compte international', 'International account'),
    description: L(
      'Pour changer des euros en reais au taux de change commercial, sans frais cachés, et envoyer de l’argent dans plus de 70 pays.',
      'To change euros into reais at the mid-market rate, with no hidden fees, and send money to more than 70 countries.',
    ),
    tip: L(
      'Avant un gros transfert, comme le loyer, comparez le montant reçu avec celui de votre banque.',
      'Before a big transfer, such as the rent, compare the amount received with your bank’s offer.',
    ),
    website: 'https://wise.com/br/',
    appStoreId: '612261027',
    logo: require('@/assets/services/wise.jpg'),
  },
  {
    id: 'revolut',
    name: 'Revolut',
    group: 'money',
    kind: L('Compte international', 'International account'),
    description: L(
      'Un compte en euros, en dollars et dans plus de 30 devises, avec une carte pour payer au Brésil comme chez vous.',
      'An account in euros, dollars and more than 30 currencies, with a card to pay in Brazil as you do at home.',
    ),
    tip: L(
      'Au terminal de paiement ou au distributeur, choisissez toujours de payer en reais (BRL) : la conversion proposée par la machine coûte plus cher.',
      'At the card machine or the ATM, always choose to pay in reais (BRL): the conversion offered by the machine costs more.',
    ),
    website: 'https://www.revolut.com/',
    appStoreId: '932493382',
    logo: require('@/assets/services/revolut.jpg'),
  },
  {
    id: 'araujo',
    name: 'Drogaria Araujo',
    group: 'health',
    kind: L('Pharmacie', 'Pharmacy'),
    description: L(
      'La grande chaîne de pharmacies de BH, avec des magasins ouverts 24 h et la livraison par l’appli.',
      'BH’s big pharmacy chain, with shops open 24 hours and delivery through the app.',
    ),
    tip: L(
      'Les antibiotiques ne sont vendus qu’avec une ordonnance, que la pharmacie garde.',
      'Antibiotics are only sold with a prescription, which the pharmacy keeps.',
    ),
    website: 'https://www.araujo.com.br/',
    appStoreId: '1258317711',
    logo: require('@/assets/services/araujo.jpg'),
  },
  {
    id: 'mater-dei',
    name: 'Meu Mater Dei',
    group: 'health',
    kind: L('Hôpital', 'Hospital'),
    description: L(
      'L’appli du réseau d’hôpitaux Mater Dei : prendre rendez-vous pour une consultation ou un examen, voir les résultats et les ordonnances numériques.',
      'The app of the Mater Dei hospital network: book a consultation or a test, see results and digital prescriptions.',
    ),
    tip: L(
      'Avant d’y aller, vérifiez avec votre assurance si elle couvre les hôpitaux privés et comment être remboursé ; gardez toutes les factures.',
      'Before going, check with your insurance whether it covers private hospitals and how to get reimbursed; keep every invoice.',
    ),
    website: 'https://www.materdei.com.br/',
    appStoreId: '6505126185',
    logo: require('@/assets/services/mater-dei.jpg'),
  },
  {
    id: 'wellhub',
    name: 'Wellhub',
    group: 'health',
    kind: L('Sport et bien-être', 'Fitness and wellbeing'),
    description: L(
      'Un seul abonnement pour des salles de sport, des studios et des activités (yoga, natation, crossfit), quand une entreprise l’offre à ses employés.',
      'One plan for gyms, studios and activities (yoga, swimming, CrossFit), when a company offers it to its employees.',
    ),
    tip: L(
      'C’est un avantage d’employeur : en stage au Brésil, demandez à l’entreprise si elle le propose. Sinon, voyez Explorer › Sport.',
      'It’s an employer benefit: on an internship in Brazil, ask the company if it offers it. Otherwise, see Explore › Sport.',
    ),
    website: 'https://wellhub.com/',
    appStoreId: '703761434',
    logo: require('@/assets/services/wellhub.jpg'),
  },
  {
    id: 'sympla',
    name: 'Sympla',
    group: 'events',
    kind: L('Billets et événements', 'Tickets and events'),
    description: L(
      'La plus grande plateforme d’événements du Brésil : soirées, concerts, festivals, cours et idées pour le week-end, avec le billet dans l’appli.',
      'Brazil’s biggest events platform: parties, concerts, festivals, classes and weekend ideas, with the ticket in the app.',
    ),
    tip: L(
      'Achetez tôt : beaucoup de soirées passent au tarif suivant (le « lote ») quand le premier est vendu.',
      'Buy early: many parties move to the next price tier (the “lote”) once the first one sells out.',
    ),
    website: 'https://www.sympla.com.br/',
    appStoreId: '1136318924',
    logo: require('@/assets/services/sympla.jpg'),
  },
  {
    id: 'eventim',
    name: 'Eventim',
    group: 'events',
    kind: L('Billets de concerts', 'Concert tickets'),
    description: L(
      'Billets pour les grands concerts et spectacles, avec le choix de la place sur le plan de la salle.',
      'Tickets for big concerts and shows, choosing your seat on the venue map.',
    ),
    tip: L(
      'Achetez seulement dans l’appli ou sur le site officiel : les billets revendus ailleurs peuvent être faux.',
      'Only buy in the app or on the official site: tickets resold elsewhere can be fake.',
    ),
    website: 'https://www.eventim.com.br/',
    appStoreId: '1187371599',
    logo: require('@/assets/services/eventim.jpg'),
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
