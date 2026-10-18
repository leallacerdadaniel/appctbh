import data from '@/data/sports.json';
import type { Localized } from '@/lib/mock-data';
import type { Period } from '@/lib/restaurants';

/**
 * Doing sport in BH: where to run, gym chains and places for each sport (research 2026-10-18,
 * places chosen with the owner). Google facts from scripts/sports.py; descriptions, prices and
 * tips written here. Prices change: the app says when they were checked.
 */

export type SportGroup =
  | 'run'
  | 'gym'
  | 'wakeboard'
  | 'beachTennis'
  | 'padel'
  | 'tennis'
  | 'football'
  | 'pilates'
  | 'yoga'
  | 'bike'
  | 'swimming'
  | 'jiujitsu';

/** Order of the sections and filter chips: the most popular sports first. */
export const SPORT_GROUPS: SportGroup[] = [
  'run',
  'gym',
  'football',
  'beachTennis',
  'padel',
  'tennis',
  'pilates',
  'yoga',
  'jiujitsu',
  'swimming',
  'bike',
  'wakeboard',
];

type SportContent = {
  name: string;
  groups: SportGroup[];
  kind: Localized;
  description: Localized;
  tip: Localized;
  /** Price checked on the date in the source line. */
  price?: Localized;
  /** Google's neighbourhood is wrong outside BH. */
  neighborhood?: string;
  address?: string;
  website?: string;
  /** Public spaces: Google hours don't describe the visit. */
  showHours?: boolean;
  /** The photo is a brand logo: shown small on the page instead of a big photo. */
  logo?: boolean;
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: Record<string, SportContent> = {
  /* ---------- Running ---------- */

  'run-liberdade': {
    name: 'Praça da Liberdade',
    groups: ['run'],
    kind: L('Footing en ville', 'City jogging'),
    description: L(
      'La place-jardin la plus proche de l’appartement : des allées plates et ombragées, entourées de musées, parfaites pour un footing court ou des fractionnés.',
      'The garden square closest to the apartment: flat, shady paths surrounded by museums, perfect for a short run or intervals.',
    ),
    tip: L('Très fréquentée tôt le matin et en fin de journée : c’est aussi le moment le plus agréable.', 'Busy early in the morning and late in the day: also the nicest time to go.'),
    showHours: false,
  },
  'run-parque-municipal': {
    name: 'Parque Municipal',
    groups: ['run'],
    kind: L('Parc ombragé', 'Shady park'),
    description: L(
      'Le grand parc du centre-ville, avec ses allées sous les arbres et son lac : idéal pour courir au frais.',
      'The big downtown park, with tree-lined paths and a lake: ideal for running in the shade.',
    ),
    tip: L('Fermé le lundi. Courez-y le matin et évitez d’y être seul à la tombée de la nuit.', 'Closed on Mondays. Run there in the morning and avoid being alone after dark.'),
  },
  'run-mangabeiras': {
    name: 'Parque das Mangabeiras',
    groups: ['run'],
    kind: L('Parc avec dénivelé', 'Park with hills'),
    description: L(
      'Un grand parc au pied de la Serra do Curral, avec des chemins qui montent et descendent : pour ceux qui aiment le dénivelé et la nature.',
      'A large park at the foot of the Serra do Curral, with paths that climb and drop: for those who like hills and nature.',
    ),
    tip: L(
      'Entrée gratuite, mais il faut présenter le certificat de vaccination contre la fièvre jaune et une pièce d’identité. Montez en Uber et prévoyez de l’eau : les côtes sont raides.',
      'Free entry, but you must show your yellow fever vaccination certificate and an ID. Take an Uber up and bring water: the slopes are steep.',
    ),
  },
  'run-lagoa-seca': {
    name: 'Lagoa Seca',
    groups: ['run'],
    kind: L('Circuit plat', 'Flat loop'),
    description: L(
      'Un circuit plat et asphalté autour de la Lagoa Seca, dans le Belvedere, très apprécié des coureurs du quartier.',
      'A flat, paved loop around the Lagoa Seca in Belvedere, popular with local runners.',
    ),
    tip: L('Plein de monde tôt le matin et en fin de journée ; allez-y en Uber.', 'Busy early in the morning and late in the day; take an Uber there.'),
    showHours: false,
  },
  'run-pampulha': {
    name: 'Lagoa da Pampulha',
    groups: ['run'],
    kind: L('Grand tour du lac', 'Big lake loop'),
    description: L(
      'Le tour du lac fait environ 18 km, sur une piste partagée avec les vélos, au milieu des bâtiments de Niemeyer : le grand classique pour les sorties longues.',
      'The loop around the lake is about 18 km, on a path shared with bikes, among Niemeyer’s buildings: the classic for long runs.',
    ),
    tip: L('Loin de l’appartement : allez-y en Uber le dimanche matin, quand il fait encore frais.', 'Far from the apartment: go by Uber on a Sunday morning, while it is still cool.'),
    showHours: false,
  },

  /* ---------- Gym chains ---------- */

  'smart-fit': {
    name: 'Smart Fit',
    groups: ['gym'],
    logo: true,
    kind: L('Chaîne de salles · prix bas', 'Gym chain · low prices'),
    description: L(
      'La plus grande chaîne de salles de sport d’Amérique latine, avec plus de 2 000 salles : abonnements bon marché et une unité à quelques minutes à pied de l’appartement.',
      'Latin America’s largest gym chain, with more than 2,000 gyms: cheap memberships and a unit a few minutes’ walk from the apartment.',
    ),
    tip: L('Le plan Black donne accès à toutes les salles du réseau ; le prix varie selon le quartier.', 'The Black plan gives access to every gym in the chain; the price depends on the neighbourhood.'),
  },
  bluefit: {
    name: 'Bluefit',
    groups: ['gym'],
    logo: true,
    kind: L('Chaîne de salles · 24 h/24', 'Gym chain · 24/7'),
    description: L(
      'Chaîne de salles en pleine croissance au Minas Gerais ; l’unité du Savassi Mall, à côté de l’appartement, est ouverte 24 h/24.',
      'A fast-growing gym chain in Minas Gerais; the Savassi Mall unit, next to the apartment, is open 24/7.',
    ),
    tip: L('Pratique pour s’entraîner très tôt ou très tard.', 'Handy for training very early or very late.'),
  },
  'contorno-do-corpo': {
    name: 'Contorno do Corpo',
    groups: ['gym'],
    logo: true,
    kind: L('Chaîne mineira', 'Minas gym chain'),
    description: L(
      'Chaîne née au Minas Gerais, avec plus de 50 salles dans l’État, dont plusieurs autour de Funcionários, Lourdes et Santo Antônio.',
      'A chain born in Minas Gerais, with more than 50 gyms in the state, including several around Funcionários, Lourdes and Santo Antônio.',
    ),
    tip: L('Comparez les unités : certaines sont plus grandes et mieux équipées que d’autres.', 'Compare the units: some are bigger and better equipped than others.'),
  },
  pratique: {
    name: 'Pratique Fitness',
    groups: ['gym'],
    logo: true,
    kind: L('Chaîne de BH', 'BH gym chain'),
    description: L(
      'Chaîne fondée à BH en 2002, l’une des plus grandes de la ville, avec des salles bien équipées ; l’unité Prime Funcionários est l’une des plus proches.',
      'A chain founded in BH in 2002, one of the city’s biggest, with well-equipped gyms; the Prime Funcionários unit is one of the closest.',
    ),
    tip: L('Demandez une séance d’essai avant de vous abonner.', 'Ask for a trial session before signing up.'),
  },

  /* ---------- Wakeboard ---------- */

  'bh-wake-school': {
    name: 'BH Wake School',
    groups: ['wakeboard'],
    kind: L('Wakeboard derrière un bateau', 'Boat wakeboarding'),
    description: L(
      'École de wakeboard installée au Clube Serra da Moeda, sur la Lagoa dos Ingleses (Nova Lima), le seul club de la région où les bateaux à moteur sont autorisés. Des étapes du championnat du monde de wakeboard s’y déroulent.',
      'A wakeboard school at Clube Serra da Moeda, on the Lagoa dos Ingleses (Nova Lima), the only club in the region where motorboats are allowed. World wakeboard championship events take place there.',
    ),
    price: L(
      'Cours derrière le bateau : ≈ R$ 400 (20 min) ou R$ 500 (30 min). Lac pour débutants : R$ 75 en semaine, R$ 95 le week-end (mai 2026).',
      'Boat lessons: ≈ R$ 400 (20 min) or R$ 500 (30 min). Beginners’ lake: R$ 75 on weekdays, R$ 95 at weekends (May 2026).',
    ),
    tip: L('Réservez par Instagram (@bhwakeschool) ou WhatsApp ; le club est à ≈ 40 min de voiture.', 'Book on Instagram (@bhwakeschool) or WhatsApp; the club is ≈ 40 min away by car.'),
    neighborhood: 'Lagoa dos Ingleses (Nova Lima)',
    address: 'Clube Serra da Moeda, BR-040 – Lagoa dos Ingleses, Nova Lima - MG',
    website: 'https://www.instagram.com/bhwakeschool/',
  },
  /* ---------- Beach tennis and padel ---------- */

  'pe-na-areia': {
    name: 'Pé na Areia',
    groups: ['beachTennis'],
    kind: L('Courts de sable', 'Sand courts'),
    description: L(
      'Courts de sable dans la Serra pour le beach tennis et le volley, ouverts tous les jours jusqu’à 22 h.',
      'Sand courts in Serra for beach tennis and volleyball, open every day until 10 PM.',
    ),
    tip: L('Réservez le court à l’avance le soir et le week-end.', 'Book the court ahead in the evening and at weekends.'),
  },
  'layback-park': {
    name: 'LayBack Park',
    groups: ['beachTennis'],
    kind: L('Beach tennis, skate et bar', 'Beach tennis, skate and bar'),
    description: L(
      'Parc de loisirs à Vale do Sereno (Nova Lima), fondé par le skateur Pedro Barros : terrains de sable couverts et découverts, piste de skate, restaurants et pub avec concerts.',
      'A leisure park in Vale do Sereno (Nova Lima), founded by skater Pedro Barros: covered and open sand courts, a skate park, restaurants and a pub with concerts.',
    ),
    tip: L('Un bon plan de week-end entre amis : jouer, puis manger et boire sur place.', 'A good weekend plan with friends: play, then eat and drink on site.'),
    neighborhood: 'Vale do Sereno (Nova Lima)',
  },
  'orla-sports': {
    name: 'Orla Sports',
    groups: ['beachTennis', 'padel'],
    kind: L('Beach tennis, padel et volley', 'Beach tennis, padel and volleyball'),
    description: L(
      'Complexe sportif du Belvedere avec courts de sable et de padel, vestiaires et espace barbecue.',
      'A sports complex in Belvedere with sand and padel courts, changing rooms and a barbecue area.',
    ),
    tip: L('À plusieurs, le prix du court se partage vite.', 'With friends, the court price is quickly shared.'),
  },
  '4set-arena': {
    name: '4Set Arena',
    groups: ['padel', 'beachTennis'],
    kind: L('Padel, beach tennis et volley', 'Padel, beach tennis and volleyball'),
    description: L(
      'Arène du quartier Buritis avec courts de padel et de sable : location de courts et cours.',
      'An arena in Buritis with padel and sand courts: court rental and classes.',
    ),
    tip: L('Loin de l’appartement : regroupez-vous pour partager l’Uber.', 'Far from the apartment: go as a group to share the Uber.'),
  },

  /* ---------- Football ---------- */

  'arena-7-bh': {
    name: 'Arena 7 BH',
    groups: ['football', 'beachTennis'],
    kind: L('Football, beach tennis et futevôlei', 'Football, beach tennis and footvolley'),
    description: L(
      'Complexe multisports ouvert tous les jours : football, futevôlei, beach tennis, volley de plage, fonctionnel et pilates, avec parking, bar et espace détente.',
      'A multi-sport complex open every day: football, footvolley, beach tennis, beach volleyball, functional training and pilates, with parking, a bar and a leisure area.',
    ),
    tip: L('Réservez un terrain ou demandez un cours d’essai par WhatsApp sur le site.', 'Book a pitch or ask for a trial class on WhatsApp through the website.'),
  },
  'la-bombonera': {
    name: 'La Bombonera Centro Esportivo',
    groups: ['football'],
    kind: L('Foot et école de foot', 'Football and football school'),
    description: L(
      'Centre sportif du Buritis avec un grand terrain, une école de foot pour enfants et des « peladas » (matchs entre amis) régulières, avec bar et parking payant.',
      'A sports centre in Buritis with a big pitch, a football school for children and regular “peladas” (friendly matches), with a bar and paid parking.',
    ),
    tip: L('Le parking est payant et petit : allez-y à plusieurs, en Uber.', 'Parking is paid and small: go as a group, by Uber.'),
  },

  'arena-serra': {
    name: 'Arena Serra',
    groups: ['football'],
    kind: L('Foot society à louer', 'Five-a-side pitches to rent'),
    description: L(
      'Terrains de foot society à louer à l’heure, dans la Serra, ouverts jusqu’à minuit en semaine.',
      'Five/seven-a-side pitches rented by the hour in Serra, open until midnight on weekdays.',
    ),
    tip: L('Le plus simple : rejoindre une « pelada » (match entre amis) organisée par d’autres étudiants.', 'The easiest way: join a “pelada” (a friendly match) organised by other students.'),
  },

  /* ---------- Tennis ---------- */

  'fast-tennis': {
    name: 'Fast Tennis',
    groups: ['tennis'],
    kind: L('Cours de tennis · plusieurs unités', 'Tennis classes · several units'),
    description: L(
      'Réseau d’écoles de tennis né à BH, avec un concept « Fun & Flex » : des cours dynamiques et flexibles, sans esprit de compétition, pour tous les âges. Plusieurs unités dans la ville : Savassi (la plus proche, ci-dessous), Estoril, Santa Lúcia, Lagoa Seca, Saul Macedo, Calafate et Cidade Nova.',
      'A tennis school network born in BH, with a “Fun & Flex” concept: dynamic, flexible classes, with no competitive pressure, for all ages. Several units across the city: Savassi (the closest, below), Estoril, Santa Lúcia, Lagoa Seca, Saul Macedo, Calafate and Cidade Nova.',
    ),
    tip: L('Le site officiel liste toutes les unités : choisissez celle qui est sur votre trajet.', 'The official website lists every unit: pick the one on your way.'),
  },
  /* ---------- Pilates ---------- */

  'aera-pilates': {
    name: 'Aera Pilates',
    groups: ['pilates'],
    kind: L('Pilates collectif et dynamique', 'Dynamic group pilates'),
    description: L(
      'Studio du Belvedere qui propose un pilates collectif, intense et dynamique, à la même adresse que le Vidya Studio.',
      'A Belvedere studio offering intense, dynamic group pilates, at the same address as Vidya Studio.',
    ),
    tip: L('Combinez avec un cours de yoga au Vidya, juste à côté.', 'Combine it with a yoga class at Vidya, right next door.'),
  },
  goya: {
    name: 'Goyá Health Club',
    groups: ['pilates', 'yoga'],
    kind: L('Yoga, pilates et fonctionnel', 'Yoga, pilates and functional'),
    description: L(
      'Studio de bien-être à Santa Lúcia, près du Belvedere, qui réunit yoga, mat pilates et entraînement fonctionnel.',
      'A wellness studio in Santa Lúcia, near Belvedere, bringing together yoga, mat pilates and functional training.',
    ),
    tip: L('Regardez le planning sur le site avant d’y aller : les horaires changent selon les cours.', 'Check the schedule on the website before going: hours depend on the classes.'),
  },

  /* ---------- Yoga ---------- */

  'flow-yoga': {
    name: 'Flow Yoga',
    groups: ['yoga'],
    kind: L('Studio de yoga', 'Yoga studio'),
    description: L(
      'Studio de yoga et de méditation à Vila da Serra : Yoga Flow, Ashtanga, Yin Yoga et cours de souplesse.',
      'A yoga and meditation studio in Vila da Serra: Yoga Flow, Ashtanga, Yin Yoga and flexibility classes.',
    ),
    tip: L('Ouvert aussi le samedi et le dimanche matin.', 'Also open on Saturday and Sunday mornings.'),
    neighborhood: 'Vila da Serra (Nova Lima)',
  },
  vidya: {
    name: 'Vidya Studio',
    groups: ['yoga'],
    kind: L('Yoga et hot yoga', 'Yoga and hot yoga'),
    description: L(
      'Studio spécialisé en yoga et en hot yoga (yoga en salle chauffée), dans le Belvedere.',
      'A studio specialising in yoga and hot yoga (yoga in a heated room), in Belvedere.',
    ),
    tip: L('Pour le hot yoga, prenez une serviette et beaucoup d’eau.', 'For hot yoga, bring a towel and plenty of water.'),
  },

  /* ---------- Indoor cycling ---------- */

  velocity: {
    name: 'Studio Velocity',
    groups: ['bike'],
    kind: L('Bike indoor en musique', 'Indoor cycling to music'),
    description: L(
      'Grande chaîne brésilienne de bike indoor : des cours rythmés par la musique, menés par des instructeurs. Unités à Vila da Serra et à Lourdes.',
      'A big Brazilian indoor cycling chain: classes paced by the music, led by instructors. Units in Vila da Serra and Lourdes.',
    ),
    tip: L('L’unité de Lourdes (rue Gonçalves Dias) est plus proche de l’appartement.', 'The Lourdes unit (Rua Gonçalves Dias) is closer to the apartment.'),
    neighborhood: 'Vila da Serra (Nova Lima)',
  },

  /* ---------- Swimming ---------- */

  'companhia-do-nado': {
    name: 'Companhia do Nado',
    groups: ['swimming'],
    kind: L('Natation et salle', 'Swimming and gym'),
    description: L(
      'Salle avec piscine dans le quartier Cruzeiro/Anchieta : natation, musculation et bike indoor.',
      'A gym with a pool in Cruzeiro/Anchieta: swimming, weights and indoor cycling.',
    ),
    tip: L('Demandez les horaires des cours de natation pour adultes.', 'Ask for the adult swimming class times.'),
  },

  /* ---------- Jiu-jitsu ---------- */

  'gracie-barra': {
    name: 'Gracie Barra Savassi',
    groups: ['jiujitsu'],
    kind: L('Jiu-jitsu brésilien', 'Brazilian jiu-jitsu'),
    description: L(
      'Académie de jiu-jitsu brésilien de la Savassi : cours avec et sans kimono, cours féminins et lutte, du débutant à l’avancé.',
      'A Brazilian jiu-jitsu academy in Savassi: gi and no-gi classes, women’s classes and wrestling, from beginner to advanced.',
    ),
    tip: L('Le premier cours est gratuit : réservez-le sur le site.', 'The first class is free: book it on the website.'),
  },
};

type SportFacts = {
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

/** Team-chosen photos: Explorer's (same places) and the ones added for this section. */
const teamPhotos: Record<string, number> = {
  'run-pampulha': require('@/assets/attractions/pampulha-lagoa.jpg'),
  'run-liberdade': require('@/assets/attractions/praca-liberdade.jpg'),
  'run-parque-municipal': require('@/assets/attractions/parque-municipal.jpg'),
  'run-lagoa-seca': require('@/assets/sports/run-lagoa-seca.jpg'),
  'run-mangabeiras': require('@/assets/sports/run-mangabeiras.jpg'),
  'smart-fit': require('@/assets/sports/smart-fit.jpg'),
  'bluefit': require('@/assets/sports/bluefit.jpg'),
  'contorno-do-corpo': require('@/assets/sports/contorno-do-corpo.jpg'),
  'pratique': require('@/assets/sports/pratique.jpg'),
};

export const sportPlaces = (data as { places: SportFacts[] }).places
  .filter((f) => content[f.id])
  .map((f) => {
    const c = content[f.id];
    return {
      ...f,
      ...c,
      neighborhood: c.neighborhood ?? f.neighborhood,
      address: c.address ?? f.address,
      website: c.website ?? f.website,
      hours: c.showHours === false ? [] : f.hours,
      photo: teamPhotos[f.id] as number | undefined,
    };
  });

export type SportPlace = (typeof sportPlaces)[number];

export function getSportPlace(id: string) {
  return sportPlaces.find((p) => p.id === id);
}

export function sportMapsUrl(p: SportPlace) {
  const params = new URLSearchParams({ api: '1', query: p.name, query_place_id: p.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}
