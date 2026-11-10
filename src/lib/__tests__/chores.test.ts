import { memberLabel, myChoresThisWeek, weekDate, type ChoresData } from '@/lib/chores';
import { person } from '@/lib/home';

const data: ChoresData = {
  me: 'lea',
  members: [
    { id: 'lea', ...person('Léa Martin') },
    { id: 'hugo', ...person('Hugo Bernard') },
  ],
  chores: [
    { id: 'trash', emoji: '🗑️', name: 'Poubelles', rotation: ['lea', 'hugo'] },
    { id: 'dishes', emoji: '🍽️', name: 'Vaisselle', rotation: ['hugo', 'lea'] },
    { id: 'floor', emoji: '🧹', name: 'Sol', rotation: ['lea', 'hugo'] },
  ],
  weeks: [
    {
      weekStart: '2026-11-09',
      items: [
        { choreId: 'trash', assignee: 'lea', swapped: false, done: true, doneBy: 'lea' },
        { choreId: 'dishes', assignee: 'hugo', swapped: false, done: false, doneBy: null },
        { choreId: 'floor', assignee: 'lea', swapped: true, done: false, doneBy: null },
        // A chore deleted since the week was drawn up.
        { choreId: 'gone', assignee: 'lea', swapped: false, done: false, doneBy: null },
      ],
    },
    { weekStart: '2026-11-16', items: [{ choreId: 'dishes', assignee: 'lea', swapped: false, done: false, doneBy: null }] },
  ],
};

describe('my chores this week', () => {
  it('lists only mine, this week only, still to do first, without deleted chores', () => {
    expect(myChoresThisWeek(data).map((i) => i.choreId)).toEqual(['floor', 'trash']);
  });

  it('is empty before the first week exists', () => {
    expect(myChoresThisWeek({ ...data, weeks: [] })).toEqual([]);
  });
});

describe('who a chore belongs to', () => {
  it('says "Vous" for the student, the first name for a roommate, and a former roommate otherwise', () => {
    expect(memberLabel(data, 'lea', 'Vous', 'Ancien colocataire')).toBe('Vous');
    expect(memberLabel(data, 'hugo', 'Vous', 'Ancien colocataire')).toBe('Hugo');
    expect(memberLabel(data, 'left-in-october', 'Vous', 'Ancien colocataire')).toBe('Ancien colocataire');
    expect(memberLabel(data, null, 'Vous', 'Ancien colocataire')).toBe('Ancien colocataire');
  });
});

describe('the Monday of a week', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is written in full, with the year only when it is not this one', () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-10T15:00:00Z') });
    expect(weekDate('2026-11-09', 'fr')).toBe('9 novembre');
    expect(weekDate('2026-11-09', 'en')).toBe('November 9');
    expect(weekDate('2027-01-04', 'fr')).toBe('4 janvier 2027');
    expect(weekDate('2027-01-04', 'en')).toBe('January 4, 2027');
  });
});
