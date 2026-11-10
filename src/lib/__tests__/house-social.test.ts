import { strings } from '@/i18n/strings';
import { instagramHandle, portariaMessage, relativeDay, splitVisits, visitWhen, type Visitor } from '@/lib/house-social';

const TODAY = '2026-11-10'; // a Tuesday
const lea = { firstName: 'Léa', fullName: 'Léa Martin', unit: '802', apartmentName: 'Savassi 802' };
const visit = (date: string, time: string | null = null) => ({ name: ' João Silva ', date, time });

/** The doorman reads Portuguese only, and lets nobody up on a wrong day: this text has to be right. */
describe('the message for the portaria', () => {
  it('names the student, the apartment, the visitor, the day and the time', () => {
    expect(portariaMessage({ visitor: visit('2026-11-14', '20:00'), ...lea, toTeam: false, today: TODAY })).toBe(
      'Olá! Sou Léa, do apartamento 802. Vou receber a visita de João Silva no sábado, 14/11, por volta das 20h.',
    );
  });

  it('says hoje and amanhã, and "na" before a weekday', () => {
    const when = (date: string, time: string | null = null) =>
      portariaMessage({ visitor: visit(date, time), ...lea, toTeam: false, today: TODAY }).split('João Silva ')[1];
    expect(when('2026-11-10')).toBe('hoje, 10/11.');
    expect(when('2026-11-11')).toBe('amanhã, 11/11.');
    expect(when('2026-11-16')).toBe('na segunda-feira, 16/11.');
    expect(when('2026-11-15')).toBe('no domingo, 15/11.');
  });

  it('writes the time as a Brazilian would', () => {
    const at = (time: string) =>
      portariaMessage({ visitor: visit('2026-11-14', time), ...lea, toTeam: false, today: TODAY }).split('14/11, ')[1];
    expect(at('20:30')).toBe('por volta das 20h30.');
    expect(at('01:00')).toBe('por volta da 1h.');
    expect(at('12:00')).toBe('por volta do meio-dia.');
    expect(at('00:00')).toBe('por volta da meia-noite.');
  });

  it('gives the team the full name and the building, and asks them to tell the portaria', () => {
    expect(portariaMessage({ visitor: visit('2026-11-10'), ...lea, toTeam: true, today: TODAY })).toBe(
      'Olá! Sou Léa Martin, do apartamento 802 (Savassi 802). Vou receber a visita de João Silva hoje, 10/11. Vocês podem avisar a portaria, por favor?',
    );
  });
});

describe('visits on the page', () => {
  const v = (id: string, date: string): Visitor => ({ id, name: id, date, time: null, note: null, notifiedAt: null });

  it('keeps today in "upcoming" and shows the latest past visit first', () => {
    const { upcoming, past } = splitVisits([v('a', '2026-11-01'), v('b', '2026-11-09'), v('c', TODAY), v('d', '2026-11-12')], TODAY);
    expect(upcoming.map((x) => x.id)).toEqual(['c', 'd']);
    expect(past.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('says today, tomorrow, the weekday this week, then the date', () => {
    const t = strings.fr;
    expect(relativeDay(TODAY, t, 'fr', TODAY)).toBe(t.houseSocial.today);
    expect(relativeDay('2026-11-11', t, 'fr', TODAY)).toBe(t.houseSocial.tomorrow);
    expect(relativeDay('2026-11-14', t, 'fr', TODAY)).toBe('samedi');
    expect(relativeDay('2026-11-21', t, 'fr', TODAY)).toBe('sam. 21 nov.');
    expect(relativeDay('2026-11-21', strings.en, 'en', TODAY)).toBe('Sat, Nov 21');
  });

  it('adds the time in the reader’s language', () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-10T15:00:00Z') });
    expect(visitWhen({ date: '2026-11-15', time: '20:00' }, strings.fr, 'fr', TODAY)).toBe('Dim. 15 nov. · 20h00');
    expect(visitWhen({ date: '2026-11-15', time: '20:00' }, strings.en, 'en', TODAY)).toBe('Sun, Nov 15 · 8:00 PM');
    expect(visitWhen({ date: TODAY, time: null }, strings.fr, 'fr', TODAY)).toBe(strings.fr.requests.today);
    jest.useRealTimers();
  });
});

describe('the Instagram name on a profile (a name, never a link)', () => {
  it('keeps only the name', () => {
    expect(instagramHandle('@lea.m')).toBe('lea.m');
    expect(instagramHandle('lea_m')).toBe('lea_m');
    expect(instagramHandle('https://www.instagram.com/lea.m/?hl=fr')).toBe('lea.m');
    expect(instagramHandle('instagram.com/lea.m')).toBe('lea.m');
  });

  it('is empty for nothing and refused when it is not a name', () => {
    expect(instagramHandle('   ')).toBeNull();
    expect(instagramHandle('léa martin')).toBeUndefined();
    expect(instagramHandle('https://exemple.com/lea')).toBeUndefined();
  });
});
