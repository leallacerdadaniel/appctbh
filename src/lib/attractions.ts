import data from '@/data/attractions.json';
import type { Localized } from '@/lib/mock-data';
import { isMustGo } from '@/lib/must-go';
import type { Period } from '@/lib/restaurants';

/**
 * Tourist attractions in Belo Horizonte (research 2026-10-16).
 * Google facts (hours, address, rating, distance from the apartment) from scripts/attractions.py;
 * names, descriptions and tips written by the team here.
 */

export type AttractionGroup = 'pampulha' | 'culture' | 'outdoors' | 'markets';
export type Price = 'free' | 'paid' | 'mixed';

type AttractionContent = {
  name: string;
  group: AttractionGroup;
  price: Price;
  duration: Localized;
  description: Localized;
  tip: Localized;
  /** Hide Google hours when they don't describe the visit (a lake, a neighbourhood…). */
  showHours?: boolean;
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: Record<string, AttractionContent> = {
  'pampulha-church': {
    name: 'Igreja São Francisco de Assis',
    group: 'pampulha',
    price: 'free',
    duration: L('45 min', '45 min'),
    description: L(
      'La petite église aux voûtes ondulées d’Oscar Niemeyer, avec les azulejos et les peintures de Portinari. Cœur de l’ensemble moderne de la Pampulha, classé au patrimoine mondial de l’UNESCO en 2016.',
      'Oscar Niemeyer’s small church with wavy vaults, with Portinari’s tiles and paintings. The heart of the Pampulha modern ensemble, a UNESCO World Heritage Site since 2016.',
    ),
    tip: L(
      'Les horaires changent selon les messes et mariages : vérifiez avant d’y aller. En fin d’après-midi, la lumière sur les azulejos est superbe.',
      'Hours change with masses and weddings: check before you go. In the late afternoon, the light on the tiles is beautiful.',
    ),
  },
  'pampulha-lagoa': {
    name: 'Lagoa da Pampulha',
    group: 'pampulha',
    price: 'free',
    duration: L('1 à 3 h', '1 to 3 h'),
    description: L(
      'Un lac entouré de 18 km de piste cyclable et des œuvres de Niemeyer. On y croise souvent des capivaras au bord de l’eau.',
      'A lake circled by an 18 km cycle path and Niemeyer’s buildings. You often spot capybaras by the water.',
    ),
    tip: L('Louez un vélo et faites le tour le dimanche matin.', 'Rent a bike and ride around it on a Sunday morning.'),
    showHours: false,
  },
  'casa-do-baile': {
    name: 'Casa do Baile',
    group: 'pampulha',
    price: 'free',
    duration: L('30 min', '30 min'),
    description: L(
      'Ancienne salle de bal de Niemeyer au bord du lac, avec sa marquise courbe, aujourd’hui centre d’architecture et de design.',
      'Niemeyer’s former dance hall on the lake, with its curving canopy, now a centre for architecture and design.',
    ),
    tip: L('À faire dans la même sortie que l’église et le lac.', 'Do it in the same outing as the church and the lake.'),
  },
  mineirao: {
    name: 'Mineirão',
    group: 'pampulha',
    price: 'mixed',
    duration: L('1 h 30 (visite) · un soir de match', '1 h 30 (tour) · a match night'),
    description: L(
      'Le grand stade de BH, avec son Musée du football. Assister à un match de l’Atlético ou du Cruzeiro est une expérience à vivre au moins une fois.',
      'BH’s big stadium, with its Football Museum. Watching an Atlético or Cruzeiro match is something to experience at least once.',
    ),
    tip: L('Achetez les billets de match en ligne et allez-y en groupe.', 'Buy match tickets online and go as a group.'),
  },
  'mercado-central': {
    name: 'Mercado Central',
    group: 'markets',
    price: 'free',
    duration: L('1 à 2 h', '1 to 2 h'),
    description: L(
      'Le marché le plus célèbre de BH : des centaines de boutiques de fromages, cachaças, doces et artisanat, et des bars où goûter le fígado com jiló.',
      'BH’s most famous market: hundreds of shops selling cheese, cachaça, sweets and crafts, and bars to try fígado com jiló.',
    ),
    tip: L('Le dimanche il ferme tôt (vers 13 h) : venez le matin.', 'On Sundays it closes early (around 1 PM): come in the morning.'),
  },
  'mercado-novo': {
    name: 'Mercado Novo',
    group: 'markets',
    price: 'free',
    duration: L('Une soirée', 'An evening'),
    description: L(
      'Un vieux marché rénové par une nouvelle génération : bars, petits restaurants, brasseries et créateurs locaux, très animé le soir.',
      'An old market revived by a new generation: bars, small restaurants, breweries and local designers, very lively at night.',
    ),
    tip: L('Ouvert jusqu’à minuit du mardi au samedi : venez en soirée.', 'Open until midnight Tuesday to Saturday: come in the evening.'),
  },
  'praca-liberdade': {
    name: 'Praça da Liberdade',
    group: 'culture',
    price: 'free',
    duration: L('Une demi-journée avec les musées', 'Half a day with the museums'),
    description: L(
      'Place-jardin entourée d’anciens palais du gouvernement devenus musées : le Circuito Liberdade, le plus grand ensemble culturel de BH, la plupart gratuits.',
      'A garden square surrounded by former government palaces turned into museums: the Circuito Liberdade, BH’s largest cultural complex, mostly free.',
    ),
    tip: L('Tous les musées sont autour de la place : un après-midi suffit pour en voir deux ou trois.', 'All the museums are around the square: one afternoon is enough to see two or three.'),
    showHours: false,
  },
  ccbb: {
    name: 'CCBB Belo Horizonte',
    group: 'culture',
    price: 'free',
    duration: L('1 à 2 h', '1 to 2 h'),
    description: L(
      'Centre culturel installé dans un palais de la Praça da Liberdade : expositions, cinéma, théâtre et un café dans la cour.',
      'A cultural centre in a palace on Praça da Liberdade: exhibitions, cinema, theatre and a café in the courtyard.',
    ),
    tip: L(
      'Entrée gratuite : réservez le billet sur le site ou à la billetterie. Fermé le mardi.',
      'Free entry: book your ticket online or at the box office. Closed on Tuesdays.',
    ),
  },
  'mm-gerdau': {
    name: 'MM Gerdau – Museu das Minas e do Metal',
    group: 'culture',
    price: 'free',
    duration: L('1 h 30', '1 h 30'),
    description: L(
      'Musée interactif sur les mines et les métaux du Minas Gerais, dans un bâtiment historique de la Praça da Liberdade. Parfait pour comprendre l’histoire de l’État.',
      'An interactive museum about Minas Gerais’ mines and metals, in a historic building on Praça da Liberdade. Perfect to understand the state’s history.',
    ),
    tip: L('Ouvert jusqu’à 22 h le jeudi selon le programme : vérifiez sur le site.', 'Open until 10 PM on Thursdays depending on the programme: check the website.'),
  },
  'palacio-artes': {
    name: 'Palácio das Artes',
    group: 'culture',
    price: 'mixed',
    duration: L('Un soir de spectacle', 'A show night'),
    description: L(
      'Le grand centre culturel de BH, au bord du Parque Municipal : concerts, danse, opéra, galeries et cinéma.',
      'BH’s main arts centre, next to Parque Municipal: concerts, dance, opera, galleries and cinema.',
    ),
    tip: L('Regardez la programmation : beaucoup de spectacles ont des prix étudiants.', 'Check the programme: many shows have student prices.'),
  },
  estacao: {
    name: 'Praça da Estação & Museu de Artes e Ofícios',
    group: 'culture',
    price: 'mixed',
    duration: L('1 h', '1 h'),
    description: L(
      'L’ancienne gare de BH abrite un musée des métiers anciens ; la place devant accueille concerts et blocos de Carnaval.',
      'BH’s old railway station houses a museum of traditional trades; the square in front hosts concerts and Carnival blocos.',
    ),
    tip: L('À combiner avec le Viaduto Santa Tereza et le centre-ville.', 'Combine it with the Santa Tereza viaduct and downtown.'),
  },
  'parque-municipal': {
    name: 'Parque Municipal',
    group: 'outdoors',
    price: 'free',
    duration: L('1 h', '1 h'),
    description: L(
      'Le grand parc arboré du centre-ville, avec lac, allées ombragées et palmiers, à côté du Palácio das Artes.',
      'The large tree-filled park downtown, with a lake, shady paths and palm trees, next to the Palácio das Artes.',
    ),
    tip: L('Agréable le matin ; évitez d’y être seul à la tombée de la nuit.', 'Nice in the morning; avoid being there alone after dark.'),
  },
  mangabeiras: {
    name: 'Mirante do Mangabeiras',
    group: 'outdoors',
    price: 'free',
    duration: L('1 h au coucher du soleil', '1 h at sunset'),
    description: L(
      'Le belvédère le plus célèbre de BH, en haut de la ville : vue sur toute la capitale, magnifique au coucher du soleil.',
      'BH’s most famous viewpoint, high above the city: a view over the whole capital, stunning at sunset.',
    ),
    tip: L('Montez en Uber et arrivez 30 minutes avant le coucher du soleil.', 'Take an Uber up and arrive 30 minutes before sunset.'),
  },
  'serra-curral': {
    name: 'Parque da Serra do Curral',
    group: 'outdoors',
    price: 'free',
    duration: L('2 à 3 h', '2 to 3 h'),
    description: L(
      'La montagne symbole de BH : sentiers sur la crête avec vue d’un côté sur la ville et de l’autre sur les montagnes du Minas.',
      'BH’s symbolic mountain: ridge trails with the city on one side and Minas’ mountains on the other.',
    ),
    tip: L('Prenez de l’eau, une casquette et des chaussures de marche.', 'Bring water, a cap and walking shoes.'),
  },
  'praca-papa': {
    name: 'Praça do Papa',
    group: 'outdoors',
    price: 'free',
    duration: L('1 h', '1 h'),
    description: L(
      'L’un des belvédères les plus connus de BH, dans les Mangabeiras : une grande esplanade avec vue à 180° sur la ville et la Serra do Curral. Son surnom vient de la messe de Jean-Paul II en 1980.',
      'One of BH’s best-known viewpoints, in the Mangabeiras: a wide esplanade with a 180° view of the city and the Serra do Curral. Its nickname comes from John Paul II’s mass in 1980.',
    ),
    tip: L('Venez au coucher du soleil, en Uber ou en voiture : la montée à pied est longue.', 'Come at sunset, by Uber or car: the walk up is long.'),
    showHours: false,
  },
  'feira-hippie': {
    name: 'Feira Hippie',
    group: 'markets',
    price: 'free',
    duration: L('Un dimanche matin', 'A Sunday morning'),
    description: L(
      'Chaque dimanche, l’Avenida Afonso Pena devient un immense marché d’artisanat, de mode et de nourriture : environ 1 km et plus de 1 500 étals.',
      'Every Sunday, Avenida Afonso Pena becomes a huge market of crafts, fashion and food: about 1 km and more than 1,500 stalls.',
    ),
    tip: L('Le dimanche de 8 h à 14 h environ. Gardez votre téléphone près de vous dans la foule.', 'Sundays from about 8 AM to 2 PM. Keep your phone close in the crowd.'),
  },
  'santa-tereza': {
    name: 'Santa Tereza',
    group: 'markets',
    price: 'free',
    duration: L('Une soirée', 'An evening'),
    description: L(
      'Le quartier bohème de BH, berceau du Clube da Esquina : botecos, musique live et maisons anciennes autour de la place de l’église.',
      'BH’s bohemian neighbourhood, birthplace of the Clube da Esquina: botecos, live music and old houses around the church square.',
    ),
    tip: L('Allez-y en Uber le soir et faites le tour des bars de la place.', 'Take an Uber at night and try the bars around the square.'),
    showHours: false,
  },
};

type AttractionFacts = {
  id: string;
  name: string;
  placeId: string;
  photoIndex: number;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number | null;
  hours: Period[];
  website: string | null;
  distanceM?: number;
  walkMin?: number;
  driveMin?: number;
};

/** Team-chosen photos, bundled with the app (replace the Google ones). */
const photos: Record<string, number> = {
  'pampulha-church': require('@/assets/attractions/pampulha-church.jpg'),
  'pampulha-lagoa': require('@/assets/attractions/pampulha-lagoa.jpg'),
  'casa-do-baile': require('@/assets/attractions/casa-do-baile.jpg'),
  mineirao: require('@/assets/attractions/mineirao.jpg'),
  'mercado-central': require('@/assets/attractions/mercado-central.jpg'),
  'mercado-novo': require('@/assets/attractions/mercado-novo.jpg'),
  'praca-liberdade': require('@/assets/attractions/praca-liberdade.jpg'),
  ccbb: require('@/assets/attractions/ccbb.jpg'),
  'mm-gerdau': require('@/assets/attractions/mm-gerdau.jpg'),
  'palacio-artes': require('@/assets/attractions/palacio-artes.jpg'),
  'parque-municipal': require('@/assets/attractions/parque-municipal.jpg'),
  mangabeiras: require('@/assets/attractions/mangabeiras.jpg'),
  'serra-curral': require('@/assets/attractions/serra-curral.jpg'),
  'praca-papa': require('@/assets/attractions/praca-papa.jpg'),
  'feira-hippie': require('@/assets/attractions/feira-hippie.jpg'),
  'santa-tereza': require('@/assets/attractions/santa-tereza.jpg'),
  estacao: require('@/assets/attractions/estacao.jpg'),
};

export const attractions = (data as { attractions: AttractionFacts[] }).attractions
  .filter((f) => content[f.id])
  .map((f) => {
    const c = content[f.id];
    return { ...f, ...c, hours: c.showHours === false ? [] : f.hours, mustGo: isMustGo(f.id), photo: photos[f.id] as number | undefined };
  });

export type Attraction = (typeof attractions)[number];

export const ATTRACTION_GROUPS: AttractionGroup[] = ['pampulha', 'culture', 'outdoors', 'markets'];

export function getAttraction(id: string) {
  return attractions.find((a) => a.id === id);
}

export function attractionMapsUrl(a: Attraction) {
  const params = new URLSearchParams({ api: '1', query: a.name, query_place_id: a.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}
