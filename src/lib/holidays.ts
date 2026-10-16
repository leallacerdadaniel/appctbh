/**
 * Brazilian holidays that matter to a student living in Belo Horizonte.
 * Computed per year (movable dates derive from Easter), so the calendar works
 * for any semester without yearly data entry.
 *
 * - national: federal law (Lei 662/1949, 6.802/1980, 14.759/2023 for Nov 20).
 *   Apr 21 is also Minas Gerais' Data Magna (state constitution, art. 256).
 * - city: Belo Horizonte, Lei municipal 11.397/2022 (consolidating Lei 1.327/1967):
 *   Sexta-feira da Paixão, Corpus Christi, Assunção, Imaculada Conceição.
 *   Good Friday is legally a municipal religious holiday (Lei 9.093/1995, art. 2).
 * - optional: "ponto facultativo" that BH's municipal decree repeats every year
 *   (public offices close, most shops open). Year-specific bridge days
 *   ("emendas", e.g. Apr 20 2026) are decided by yearly decree and not included.
 */

export type HolidayKind = 'national' | 'city' | 'optional';

export type Holiday = {
  date: string; // YYYY-MM-DD
  kind: HolidayKind;
  name: { pt: string; fr: string; en: string };
};

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shift(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function holidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`;

  const list: Holiday[] = [
    { date: fixed(1, 1), kind: 'national', name: { pt: 'Confraternização Universal', fr: 'Jour de l’An', en: 'New Year’s Day' } },
    { date: iso(shift(easter, -48)), kind: 'optional', name: { pt: 'Carnaval', fr: 'Carnaval (lundi)', en: 'Carnival Monday' } },
    { date: iso(shift(easter, -47)), kind: 'optional', name: { pt: 'Carnaval', fr: 'Carnaval (mardi)', en: 'Carnival Tuesday' } },
    { date: iso(shift(easter, -46)), kind: 'optional', name: { pt: 'Quarta-feira de Cinzas', fr: 'Mercredi des Cendres', en: 'Ash Wednesday' } },
    { date: iso(shift(easter, -3)), kind: 'optional', name: { pt: 'Quinta-feira Santa', fr: 'Jeudi saint', en: 'Maundy Thursday' } },
    { date: iso(shift(easter, -2)), kind: 'city', name: { pt: 'Sexta-feira da Paixão', fr: 'Vendredi saint', en: 'Good Friday' } },
    { date: fixed(4, 21), kind: 'national', name: { pt: 'Tiradentes', fr: 'Tiradentes', en: 'Tiradentes Day' } },
    { date: fixed(5, 1), kind: 'national', name: { pt: 'Dia do Trabalho', fr: 'Fête du Travail', en: 'Labour Day' } },
    { date: iso(shift(easter, 60)), kind: 'city', name: { pt: 'Corpus Christi', fr: 'Fête‑Dieu (Corpus Christi)', en: 'Corpus Christi' } },
    { date: fixed(8, 15), kind: 'city', name: { pt: 'Assunção de Nossa Senhora', fr: 'Assomption', en: 'Assumption Day' } },
    { date: fixed(9, 7), kind: 'national', name: { pt: 'Independência do Brasil', fr: 'Fête de l’Indépendance', en: 'Independence Day' } },
    { date: fixed(10, 12), kind: 'national', name: { pt: 'Nossa Senhora Aparecida', fr: 'Notre‑Dame d’Aparecida', en: 'Our Lady of Aparecida' } },
    { date: fixed(11, 2), kind: 'national', name: { pt: 'Finados', fr: 'Jour des Morts', en: 'All Souls’ Day' } },
    { date: fixed(11, 15), kind: 'national', name: { pt: 'Proclamação da República', fr: 'Proclamation de la République', en: 'Republic Day' } },
    { date: fixed(11, 20), kind: 'national', name: { pt: 'Dia da Consciência Negra', fr: 'Journée de la conscience noire', en: 'Black Consciousness Day' } },
    { date: fixed(12, 8), kind: 'city', name: { pt: 'Imaculada Conceição', fr: 'Immaculée Conception', en: 'Immaculate Conception' } },
    { date: fixed(12, 24), kind: 'optional', name: { pt: 'Véspera de Natal', fr: 'Veille de Noël', en: 'Christmas Eve' } },
    { date: fixed(12, 25), kind: 'national', name: { pt: 'Natal', fr: 'Noël', en: 'Christmas Day' } },
    { date: fixed(12, 31), kind: 'optional', name: { pt: 'Véspera de Ano-Novo', fr: 'Saint‑Sylvestre', en: 'New Year’s Eve' } },
  ];

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
