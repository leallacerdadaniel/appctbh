import { groupByDay, isThisWeekend, lastDay, thisWeek, weekendRange, type BhEvent } from '@/lib/bh-events';

/** An event of the BH agenda; times are written in BH and stored in UTC (+3 h), as the server sends them. */
function event(id: string, startBh: string, more: Partial<BhEvent> & { endBh?: string } = {}): BhEvent {
  const utc = (bh: string) => new Date(Date.parse(`${bh}:00Z`) + 3 * 3_600_000).toISOString();
  const { endBh, ...rest } = more;
  return {
    id,
    title: id,
    venue: null,
    neighborhood: null,
    startsAt: utc(startBh),
    endsAt: endBh ? utc(endBh) : null,
    timeKnown: true,
    url: null,
    imageUrl: 'https://img.test/photo.jpg',
    category: 'show',
    priceMin: null,
    priceMax: null,
    isFree: null,
    source: 'link',
    sourceName: 'Sympla',
    ...rest,
  };
}

const ids = (events: BhEvent[]) => events.map((e) => e.id);
const TUESDAY = '2026-11-10';

describe('thisWeek: the order of the carousel', () => {
  // As the hook delivers them: by start time.
  const exhibition = event('exhibition', '2026-11-01T10:00', { endBh: '2026-11-30T18:00', category: 'exhibition' });
  const seasonNoPhoto = event('season-no-photo', '2026-11-05T20:00', { endBh: '2026-11-20T22:00', imageUrl: null });
  const tonightNoPhoto = event('tonight-no-photo', '2026-11-10T21:00', { imageUrl: null });
  const thursday = event('thursday', '2026-11-12T20:00');
  const nextMonday = event('next-monday', '2026-11-16T19:00');
  const inAWeek = event('in-a-week', '2026-11-17T19:00');
  const all = [exhibition, seasonNoPhoto, tonightNoPhoto, thursday, nextMonday, inAWeek];

  it('shows what starts within 7 days by date, then what is already on, and the ones without a photo last', () => {
    expect(ids(thisWeek(all, undefined, TUESDAY))).toEqual([
      'thursday',
      'next-monday',
      'exhibition',
      'tonight-no-photo',
      'season-no-photo',
    ]);
  });

  it('leaves out what starts in 7 days or more', () => {
    expect(ids(thisWeek(all, undefined, TUESDAY))).not.toContain('in-a-week');
    expect(ids(thisWeek(all, undefined, '2026-11-11'))).toContain('in-a-week');
  });

  it('keeps only the chosen category', () => {
    expect(ids(thisWeek(all, 'exhibition', TUESDAY))).toEqual(['exhibition']);
    expect(thisWeek(all, 'party', TUESDAY)).toEqual([]);
  });

  it('counts a 22:00 show as tonight in BH, although its UTC date is tomorrow', () => {
    const late = event('late', '2026-11-10T22:00');
    expect(late.startsAt).toBe('2026-11-11T01:00:00.000Z');
    expect(ids(thisWeek([late], undefined, TUESDAY))).toEqual(['late']);
    // The day after, it started yesterday: it has no end, so it is listed with what is "already on".
    expect(ids(groupByDay([late], '2026-11-11').ongoing)).toEqual(['late']);
  });
});

describe('the weekend', () => {
  it('is the coming Friday to Sunday from Monday to Thursday', () => {
    expect(weekendRange('2026-11-09')).toEqual({ from: '2026-11-13', to: '2026-11-15' });
    expect(weekendRange(TUESDAY)).toEqual({ from: '2026-11-13', to: '2026-11-15' });
  });

  it('starts today once the weekend has begun', () => {
    expect(weekendRange('2026-11-13')).toEqual({ from: '2026-11-13', to: '2026-11-15' });
    expect(weekendRange('2026-11-14')).toEqual({ from: '2026-11-14', to: '2026-11-15' });
    expect(weekendRange('2026-11-15')).toEqual({ from: '2026-11-15', to: '2026-11-15' });
  });

  it('includes an exhibition still on and a Saturday party, not next Monday’s show', () => {
    expect(isThisWeekend(event('exhibition', '2026-11-01T10:00', { endBh: '2026-11-30T18:00' }), TUESDAY)).toBe(true);
    expect(isThisWeekend(event('party', '2026-11-14T23:00', { endBh: '2026-11-15T05:00' }), TUESDAY)).toBe(true);
    expect(isThisWeekend(event('monday', '2026-11-16T19:00'), TUESDAY)).toBe(false);
    expect(isThisWeekend(event('ended', '2026-11-01T10:00', { endBh: '2026-11-12T18:00' }), TUESDAY)).toBe(false);
  });
});

describe('lastDay', () => {
  it('is the start day when there is no end', () => {
    expect(lastDay(event('show', '2026-11-13T20:00'))).toBe('2026-11-13');
  });

  it('keeps a night out on the day it starts (22h to 5h is Friday, not Friday to Saturday)', () => {
    expect(lastDay(event('party', '2026-11-13T22:00', { endBh: '2026-11-14T05:00' }))).toBe('2026-11-13');
  });

  it('is the end day of a festival of several days', () => {
    expect(lastDay(event('festival', '2026-11-13T18:00', { endBh: '2026-11-15T23:00' }))).toBe('2026-11-15');
    // Until the next afternoon is two days, not a night out.
    expect(lastDay(event('long', '2026-11-13T22:00', { endBh: '2026-11-14T15:00' }))).toBe('2026-11-14');
  });
});

describe('groupByDay: the full agenda page', () => {
  it('groups by BH day in order, each day by time, and sets apart what is already on', () => {
    const { groups, ongoing } = groupByDay(
      [
        event('thu-late', '2026-11-12T22:00'),
        event('exhibition', '2026-11-01T10:00', { endBh: '2026-11-30T18:00' }),
        event('tue', '2026-11-10T19:00'),
        event('thu-early', '2026-11-12T18:00'),
        event('season', '2026-11-05T20:00', { endBh: '2026-11-20T22:00' }),
      ],
      TUESDAY,
    );
    expect(groups.map((g) => [g.day, ids(g.events)])).toEqual([
      ['2026-11-10', ['tue']],
      ['2026-11-12', ['thu-early', 'thu-late']],
    ]);
    // What ends first comes first.
    expect(ids(ongoing)).toEqual(['season', 'exhibition']);
  });
});
