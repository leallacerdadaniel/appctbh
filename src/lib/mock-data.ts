import type { Lang } from '@/i18n';
import type { AppDocument } from '@/lib/documents.types';

/**
 * Fictional demo data. Replaced by Supabase queries once the design is approved.
 * Content written by the team (guide) carries both languages.
 */

export type Localized = Record<Lang, string>;

export type Student = {
  firstName: string;
  fullName: string;
  initials: string;
  email: string;
};

export type Apartment = {
  nickname: string;
  address: string;
  complement: string;
  neighborhood: string;
  city: string;
  wifiName: string;
  wifiPassword: string;
  mapsQuery: string;
  /** Main photo of the listing on the site (public `apartment-images` bucket). */
  photoUrl: string;
};

export type Contract = {
  semester: string;
  moveIn: string;
  moveOut: string;
  monthlyRentBrl: number;
};

export const demoStudent: Student = {
  firstName: 'Léa',
  fullName: 'Léa Martin',
  initials: 'LM',
  email: 'lea.martin@exemple.fr',
};

export const demoApartment: Apartment = {
  nickname: 'Apê Savassi',
  address: 'Rua Antônio de Albuquerque, 335',
  complement: 'Apto 802',
  neighborhood: 'Funcionários',
  city: 'Belo Horizonte',
  wifiName: 'ChezToi_Savassi',
  wifiPassword: 'bienvenue2027',
  mapsQuery: 'Rua Antônio de Albuquerque, 335, Funcionários, Belo Horizonte',
  photoUrl:
    'https://miucfiiporxhvvbefonh.supabase.co/storage/v1/object/public/apartment-images/apartment-1756409026859-dxia0v.png',
};

/** Restaurant highlighted on Home this week (id from src/lib/restaurants-content.ts). Later: set by the team in Supabase. */
export const weeklyPickId = 'trintaeum';

export const demoContract: Contract = {
  semester: '2027/1',
  moveIn: '2027-01-20',
  moveOut: '2027-06-30',
  monthlyRentBrl: 2400,
};

/** Fictional PDF bundled with the app. Real contracts come from the private `rental-contracts` bucket. */
export const demoContractDocument: AppDocument = {
  fileName: 'Contrat-ChezToi-2027-1.pdf',
  sizeBytes: 1848,
  source: { kind: 'asset', module: require('@/assets/demo/contrat-demo.pdf') },
};

export const demoRoommates = [
  { name: 'Hugo Bernard', initials: 'HB' },
  { name: 'Chloé Dubois', initials: 'CD' },
];

/** weekday: 0 = Sunday. month: 0 = January. */
export const demoNext = {
  cleaning: { weekday: 3, time: '10:00' },
  payment: { month: 1, dueDate: '2027-02-05', amountBrl: 2400 },
};

export const contacts = {
  /** Chez Toi BH WhatsApp Business, +55 31 99798-8385 (digits only, for wa.me links). */
  whatsapp: '5531997988385',
};

export type GuideItem = {
  id: string;
  title: Localized;
  category: Localized;
  body: Localized;
  /** Extra search terms in any language (PT included, students hear it daily). */
  keywords: string[];
};

export const guide: GuideItem[] = [
  {
    id: 'wifi',
    title: { fr: 'Wi‑Fi', en: 'Wi‑Fi' },
    category: { fr: 'Appartement', en: 'Apartment' },
    body: {
      fr: 'Le nom du réseau et le mot de passe sont dans l’onglet « Mon appart ». Si la connexion tombe, débranchez la box 30 secondes.',
      en: 'The network name and password are in the “My place” tab. If the connection drops, unplug the router for 30 seconds.',
    },
    keywords: ['internet', 'wifi', 'réseau', 'network', 'box', 'router'],
  },
  {
    id: 'payment',
    title: { fr: 'Paiement du loyer', en: 'Paying rent' },
    category: { fr: 'Paiements', en: 'Payments' },
    body: {
      fr: 'Le loyer est dû le 5 de chaque mois. Vous recevrez le lien de paiement par e‑mail.',
      en: 'Rent is due on the 5th of each month. You will receive the payment link by e‑mail.',
    },
    keywords: ['loyer', 'rent', 'paiement', 'payment', 'pagamento', 'aluguel', 'pix', 'wise'],
  },
  {
    id: 'emergency',
    title: { fr: 'Urgences', en: 'Emergency' },
    category: { fr: 'Sécurité', en: 'Safety' },
    body: {
      fr: 'Police : 190 · SAMU : 192 · Pompiers : 193. Pour un problème dans l’appartement, contactez Chez Toi sur WhatsApp.',
      en: 'Police: 190 · Ambulance (SAMU): 192 · Fire: 193. For a problem in the apartment, contact Chez Toi on WhatsApp.',
    },
    keywords: ['emergência', 'urgence', 'emergency', 'police', 'samu', 'pompiers', 'fire', 'ambulance'],
  },
  {
    id: 'transport',
    title: { fr: 'Se déplacer à BH', en: 'Getting around BH' },
    category: { fr: 'Ville', en: 'City' },
    body: {
      fr: 'Uber et 99 fonctionnent très bien. Évitez de sortir votre téléphone dans la rue la nuit.',
      en: 'Uber and 99 work very well. Avoid taking your phone out on the street at night.',
    },
    keywords: ['uber', '99', 'bus', 'ônibus', 'transport', 'taxi'],
  },
  {
    id: 'skema',
    title: { fr: 'SKEMA Belo Horizonte', en: 'SKEMA Belo Horizonte' },
    category: { fr: 'Études', en: 'School' },
    body: {
      fr: 'Le campus est à Funcionários. Comptez environ 15 minutes à pied depuis la Savassi.',
      en: 'The campus is in Funcionários, about a 15‑minute walk from Savassi.',
    },
    keywords: ['école', 'school', 'campus', 'skema', 'cours', 'classes'],
  },
];
