import data from '@/data/beauty.json';
import type { Localized } from '@/lib/mock-data';
import type { Period } from '@/lib/restaurants';

/**
 * "Beauté & bien-être": hair, nails, brows, hair removal and spas, from the owner's list
 * "Cabelo e salões de beleza" (2026-10-24). Google facts from scripts/beauty.py; services checked on the
 * places' own sites and Google listings the same day, descriptions and tips written here.
 * No prices on purpose: they change and would go out of date (owner's decision, 2026-10-24).
 * A chain is one card with all its units (address, phone, hours each).
 */

export type BeautyGroup = 'hair' | 'barber' | 'nails' | 'brows' | 'waxing' | 'spa';

/** Order of the owner's list, with barbers for men right after hair. */
export const BEAUTY_GROUPS: BeautyGroup[] = ['hair', 'barber', 'nails', 'brows', 'waxing', 'spa'];

type BeautyFacts = {
  id: string;
  name: string;
  placeId: string;
  address: string;
  neighborhood: string;
  hours: Period[];
  phone: string | null;
  website: string | null;
  distanceM: number | null;
  walkMin: number | null;
  driveMin: number | null;
};

/** Overrides for Google fields that are wrong or messy; `null` hides the website. */
type UnitOverride = {
  neighborhood?: string;
  address?: string;
  website?: string | null;
};

type BeautyContent = UnitOverride & {
  name: string;
  group: BeautyGroup;
  kind: Localized;
  description: Localized;
  tip: Localized;
  /** Chains: one Google place per unit (keys are ids in beauty.json). Single places use the card's own id. */
  units?: Record<string, UnitOverride>;
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: Record<string, BeautyContent> = {
  /* ---------- Hair ---------- */

  blow: {
    name: 'bLOw',
    group: 'hair',
    kind: L('Bar à brushing', 'Blow-dry bar'),
    description: L(
      'Un bar à brushing : shampooing et brushing (« escova »), avec cinq styles de brushing au choix.',
      'A blow-dry bar: wash and blow-dry (“escova”), with five blow-dry styles to choose from.',
    ),
    tip: L(
      'Réservez dans l’appli bLOw ou sur le site.',
      'Book in the bLOw app or on the website.',
    ),
    website: 'https://www.meublow.com.br/',
    units: { 'blow-savassi': {}, 'blow-belvedere': {}, 'blow-buritis': {} },
  },
  'blonde-concept': {
    name: 'The Blonde Concept',
    group: 'hair',
    kind: L('Salon · blonds et mèches', 'Salon · blondes and highlights'),
    description: L(
      'Salon spécialiste des blonds et des mèches (blondes ou brunes illuminées), avec coupes, soins capillaires (« hair spa ») et onglerie.',
      'A salon specialising in blondes and highlights (blonde or sun-kissed brunette), with cuts, hair treatments (“hair spa”) and nails.',
    ),
    tip: L(
      'Fermé le dimanche et le lundi.',
      'Closed on Sundays and Mondays.',
    ),
  },
  'fast-escova': {
    name: 'Fast Escova',
    group: 'hair',
    kind: L('Brushing et coiffage', 'Blow-dry and styling'),
    description: L(
      'Salon spécialisé dans le brushing (« escova ») et la finition des cheveux.',
      'A salon specialised in blow-dries (“escova”) and hair finishing.',
    ),
    tip: L(
      'Les trois adresses ouvrent aussi le dimanche matin.',
      'All three open on Sunday mornings too.',
    ),
    // fastescova.com.br is an unrelated cosmetics shop: only the Savassi unit has its own page.
    website: null,
    units: {
      'fast-escova-savassi': { website: 'https://www.instagram.com/fastescova.bhsavassi/' },
      'fast-escova-lourdes': {},
      'fast-escova-belvedere': {},
    },
  },
  'thiago-dias': {
    name: 'Thiago Dias Studio',
    group: 'barber',
    kind: L('Barbier · hommes', 'Barber · men'),
    description: L(
      'Studio de barbier pour hommes : coupe, barbe et barbothérapie. Thiago est aussi spécialiste de la micropigmentation du cuir chevelu et de la barbe (« NanoCapilar »).',
      'A barber studio for men: haircuts, beards and beard therapy. Thiago also specialises in scalp and beard micropigmentation (“NanoCapilar”).',
    ),
    tip: L(
      'Fermé le dimanche. Pour la micropigmentation, une évaluation se fait d’abord par WhatsApp, depuis le site.',
      'Closed on Sundays. For micropigmentation, there is an assessment first by WhatsApp, through the website.',
    ),
  },

  /* ---------- Nails ---------- */

  'lu-duarte': {
    name: 'Esmalteria Lu Duarte',
    group: 'nails',
    kind: L('Onglerie', 'Nail salon'),
    description: L('Onglerie : manucure, pédicure et ongles en gel.', 'A nail salon: manicure, pedicure and gel nails.'),
    tip: L(
      'Au 13e étage (salle 1306) d’un immeuble de bureaux.',
      'On the 13th floor (room 1306) of an office building.',
    ),
  },
  'up-esmalteria': {
    name: 'UP Esmalteria',
    group: 'nails',
    kind: L('Onglerie', 'Nail salon'),
    description: L(
      'Onglerie : manucure et pédicure, extensions en gel et soins des pieds.',
      'A nail salon: manicure and pedicure, gel extensions and foot care.',
    ),
    tip: L('Fermé le dimanche et le lundi.', 'Closed on Sundays and Mondays.'),
  },
  charmea: {
    name: 'Charmeá Estética',
    group: 'nails',
    kind: L('Onglerie et esthétique', 'Nails and beauty'),
    description: L(
      'Au Shopping 5ª Avenida : manucure, pédicure, vernis gel et extensions, mais aussi cheveux, soins du visage, massages et maquillage.',
      'In Shopping 5ª Avenida: manicure, pedicure, gel polish and extensions, plus hair, facials, massages and make-up.',
    ),
    tip: L(
      'Au 2e étage du Shopping 5ª Avenida (boutique 12C). Ouvert jusqu’à 20 h en semaine.',
      'On the 2nd floor of Shopping 5ª Avenida (shop 12C). Open until 8 pm on weekdays.',
    ),
  },

  /* ---------- Brows and lashes ---------- */

  'flavia-costa': {
    name: 'Espaço Flávia Costa',
    group: 'brows',
    kind: L('Sourcils et regard', 'Brows and eyes'),
    description: L('Design des sourcils et soins du regard.', 'Eyebrow design and eye-area care.'),
    tip: L(
      'Au 3e étage du Shopping 5ª Avenida (boutique 21C). Le lundi, ouvert seulement l’après-midi.',
      'On the 3rd floor of Shopping 5ª Avenida (shop 21C). On Mondays, open in the afternoon only.',
    ),
    address: 'R. Alagoas, 1314 - Shopping 5ª Avenida, loja 21C, 3º piso - Savassi, Belo Horizonte - MG, 30130-160',
  },
  'fabi-archanjo': {
    name: 'Fabi Archanjo Beauty',
    group: 'brows',
    kind: L('Sourcils, cils et cheveux', 'Brows, lashes and hair'),
    description: L(
      'Design et restauration des sourcils, plus cils et cheveux.',
      'Eyebrow design and restoration, plus lashes and hair.',
    ),
    tip: L('Fermé le dimanche et le lundi. Réservez par téléphone ou WhatsApp.', 'Closed on Sundays and Mondays. Book by phone or WhatsApp.'),
    address: 'Av. Getúlio Vargas, 874 (Edifício Diamond Arch) - Funcionários, Belo Horizonte - MG, 30112-021',
    // Google's link is a WhatsApp chat with a broken number; the phone row covers it.
    website: null,
  },

  /* ---------- Hair removal ---------- */

  'depyl-action': {
    name: 'Depyl Action',
    group: 'waxing',
    kind: L('Épilation', 'Hair removal'),
    description: L(
      'Réseau d’épilation : à la cire, au fil, au laser et à la lumière pulsée, plus le design des sourcils.',
      'A hair-removal chain: wax, threading, laser and pulsed light, plus eyebrow design.',
    ),
    tip: L(
      'Le laser et la lumière pulsée se font en plusieurs séances : demandez le prix d’un forfait avant de commencer.',
      'Laser and pulsed light take several sessions: ask for the price of a package before you start.',
    ),
    units: {
      'depyl-savassi': {},
      // Google says Comiteco and drops the shop number; the chain's own page says Sion, loja 04.
      'depyl-sion': {
        neighborhood: 'Sion',
        address: 'Av. dos Bandeirantes, 1332, loja 04 - Sion, Belo Horizonte - MG, 30315-032',
        website: 'https://www.depylaction.com.br/franqueada/depyl-action-bh-sion/',
      },
    },
  },

  /* ---------- Spas and massages ---------- */

  alecrim: {
    name: 'Alecrim Relaxamento e Bem-Estar',
    group: 'spa',
    kind: L('Massages et bien-être', 'Massages and well-being'),
    description: L(
      'Un grand espace de bien-être de 800 m², avec piscine et jardin : massages (dont l’abhyanga, aux huiles ayurvédiques), soins du visage, yoga et journées spa entre amis.',
      'A large 800 m² well-being space with a pool and a garden: massages (including abhyanga, with Ayurvedic oils), facials, yoga and spa days with friends.',
    ),
    tip: L('Ouvert tous les jours, week-end compris. Réservez par WhatsApp.', 'Open every day, weekends included. Book by WhatsApp.'),
  },
  'spa-lotus': {
    name: 'Spa Lótus',
    group: 'spa',
    kind: L('Spa urbain', 'Day spa'),
    description: L(
      'Spa en ville : massages, rituels de spa, journées spa et hydrothérapie (douche Vichy).',
      'A spa in town: massages, spa rituals, spa days and hydrotherapy (Vichy shower).',
    ),
    tip: L(
      'Fermé le dimanche. Le spa vend aussi des cartes cadeaux (« Vale Spa »).',
      'Closed on Sundays. The spa also sells gift cards (“Vale Spa”).',
    ),
  },
};

const facts = new Map((data as { places: BeautyFacts[] }).places.map((f) => [f.id, f]));

export const beautyPlaces = Object.entries(content).map(([id, c]) => {
  const units = Object.entries(c.units ?? { [id]: c })
    .map(([unitId, o]) => {
      const f = facts.get(unitId)!;
      return {
        ...f,
        neighborhood: o.neighborhood ?? f.neighborhood,
        address: o.address ?? f.address,
        website: o.website !== undefined ? o.website : c.website !== undefined ? c.website : f.website,
      };
    })
    // Closest unit first: it gives the card its distance.
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  const nearest = units[0];
  return {
    id,
    name: c.name,
    group: c.group,
    kind: c.kind,
    description: c.description,
    tip: c.tip,
    units,
    neighborhoods: units.map((u) => u.neighborhood),
    walkMin: nearest.walkMin,
    driveMin: nearest.driveMin,
  };
});

export type BeautyPlace = (typeof beautyPlaces)[number];
export type BeautyUnit = BeautyPlace['units'][number];

export function getBeautyPlace(id: string) {
  return beautyPlaces.find((p) => p.id === id);
}

export function beautyMapsUrl(p: BeautyPlace, u: BeautyUnit) {
  const params = new URLSearchParams({ api: '1', query: p.name, query_place_id: u.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}
