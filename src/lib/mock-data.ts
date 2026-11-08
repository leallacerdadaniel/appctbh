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
