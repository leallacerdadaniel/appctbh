import { contacts, demoApartment } from '@/lib/mock-data';

import { addDays, addMonths, isoDate, monthOf, mondayOf } from './dates';
import type {
  AnyRequest,
  CalendarSync,
  Chore,
  Expense,
  GourmetSpace,
  HouseRule,
  InspectionReport,
  InventoryItem,
  Notice,
  PaymentInfo,
  ReminderPrefs,
  Resident,
  ResidentDocument,
  ServiceItem,
  Stay,
} from './types';

/**
 * Demo content for the local store. Everything here is FICTIONAL and is replaced by rows of the
 * Chez Toi Supabase in wave 2 (written by the team in the panel). Dates are relative to today so
 * the demo always looks alive.
 */

export const ME = 'r-lea';

export const residents: Resident[] = [
  { id: ME, firstName: 'Léa', fullName: 'Léa Martin', initials: 'LM', email: 'lea.martin@exemple.fr', phone: '33600000001', pixKey: 'lea.martin@exemple.fr', room: 'Quarto 1' },
  { id: 'r-hugo', firstName: 'Hugo', fullName: 'Hugo Bernard', initials: 'HB', email: 'hugo.bernard@exemple.fr', phone: '33600000002', pixKey: 'hugo.bernard@exemple.fr', room: 'Quarto 2' },
  { id: 'r-chloe', firstName: 'Chloé', fullName: 'Chloé Dubois', initials: 'CD', email: 'chloe.dubois@exemple.fr', phone: '33600000003', pixKey: 'chloe.dubois@exemple.fr', room: 'Quarto 3' },
];

function demoStay(today: Date): Stay {
  const moveIn = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const moveOut = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  return {
    id: 'stay-1',
    residentId: ME,
    apartmentId: 'apt-savassi',
    semester: `${moveIn.getFullYear()}/${moveIn.getMonth() >= 6 ? 2 : 1}`,
    moveIn: isoDate(moveIn),
    moveOut: isoDate(moveOut),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    monthlyRentBrl: 2400,
    depositBrl: 2400,
    rentDueDay: 5,
  };
}

export const stay = demoStay(new Date());

export const apartment = { id: 'apt-savassi', ...demoApartment };

export const paymentInfo: PaymentInfo = {
  beneficiary: 'Chez Toi BH (exemplo)',
  cnpj: '00.000.000/0001-00',
  pixKey: '00.000.000/0001-00',
  pixKeyType: 'cnpj',
  bank: 'Banco exemplo (000)',
  agency: '0001',
  account: '00000-0',
};

export const teamWhatsapp = contacts.whatsapp;

export const serviceCatalog: ServiceItem[] = [
  {
    id: 'svc-cleaning',
    category: 'cleaning',
    emoji: '🧽',
    name: { fr: 'Ménage supplémentaire', en: 'Extra cleaning' },
    description: {
      fr: 'Deux heures de ménage de votre chambre et des espaces communs, en plus du passage hebdomadaire.',
      en: 'Two hours of cleaning in your room and shared areas, on top of the weekly visit.',
    },
    priceBrl: 120,
    unit: { fr: 'par passage', en: 'per visit' },
    leadTimeHours: 48,
    allowsQuantity: false,
  },
  {
    id: 'svc-laundry',
    category: 'laundry',
    emoji: '🧺',
    name: { fr: 'Laverie', en: 'Laundry' },
    description: {
      fr: 'Nous récupérons le sac à l’appartement et le rapportons lavé, séché et plié sous 48 h.',
      en: 'We pick the bag up at the apartment and bring it back washed, dried and folded within 48 h.',
    },
    priceBrl: 45,
    unit: { fr: 'par sac', en: 'per bag' },
    leadTimeHours: 24,
    allowsQuantity: true,
  },
  {
    id: 'svc-bedding',
    category: 'laundry',
    emoji: '🛏️',
    name: { fr: 'Changement des draps', en: 'Bedding change' },
    description: {
      fr: 'Draps et serviettes propres, lit refait.',
      en: 'Fresh sheets and towels, bed made.',
    },
    priceBrl: 40,
    unit: { fr: 'par lit', en: 'per bed' },
    leadTimeHours: 24,
    allowsQuantity: true,
  },
  {
    id: 'svc-chef',
    category: 'chef',
    emoji: '👩‍🍳',
    name: { fr: 'Chef à domicile', en: 'Private chef' },
    description: {
      fr: 'Un dîner mineiro préparé chez vous : entrée, plat et dessert. Courses comprises.',
      en: 'A Minas Gerais dinner cooked at home: starter, main and dessert. Groceries included.',
    },
    priceBrl: 90,
    unit: { fr: 'par personne', en: 'per person' },
    leadTimeHours: 72,
    allowsQuantity: true,
  },
  {
    id: 'svc-transfer',
    category: 'transfer',
    emoji: '✈️',
    name: { fr: 'Transfert aéroport (Confins)', en: 'Airport transfer (Confins)' },
    description: {
      fr: 'Chauffeur de confiance entre l’appartement et l’aéroport de Confins, bagages compris.',
      en: 'A trusted driver between the apartment and Confins airport, luggage included.',
    },
    priceBrl: 180,
    unit: { fr: 'par trajet', en: 'per trip' },
    leadTimeHours: 24,
    allowsQuantity: false,
  },
];

export const houseRules: HouseRule[] = [
  {
    id: 'rule-quiet',
    scope: 'building',
    emoji: '🤫',
    title: { fr: 'Silence de 22 h à 8 h', en: 'Quiet hours 10 pm – 8 am' },
    body: {
      fr: 'Règlement de l’immeuble : pas de musique forte ni de fête après 22 h. Les voisins appellent le syndic, qui peut infliger une amende.',
      en: 'Building rules: no loud music or parties after 10 pm. Neighbours call the manager, who can issue a fine.',
    },
  },
  {
    id: 'rule-guests',
    scope: 'building',
    emoji: '🪪',
    title: { fr: 'Invités à la conciergerie', en: 'Guests at the front desk' },
    body: {
      fr: 'Tout invité laisse une pièce d’identité à la portaria. Prévenez le portier si quelqu’un arrive en votre absence.',
      en: 'Every guest leaves an ID at the front desk (portaria). Tell the doorman if someone arrives while you are out.',
    },
  },
  {
    id: 'rule-trash',
    scope: 'building',
    emoji: '🗑️',
    title: { fr: 'Poubelles et recyclage', en: 'Trash and recycling' },
    body: {
      fr: 'Sacs fermés au local du rez‑de‑chaussée. Recyclage le mardi et le vendredi.',
      en: 'Closed bags in the ground‑floor trash room. Recycling on Tuesdays and Fridays.',
    },
  },
  {
    id: 'rule-smoke',
    scope: 'apartment',
    emoji: '🚭',
    title: { fr: 'Non‑fumeur', en: 'No smoking' },
    body: {
      fr: 'Interdit de fumer dans l’appartement et sur le balcon. Le nettoyage d’odeur est facturé.',
      en: 'No smoking in the apartment or on the balcony. Odour cleaning is billed.',
    },
  },
  {
    id: 'rule-overnight',
    scope: 'apartment',
    emoji: '🛌',
    title: { fr: 'Invités pour la nuit', en: 'Overnight guests' },
    body: {
      fr: 'Prévenez vos colocataires et Chez Toi. Trois nuits par mois au maximum.',
      en: 'Let your roommates and Chez Toi know. Three nights a month at most.',
    },
  },
  {
    id: 'rule-kitchen',
    scope: 'apartment',
    emoji: '🍳',
    title: { fr: 'Cuisine propre le soir', en: 'Clean kitchen at night' },
    body: {
      fr: 'Vaisselle faite et plan de travail rangé avant d’aller dormir : les fourmis arrivent vite à BH.',
      en: 'Dishes done and counters cleared before bed: ants show up fast in BH.',
    },
  },
  {
    id: 'rule-ac',
    scope: 'apartment',
    emoji: '❄️',
    title: { fr: 'Climatisation', en: 'Air conditioning' },
    body: {
      fr: 'Fenêtres fermées quand la clim tourne, et éteinte en sortant.',
      en: 'Windows closed while the AC runs, and switch it off when you leave.',
    },
  },
];

export const inventory: InventoryItem[] = [
  { id: 'inv-1', room: { fr: 'Salon', en: 'Living room' }, name: { fr: 'Canapé 3 places', en: '3‑seat sofa' }, quantity: 1, condition: 'good' },
  { id: 'inv-2', room: { fr: 'Salon', en: 'Living room' }, name: { fr: 'Télévision 50"', en: '50" TV' }, quantity: 1, condition: 'new' },
  { id: 'inv-3', room: { fr: 'Salon', en: 'Living room' }, name: { fr: 'Table et 4 chaises', en: 'Table and 4 chairs' }, quantity: 1, condition: 'good' },
  { id: 'inv-4', room: { fr: 'Cuisine', en: 'Kitchen' }, name: { fr: 'Réfrigérateur', en: 'Fridge' }, quantity: 1, condition: 'good' },
  { id: 'inv-5', room: { fr: 'Cuisine', en: 'Kitchen' }, name: { fr: 'Micro‑ondes', en: 'Microwave' }, quantity: 1, condition: 'good' },
  { id: 'inv-6', room: { fr: 'Cuisine', en: 'Kitchen' }, name: { fr: 'Assiettes', en: 'Plates' }, quantity: 12, condition: 'good' },
  { id: 'inv-7', room: { fr: 'Cuisine', en: 'Kitchen' }, name: { fr: 'Casseroles', en: 'Pans' }, quantity: 4, condition: 'worn' },
  { id: 'inv-8', room: { fr: 'Chambre 1', en: 'Bedroom 1' }, name: { fr: 'Lit double et matelas', en: 'Double bed and mattress' }, quantity: 1, condition: 'good' },
  { id: 'inv-9', room: { fr: 'Chambre 1', en: 'Bedroom 1' }, name: { fr: 'Bureau et chaise', en: 'Desk and chair' }, quantity: 1, condition: 'good' },
  { id: 'inv-10', room: { fr: 'Chambre 1', en: 'Bedroom 1' }, name: { fr: 'Climatiseur', en: 'Air conditioner' }, quantity: 1, condition: 'good' },
  { id: 'inv-11', room: { fr: 'Salle de bain', en: 'Bathroom' }, name: { fr: 'Sèche‑cheveux', en: 'Hair dryer' }, quantity: 1, condition: 'worn' },
  { id: 'inv-12', room: { fr: 'Buanderie', en: 'Laundry area' }, name: { fr: 'Lave‑linge', en: 'Washing machine' }, quantity: 1, condition: 'good' },
];

export const inspections: InspectionReport[] = [
  { id: 'insp-in', kind: 'move_in', date: stay.moveIn, signedBy: 'Léa Martin · Chez Toi BH', photoCount: 48 },
];

export const gourmetSpace: GourmetSpace | null = {
  name: { fr: 'Espace gourmet (toit)', en: 'Gourmet space (rooftop)' },
  capacity: 20,
  openFrom: '10:00',
  openUntil: '22:00',
  rules: {
    fr: 'Réservation par appartement, 4 heures maximum. Rendre l’espace propre ; le syndic retient la caution en cas de dégâts.',
    en: 'One booking per apartment, 4 hours max. Leave it clean; the building keeps the deposit if anything is damaged.',
  },
};

export function demoChores(today: Date): Chore[] {
  const start = mondayOf(addDays(today, -21));
  const order = [ME, 'r-hugo', 'r-chloe'];
  return [
    { id: 'ch-trash', emoji: '🗑️', name: { fr: 'Sortir les poubelles', en: 'Take the trash out' }, rotation: order, startWeek: start },
    { id: 'ch-dishes', emoji: '🍽️', name: { fr: 'Vaisselle commune', en: 'Shared dishes' }, rotation: ['r-hugo', 'r-chloe', ME], startWeek: start },
    { id: 'ch-shopping', emoji: '🛒', name: { fr: 'Courses de la maison', en: 'House shopping' }, rotation: ['r-chloe', ME, 'r-hugo'], startWeek: start },
  ];
}

export const chores = demoChores(new Date());

/* ---------- Initial state of what the student writes (persisted on the device) ---------- */

export function initialRequests(today: Date): AnyRequest[] {
  const at = (d: Date, h = 10) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toISOString();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 12);
  const nextWeek = addDays(today, 6);
  const twoDaysAgo = addDays(today, -2);
  return [
    {
      id: 'req-demo-laundry',
      kind: 'service',
      residentId: ME,
      serviceId: 'svc-laundry',
      date: isoDate(lastMonth),
      time: '09:00',
      quantity: 2,
      unitPriceBrl: 45,
      createdAt: at(addDays(lastMonth, -2)),
      status: 'done',
      rating: 5,
      events: [
        { at: at(addDays(lastMonth, -2)), status: 'received', by: 'resident' },
        { at: at(addDays(lastMonth, -2), 14), status: 'scheduled', by: 'team' },
        { at: at(addDays(lastMonth, 2), 17), status: 'done', by: 'team' },
      ],
    },
    {
      id: 'req-demo-cleaning',
      kind: 'service',
      residentId: ME,
      serviceId: 'svc-cleaning',
      date: isoDate(nextWeek),
      time: '14:00',
      quantity: 1,
      unitPriceBrl: 120,
      createdAt: at(twoDaysAgo),
      status: 'scheduled',
      note: 'Avant la visite de mes parents',
      events: [
        { at: at(twoDaysAgo), status: 'received', by: 'resident' },
        { at: at(twoDaysAgo, 15), status: 'scheduled', by: 'team', note: 'Confirmé avec Dona Cida' },
      ],
    },
    {
      id: 'req-demo-shower',
      kind: 'maintenance',
      residentId: ME,
      room: 'Salle de bain',
      category: 'plumbing',
      urgency: 'normal',
      description: 'La douche reste tiède même au maximum.',
      photoUris: [],
      createdAt: at(twoDaysAgo, 8),
      status: 'in_progress',
      events: [
        { at: at(twoDaysAgo, 8), status: 'received', by: 'resident' },
        { at: at(twoDaysAgo, 11), status: 'scheduled', by: 'team', note: 'Plombier passe demain matin' },
        { at: at(addDays(today, -1), 9), status: 'in_progress', by: 'team', note: 'Pièce commandée' },
      ],
    },
  ];
}

/** Months already paid when the demo starts: every rent before the current month. */
export function initialPayments(today: Date): Record<string, string> {
  const paid: Record<string, string> = {};
  for (let m = monthOf(stay.moveIn); m < monthOf(isoDate(today)); m = addMonths(m, 1)) {
    paid[m] = `${m}-0${Math.min(stay.rentDueDay, 9)}`;
  }
  return paid;
}

export function initialDocuments(today: Date): ResidentDocument[] {
  return [
    { id: 'doc-passport', type: 'passport', number: '22AB•••••', expiresAt: '2031-04-12', status: 'validated', fileName: 'passeport.pdf' },
    { id: 'doc-visa', type: 'visa', number: 'VITEM IV', expiresAt: stay.moveOut, status: 'validated', fileName: 'visa.pdf' },
    { id: 'doc-rnm', type: 'rnm', status: 'sent', fileName: 'protocole-rnm.pdf' },
    { id: 'doc-cpf', type: 'cpf', status: 'missing' },
    { id: 'doc-insurance', type: 'insurance', expiresAt: isoDate(addDays(today, 25)), status: 'validated', fileName: 'assurance.pdf' },
    { id: 'doc-enrollment', type: 'enrollment', status: 'validated', fileName: 'certificat-skema.pdf' },
  ];
}

export function initialExpenses(today: Date): Expense[] {
  const at = (d: Date) => d.toISOString();
  const d1 = addDays(today, -9);
  const d2 = addDays(today, -5);
  const d3 = addDays(today, -1);
  return [
    {
      id: 'exp-demo-1', title: 'Supermercado Verdemar', category: 'groceries', amountBrl: 186.9, paidBy: 'r-hugo', date: isoDate(d1), createdAt: at(d1),
      split: [{ residentId: ME, amountBrl: 62.3 }, { residentId: 'r-hugo', amountBrl: 62.3 }, { residentId: 'r-chloe', amountBrl: 62.3 }],
    },
    {
      id: 'exp-demo-2', title: 'Gás de cozinha', category: 'utilities', amountBrl: 120, paidBy: ME, date: isoDate(d2), createdAt: at(d2),
      split: [{ residentId: ME, amountBrl: 40 }, { residentId: 'r-hugo', amountBrl: 40 }, { residentId: 'r-chloe', amountBrl: 40 }],
    },
    {
      id: 'exp-demo-3', title: 'Pizza de sexta', category: 'outing', amountBrl: 96, paidBy: 'r-chloe', date: isoDate(d3), createdAt: at(d3),
      split: [{ residentId: ME, amountBrl: 48 }, { residentId: 'r-chloe', amountBrl: 48 }],
    },
  ];
}

export const initialReminderPrefs: ReminderPrefs = {
  rent: true,
  cleaning: true,
  requests: true,
  checkout: true,
  documents: true,
  chores: false,
};

export const initialCalendarSync: CalendarSync = {
  enabled: false,
  topics: { rent: true, cleaning: true, requests: true, checkout: true, chores: false },
  eventIds: {},
};

export function initialNotices(today: Date): Notice[] {
  return [
    {
      id: 'notice-welcome',
      at: addDays(today, -3).toISOString(),
      title: { fr: 'Coupure d’eau jeudi', en: 'Water cut on Thursday' },
      body: {
        fr: 'Le syndic coupe l’eau jeudi de 9 h à 12 h pour l’entretien de la citerne.',
        en: 'The building cuts the water on Thursday from 9 am to noon for tank maintenance.',
      },
      read: false,
    },
  ];
}

export { addDays, isoDate };
