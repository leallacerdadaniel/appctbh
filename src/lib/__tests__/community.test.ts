import { strings } from '@/i18n/strings';
import { AppApiError } from '@/lib/app-api';
import { communityError, initialsOf, tripDates, tripLength } from '@/lib/community';

describe('group trips: dates', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse('2026-11-10T15:00:00Z') });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts both ends: a day trip is 1 day, Friday to Sunday is 3', () => {
    expect(tripLength('2026-11-15', '2026-11-15')).toBe(1);
    expect(tripLength('2026-11-13', '2026-11-15')).toBe(3);
  });

  it('counts across a month, a year and the weekend Paris changes its clocks', () => {
    expect(tripLength('2026-11-28', '2026-12-02')).toBe(5);
    expect(tripLength('2026-12-30', '2027-01-02')).toBe(4);
    expect(tripLength('2027-03-27', '2027-03-29')).toBe(3);
  });

  it('writes a day trip with its weekday and a longer one as a range', () => {
    expect(tripDates('2026-11-15', '2026-11-15', 'fr')).toBe('dim. 15 nov.');
    expect(tripDates('2026-11-15', '2026-11-15', 'en')).toBe('Sun, Nov 15');
    expect(tripDates('2026-11-13', '2026-11-15', 'fr')).toBe('13/11 – 15/11');
    expect(tripDates('2026-11-13', '2026-11-15', 'en')).toBe('Nov 13 – Nov 15');
  });

  it('adds the year to a day trip that is not this year', () => {
    expect(tripDates('2027-01-09', '2027-01-09', 'fr')).toBe('sam. 9 janv. 2027');
  });
});

describe('initials on an avatar', () => {
  it('takes the first two names, without dots or stray spaces', () => {
    expect(initialsOf('Léa Martin')).toBe('LM');
    expect(initialsOf('  jean  pierre dupont ')).toBe('JP');
    expect(initialsOf('Hugo')).toBe('H');
    expect(initialsOf('Chloé B.')).toBe('CB');
    expect(initialsOf('')).toBe('');
  });
});

describe('the message for an error of the community', () => {
  const t = strings.fr;

  it('explains the no-links rule instead of a generic error', () => {
    expect(communityError(new AppApiError('links'), t)).toBe(t.common.noLinks);
  });

  it('uses the community’s own text when it has one, the generic one otherwise', () => {
    expect(communityError(new AppApiError('full'), t)).toBe(t.community.errors.full);
    expect(communityError(new AppApiError('tooSoon'), t)).toBe(t.community.errors.server);
    expect(communityError(new Error('boom'), t)).toBe(t.community.errors.server);
  });
});
