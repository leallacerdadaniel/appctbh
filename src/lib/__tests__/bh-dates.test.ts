import { addDays, bhDay, bhTime, todayBh } from '@/lib/bh-events';
import { formatDate, formatDayDate, formatShortDate, formatTime } from '@/lib/format';
import { bhStamp, plusDays, todayInBH } from '@/lib/house-social';

/**
 * "Today" is always today in Belo Horizonte (UTC−3 all year), not the phone's day: a student who has just
 * landed, or one whose phone stays on Paris time, must see the same cleaning, visit and event dates as the team.
 * `npm test` runs everything twice, as a phone on Paris time and as a phone on Belo Horizonte time.
 */
const zone = process.env.TZ;
const pad = (n: number) => String(n).padStart(2, '0');
const phoneDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// 23:30 on 10 November in BH: already 02:30 on the 11th in UTC and 03:30 on the 11th in Paris.
const LATE_EVENING = Date.parse('2026-11-11T02:30:00Z');

describe('the phone of this run', () => {
  (zone ? it : it.skip)('is on the time zone that npm test asked for', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
  });

  (zone === 'Europe/Paris' ? it : it.skip)('on Paris time, the phone itself is already on the next day', () => {
    expect(phoneDay(LATE_EVENING)).toBe('2026-11-11');
  });
});

describe('today in Belo Horizonte', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is still the 10th at 23:30 in BH, whatever day the phone shows', () => {
    expect(todayInBH(LATE_EVENING)).toBe('2026-11-10');
  });

  it('changes at midnight in BH (03:00 UTC), not at midnight UTC or Paris', () => {
    expect(todayInBH(Date.parse('2026-11-10T23:30:00Z'))).toBe('2026-11-10'); // 00:30 on the 11th in Paris
    expect(todayInBH(Date.parse('2026-11-11T00:30:00Z'))).toBe('2026-11-10'); // the 11th in UTC
    expect(todayInBH(Date.parse('2026-11-11T02:59:59Z'))).toBe('2026-11-10');
    expect(todayInBH(Date.parse('2026-11-11T03:00:00Z'))).toBe('2026-11-11');
  });

  it('reads the clock the same way when no time is given', () => {
    jest.useFakeTimers({ now: LATE_EVENING });
    expect(todayInBH()).toBe('2026-11-10');
    expect(todayBh()).toBe('2026-11-10');
  });

  it('crosses the year in BH three hours after UTC', () => {
    expect(todayInBH(Date.parse('2027-01-01T01:00:00Z'))).toBe('2026-12-31');
  });
});

describe('a timestamp from the database, as a BH day and time', () => {
  it('gives the BH day and time of an evening event', () => {
    expect(bhDay('2026-11-21T23:30:00Z')).toBe('2026-11-21');
    expect(bhTime('2026-11-21T23:30:00Z')).toBe('20:30');
  });

  it('keeps a late show on its BH day when UTC is already tomorrow', () => {
    expect(bhDay('2026-11-22T01:00:00Z')).toBe('2026-11-21');
    expect(bhTime('2026-11-22T01:00:00Z')).toBe('22:00');
  });

  it('writes the stamp of a package or a visit in the reader’s language', () => {
    expect(bhStamp('2026-11-08T17:00:00Z', 'fr')).toBe('8 nov. · 14h00');
    expect(bhStamp('2026-11-08T17:00:00Z', 'en')).toBe('Nov 8 · 2:00 PM');
    expect(bhStamp('2026-11-09T01:30:00Z', 'fr')).toBe('8 nov. · 22h30');
  });
});

describe('adding days to a YYYY-MM-DD', () => {
  it('crosses months, years and 29 February', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(plusDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(plusDays('2026-11-10', 6)).toBe('2026-11-16');
  });

  it('does not lose or repeat a day when Paris changes its clocks', () => {
    // Europe: clocks forward on 28 March 2027 and back on 31 October 2027.
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28');
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29');
    expect(plusDays('2027-10-30', 1)).toBe('2027-10-31');
    expect(plusDays('2027-10-31', 1)).toBe('2027-11-01');
  });
});

describe('showing a date and a time', () => {
  it('writes the day that was given, on any phone', () => {
    expect(formatDate('2027-01-20', 'fr')).toBe('20/01/2027');
    expect(formatDate('2027-01-20', 'en')).toBe('Jan 20, 2027');
    expect(formatShortDate('2027-02-05', 'fr')).toBe('05/02');
    expect(formatShortDate('2027-02-05', 'en')).toBe('Feb 5');
    expect(formatDayDate('2026-11-15', 'fr')).toBe('dim. 15 nov.');
    expect(formatDayDate('2026-11-15', 'en')).toBe('Sun, Nov 15');
  });

  it('writes the time the French and the English way', () => {
    expect(formatTime('09:45', 'fr')).toBe('9h45');
    expect(formatTime('19:00', 'fr')).toBe('19h00');
    expect(formatTime('19:00', 'en')).toBe('7:00 PM');
    expect(formatTime('00:05', 'en')).toBe('12:05 AM');
    expect(formatTime('12:00', 'en')).toBe('12:00 PM');
  });
});
