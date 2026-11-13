import {
  allDebts,
  myBalances,
  netBalances,
  parseCents,
  simplifyDebts,
  splitEqual,
  type Expense,
  type ExpensesData,
  type Settlement,
} from '@/lib/expenses';
import { person } from '@/lib/home';

const sum = (shares: { amountCents: number }[]) => shares.reduce((n, s) => n + s.amountCents, 0);

describe('splitEqual: nobody loses a centavo', () => {
  it('gives the leftover centavos to the first people, so the shares add up to the bill', () => {
    const shares = splitEqual(1000, ['lea', 'hugo', 'chloe']);
    expect(shares.map((s) => s.amountCents)).toEqual([334, 333, 333]);
    expect(sum(shares)).toBe(1000);
  });

  it('adds up for awkward amounts too', () => {
    for (const [amount, people] of [[1, 2], [999, 4], [10001, 3], [5000, 1]] as const) {
      const shares = splitEqual(amount, Array.from({ length: people }, (_, i) => `p${i}`));
      expect(sum(shares)).toBe(amount);
      expect(Math.max(...shares.map((s) => s.amountCents)) - Math.min(...shares.map((s) => s.amountCents))).toBeLessThanOrEqual(1);
    }
  });

  it('gives nothing when nobody is selected', () => {
    expect(splitEqual(1000, [])).toEqual([]);
  });
});

describe('parseCents: the amount as a French, a Brazilian or an English speaker types it', () => {
  it.each([
    ['12,50', 1250],
    ['12.50', 1250],
    ['12', 1200],
    ['12,5', 1250],
    ['12,', 1200],
    ['0,05', 5],
    ['1 200', 120000],
    ['1.200', 120000],
    ['1.200,50', 120050],
    ['1,200.50', 120050],
    ['R$ 1.234,56', 123456],
  ])('%s → %i centavos', (text, cents) => {
    expect(parseCents(text)).toBe(cents);
  });

  it.each(['', '0', '0,00', 'abc', ','])('refuses "%s"', (text) => {
    expect(parseCents(text)).toBeNull();
  });
});

const members = ['lea', 'hugo', 'chloe'].map((id) => ({ id, ...person(id) }));
const expense = (paidBy: string, amountCents: number, currency: 'BRL' | 'EUR' = 'BRL'): Expense => ({
  id: `${paidBy}-${amountCents}-${currency}`,
  description: 'Courses',
  amountCents,
  currency,
  paidBy,
  spentOn: '2026-11-10',
  splitMode: 'equal',
  createdBy: paidBy,
  createdAt: '2026-11-10T15:00:00Z',
  shares: splitEqual(amountCents, ['lea', 'hugo', 'chloe']),
});
const payment = (from: string, to: string, amountCents: number): Settlement => ({
  id: `${from}-${to}`,
  from,
  to,
  amountCents,
  currency: 'BRL',
  paidOn: '2026-11-11',
  createdBy: from,
  createdAt: '2026-11-11T15:00:00Z',
});
const data = (expenses: Expense[], settlements: Settlement[] = []): ExpensesData => ({ me: 'lea', members, expenses, settlements });

describe('balances between roommates', () => {
  it('owes the payer what the others’ shares are worth', () => {
    const net = netBalances(data([expense('lea', 9000)]), 'BRL');
    expect(Object.fromEntries(net)).toEqual({ lea: 6000, hugo: -3000, chloe: -3000 });
  });

  it('always adds up to zero', () => {
    const net = netBalances(data([expense('lea', 1000), expense('hugo', 2501), expense('chloe', 99)]), 'BRL');
    expect([...net.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('clears a debt once it is paid back', () => {
    const net = netBalances(data([expense('lea', 9000)], [payment('hugo', 'lea', 3000)]), 'BRL');
    expect(Object.fromEntries(net)).toEqual({ lea: 3000, hugo: 0, chloe: -3000 });
  });

  it('never mixes reais and euros', () => {
    const d = data([expense('lea', 9000), expense('hugo', 3000, 'EUR')]);
    expect(netBalances(d, 'EUR').get('lea')).toBe(-1000);
    expect(myBalances(d)).toEqual([
      { currency: 'BRL', cents: 6000 },
      { currency: 'EUR', cents: -1000 },
    ]);
    expect(allDebts(d).filter((x) => x.currency === 'EUR')).toEqual([
      { from: 'lea', to: 'hugo', amountCents: 1000, currency: 'EUR' },
      { from: 'chloe', to: 'hugo', amountCents: 1000, currency: 'EUR' },
    ]);
  });
});

describe('simplifyDebts: who pays whom', () => {
  it('settles everyone with the fewest transfers, largest first', () => {
    const net = new Map([['a', 4000], ['b', 1000], ['c', -3500], ['d', -1500]]);
    expect(simplifyDebts(net)).toEqual([
      { from: 'c', to: 'a', amountCents: 3500 },
      { from: 'd', to: 'a', amountCents: 500 },
      { from: 'd', to: 'b', amountCents: 1000 },
    ]);
  });

  it('leaves nobody owing anything once the transfers are made', () => {
    const net = new Map([['a', 4000], ['b', 1000], ['c', -3500], ['d', -1500]]);
    for (const t of simplifyDebts(net)) {
      net.set(t.from, net.get(t.from)! + t.amountCents);
      net.set(t.to, net.get(t.to)! - t.amountCents);
    }
    expect([...net.values()]).toEqual([0, 0, 0, 0]);
  });

  it('asks for nothing when everyone is even', () => {
    expect(simplifyDebts(new Map([['a', 0], ['b', 0]]))).toEqual([]);
  });
});
