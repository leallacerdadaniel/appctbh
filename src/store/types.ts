import type { Localized } from '@/lib/mock-data';

/**
 * Domain model shared by the app and (from wave 2 on) the Chez Toi Supabase.
 * Every type here is shaped like the table it will become: ids are strings, dates are
 * ISO strings, money is a number of reais. Screens never read seed data directly — they go
 * through `useStore` + actions, so swapping the local store for Supabase does not touch them.
 */

export type ID = string;
/** YYYY-MM-DD */
export type IsoDate = string;
/** Full ISO timestamp. */
export type IsoDateTime = string;
/** YYYY-MM */
export type Month = string;
/** HH:MM, 24h */
export type HourMinute = string;

/* ---------- People and the stay (read-only in the app, written by the panel) ---------- */

export type Resident = {
  id: ID;
  firstName: string;
  fullName: string;
  initials: string;
  email: string;
  /** Digits only, with country code (for wa.me / Pix between roommates). */
  phone?: string;
  /** Pix key used when a roommate pays them back. */
  pixKey?: string;
  room?: string;
};

export type Stay = {
  id: ID;
  residentId: ID;
  apartmentId: ID;
  semester: string;
  moveIn: IsoDate;
  moveOut: IsoDate;
  checkInTime: HourMinute;
  checkOutTime: HourMinute;
  monthlyRentBrl: number;
  depositBrl: number;
  /** Rent is due on this day of each month. */
  rentDueDay: number;
};

/** Where the student pays Chez Toi. */
export type PaymentInfo = {
  beneficiary: string;
  cnpj: string;
  pixKey: string;
  pixKeyType: 'cnpj' | 'email' | 'phone' | 'random';
  bank: string;
  agency: string;
  account: string;
};

export type HouseRule = {
  id: ID;
  scope: 'apartment' | 'building';
  emoji: string;
  title: Localized;
  body: Localized;
};

export type InventoryCondition = 'new' | 'good' | 'worn' | 'damaged';

export type InventoryItem = {
  id: ID;
  room: Localized;
  name: Localized;
  quantity: number;
  condition: InventoryCondition;
};

/** Signed check-in / check-out report (PDF lives in a private bucket later). */
export type InspectionReport = {
  id: ID;
  kind: 'move_in' | 'move_out';
  date: IsoDate;
  signedBy: string;
  photoCount: number;
};

export type GourmetSpace = {
  name: Localized;
  capacity: number;
  openFrom: HourMinute;
  openUntil: HourMinute;
  rules: Localized;
};

/* ---------- Extra services (catalog edited in the panel) ---------- */

export type ServiceCategory = 'cleaning' | 'laundry' | 'chef' | 'transfer';

export type ServiceItem = {
  id: ID;
  category: ServiceCategory;
  emoji: string;
  name: Localized;
  description: Localized;
  priceBrl: number;
  /** What the price is for ("par sac", "per trip"). */
  unit: Localized;
  /** Minimum notice before the requested time. */
  leadTimeHours: number;
  /** Whether quantity makes sense (laundry bags, chef guests). */
  allowsQuantity: boolean;
};

/* ---------- Requests: one shape for everything the student asks the team ---------- */

export type RequestStatus = 'received' | 'scheduled' | 'in_progress' | 'done' | 'cancelled' | 'declined';

export type RequestEvent = {
  at: IsoDateTime;
  status: RequestStatus;
  by: 'resident' | 'team';
  note?: string;
};

type RequestBase = {
  id: ID;
  residentId: ID;
  createdAt: IsoDateTime;
  status: RequestStatus;
  events: RequestEvent[];
  note?: string;
  /** 1–5, given by the student once the request is done. */
  rating?: number;
  ratingComment?: string;
};

export type ServiceRequest = RequestBase & {
  kind: 'service';
  serviceId: ID;
  date: IsoDate;
  time: HourMinute;
  quantity: number;
  /** Frozen at request time: catalog price changes do not change past requests. */
  unitPriceBrl: number;
};

export type MaintenanceUrgency = 'low' | 'normal' | 'urgent';

export type MaintenanceTicket = RequestBase & {
  kind: 'maintenance';
  room: string;
  category: 'plumbing' | 'electrical' | 'appliance' | 'furniture' | 'internet' | 'other';
  urgency: MaintenanceUrgency;
  description: string;
  /** Local URIs for now; bucket paths after wave 2. */
  photoUris: string[];
};

export type StayChangeRequest = RequestBase & {
  kind: 'late_checkout' | 'early_checkin';
  date: IsoDate;
  time: HourMinute;
  /** Fee set by the team when they accept, billed with the rent. */
  feeBrl?: number;
};

export type GourmetBooking = RequestBase & {
  kind: 'gourmet';
  date: IsoDate;
  startTime: HourMinute;
  endTime: HourMinute;
  guests: number;
};

export type AnyRequest = ServiceRequest | MaintenanceTicket | StayChangeRequest | GourmetBooking;
export type RequestKind = AnyRequest['kind'];

/* ---------- Money: everything billed with the rent ---------- */

/**
 * Decision of 2026-11-06: extras requested in the app accumulate and are billed together with
 * the rent (Chez Toi advances the cost). A charge belongs to the month it was consumed and is
 * billed on the next rent due date.
 */
export type Charge = {
  id: ID;
  kind: 'rent' | 'service' | 'fee';
  /** Month the charge is billed in (the rent month). */
  billingMonth: Month;
  label: Localized;
  amountBrl: number;
  /** Request that generated it (service or stay change). */
  requestId?: ID;
};

export type InvoiceStatus = 'paid' | 'open' | 'overdue' | 'upcoming';

export type Invoice = {
  month: Month;
  dueDate: IsoDate;
  charges: Charge[];
  totalBrl: number;
  status: InvoiceStatus;
  paidAt?: IsoDate;
};

/* ---------- Documents ---------- */

export type DocumentType = 'passport' | 'visa' | 'rnm' | 'cpf' | 'insurance' | 'enrollment';

export type ResidentDocument = {
  id: ID;
  type: DocumentType;
  number?: string;
  expiresAt?: IsoDate;
  status: 'missing' | 'sent' | 'validated';
  /** Local file picked by the student (uploaded to a private bucket after wave 2). */
  fileName?: string;
  fileUri?: string;
};

/* ---------- House life between roommates ---------- */

export type Chore = {
  id: ID;
  emoji: string;
  name: Localized;
  /** Residents in turn order; week 0 = `startWeek`. */
  rotation: ID[];
  startWeek: IsoDate;
};

/** "This week I take your turn": overrides the rotation for one chore and one week. */
export type ChoreSwap = { id: ID; choreId: ID; weekStart: IsoDate; residentId: ID };

export type ChoreCompletion = { choreId: ID; weekStart: IsoDate; doneAt: IsoDateTime };

export type ExpenseSplit = { residentId: ID; amountBrl: number };

export type Expense = {
  id: ID;
  title: string;
  category: 'groceries' | 'utilities' | 'home' | 'outing' | 'other';
  amountBrl: number;
  paidBy: ID;
  date: IsoDate;
  split: ExpenseSplit[];
  createdAt: IsoDateTime;
};

/** A roommate paying another back (by Pix outside the app). */
export type Settlement = { id: ID; from: ID; to: ID; amountBrl: number; date: IsoDate };

/* ---------- Reminders and calendar ---------- */

export type ReminderTopic = 'rent' | 'cleaning' | 'requests' | 'checkout' | 'documents' | 'chores';

export type ReminderPrefs = Record<ReminderTopic, boolean>;

export type CalendarSync = {
  enabled: boolean;
  /** Topics that go to the phone calendar. */
  topics: Record<'rent' | 'cleaning' | 'requests' | 'checkout' | 'chores', boolean>;
  /** Device calendar created for Chez Toi. */
  calendarId?: string;
  /** Our event key → device event id, to update instead of duplicating. */
  eventIds: Record<string, string>;
  lastSyncAt?: IsoDateTime;
};

export type PersonalReminder = {
  id: ID;
  title: string;
  at: IsoDateTime;
  /** Local notification id. */
  notificationId?: string;
};

/** In-app notice (the bell). Push copies these from wave 9 on. */
export type Notice = {
  id: ID;
  at: IsoDateTime;
  title: Localized;
  body: Localized;
  /** Route to open, e.g. /requests/abc */
  href?: string;
  read: boolean;
};
