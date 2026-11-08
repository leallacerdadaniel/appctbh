import type { Localized } from '@/lib/mock-data';

import { getState, newId, setState } from './index';
import { ME, serviceCatalog } from './seed';
import type {
  AnyRequest,
  CalendarSync,
  ChoreCompletion,
  DocumentType,
  Expense,
  GourmetBooking,
  ID,
  IsoDate,
  MaintenanceTicket,
  Notice,
  PersonalReminder,
  ReminderPrefs,
  RequestStatus,
  ServiceRequest,
  StayChangeRequest,
} from './types';

/**
 * Everything the student can change. Each action is async on purpose: in wave 2 the body
 * becomes a Supabase call and the screens already await it.
 *
 * DEMO ONLY: `simulateTeam` plays the Chez Toi team answering a few seconds later, so the
 * timeline, the bell and the reminders can be tried without the panel. It is removed when the
 * panel writes the real status.
 */

const DEMO_TEAM = true;
const nowIso = () => new Date().toISOString();
const latency = () => new Promise((r) => setTimeout(r, 350));

function pushNotice(title: Localized, body: Localized, href?: string) {
  const notice: Notice = { id: newId('notice'), at: nowIso(), title, body, href, read: false };
  setState((s) => ({ notices: [notice, ...s.notices] }));
}

function updateRequest(id: ID, patch: (r: AnyRequest) => Partial<AnyRequest>) {
  setState((s) => ({
    requests: s.requests.map((r) => (r.id === id ? ({ ...r, ...patch(r) } as AnyRequest) : r)),
  }));
}

function setStatus(id: ID, status: RequestStatus, by: 'resident' | 'team', note?: string) {
  updateRequest(id, (r) => ({ status, events: [...r.events, { at: nowIso(), status, by, note }] }));
}

const TEAM_REPLY: Record<AnyRequest['kind'], Localized> = {
  service: { fr: 'Confirmé par l’équipe Chez Toi', en: 'Confirmed by the Chez Toi team' },
  maintenance: { fr: 'Un technicien passe sous 48 h', en: 'A technician will come within 48 h' },
  late_checkout: { fr: 'Accepté par l’équipe', en: 'Accepted by the team' },
  early_checkin: { fr: 'Accepté par l’équipe', en: 'Accepted by the team' },
  gourmet: { fr: 'Réservation confirmée avec le syndic', en: 'Booking confirmed with the building' },
};

function simulateTeam(id: ID) {
  if (!DEMO_TEAM) return;
  setTimeout(() => {
    const r = getState().requests.find((x) => x.id === id);
    if (!r || r.status !== 'received') return;
    const reply = TEAM_REPLY[r.kind];
    // Stored in French like the team writes in the panel; the timeline shows the status label anyway.
    setStatus(id, 'scheduled', 'team', reply.fr);
    pushNotice(
      { fr: 'Demande confirmée', en: 'Request confirmed' },
      reply,
      `/requests/${id}`,
    );
  }, 4000);
}

function base(kind: AnyRequest['kind'], note?: string) {
  const at = nowIso();
  return {
    id: newId(kind),
    residentId: ME,
    createdAt: at,
    status: 'received' as const,
    events: [{ at, status: 'received' as const, by: 'resident' as const }],
    note: note?.trim() || undefined,
  };
}

/* ---------- Requests ---------- */

export async function requestService(input: {
  serviceId: ID;
  date: IsoDate;
  time: string;
  quantity: number;
  note?: string;
}): Promise<ServiceRequest> {
  await latency();
  const svc = serviceCatalog.find((s) => s.id === input.serviceId);
  if (!svc) throw new Error('unknown service');
  const req: ServiceRequest = {
    ...base('service', input.note),
    kind: 'service',
    serviceId: svc.id,
    date: input.date,
    time: input.time,
    quantity: svc.allowsQuantity ? Math.max(1, input.quantity) : 1,
    unitPriceBrl: svc.priceBrl,
  };
  setState((s) => ({ requests: [req, ...s.requests] }));
  simulateTeam(req.id);
  return req;
}

export async function reportMaintenance(
  input: Pick<MaintenanceTicket, 'room' | 'category' | 'urgency' | 'description' | 'photoUris'>,
): Promise<MaintenanceTicket> {
  await latency();
  const req: MaintenanceTicket = { ...base('maintenance'), kind: 'maintenance', ...input };
  setState((s) => ({ requests: [req, ...s.requests] }));
  simulateTeam(req.id);
  return req;
}

export async function requestStayChange(input: {
  kind: 'late_checkout' | 'early_checkin';
  date: IsoDate;
  time: string;
  note?: string;
}): Promise<StayChangeRequest> {
  await latency();
  const req: StayChangeRequest = { ...base(input.kind, input.note), kind: input.kind, date: input.date, time: input.time };
  setState((s) => ({ requests: [req, ...s.requests] }));
  simulateTeam(req.id);
  return req;
}

export async function bookGourmet(input: {
  date: IsoDate;
  startTime: string;
  endTime: string;
  guests: number;
  note?: string;
}): Promise<GourmetBooking> {
  await latency();
  const req: GourmetBooking = { ...base('gourmet', input.note), kind: 'gourmet', ...input };
  setState((s) => ({ requests: [req, ...s.requests] }));
  simulateTeam(req.id);
  return req;
}

export async function cancelRequest(id: ID) {
  await latency();
  setStatus(id, 'cancelled', 'resident');
}

export async function rateRequest(id: ID, rating: number, comment?: string) {
  await latency();
  updateRequest(id, () => ({ rating, ratingComment: comment?.trim() || undefined }));
}

/* ---------- Documents ---------- */

export async function attachDocument(type: DocumentType, file: { name: string; uri: string }) {
  await latency();
  setState((s) => ({
    documents: s.documents.map((d) =>
      d.type === type ? { ...d, status: 'sent', fileName: file.name, fileUri: file.uri } : d,
    ),
  }));
}

/* ---------- Chores ---------- */

export async function swapChore(choreId: ID, weekStart: IsoDate, residentId: ID) {
  await latency();
  setState((s) => ({
    choreSwaps: [
      ...s.choreSwaps.filter((w) => !(w.choreId === choreId && w.weekStart === weekStart)),
      { id: newId('swap'), choreId, weekStart, residentId },
    ],
  }));
}

export async function toggleChoreDone(choreId: ID, weekStart: IsoDate) {
  await latency();
  setState((s) => {
    const done = s.choreCompletions.some((c) => c.choreId === choreId && c.weekStart === weekStart);
    const next: ChoreCompletion[] = done
      ? s.choreCompletions.filter((c) => !(c.choreId === choreId && c.weekStart === weekStart))
      : [...s.choreCompletions, { choreId, weekStart, doneAt: nowIso() }];
    return { choreCompletions: next };
  });
}

/* ---------- Expenses ---------- */

export async function addExpense(input: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  await latency();
  const expense: Expense = { ...input, id: newId('exp'), createdAt: nowIso() };
  setState((s) => ({ expenses: [expense, ...s.expenses] }));
  return expense;
}

export async function deleteExpense(id: ID) {
  await latency();
  setState((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
}

export async function settleUp(from: ID, to: ID, amountBrl: number, date: IsoDate) {
  await latency();
  setState((s) => ({ settlements: [...s.settlements, { id: newId('settle'), from, to, amountBrl, date }] }));
}

/* ---------- Reminders, calendar, notices ---------- */

export function setReminderPrefs(patch: Partial<ReminderPrefs>) {
  setState((s) => ({ reminderPrefs: { ...s.reminderPrefs, ...patch } }));
}

export function setCalendarSync(patch: Partial<CalendarSync>) {
  setState((s) => ({ calendarSync: { ...s.calendarSync, ...patch } }));
}

export function setPersonalReminders(list: PersonalReminder[]) {
  setState(() => ({ personalReminders: list }));
}

export function markNoticesRead() {
  setState((s) => ({ notices: s.notices.map((n) => (n.read ? n : { ...n, read: true })) }));
}

export { pushNotice };
