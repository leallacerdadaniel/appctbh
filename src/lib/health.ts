import type { IconName } from '@/components/icon';
import type { Localized } from '@/lib/mock-data';
import { ALL_PHRASES, type Phrase } from '@/lib/portuguese';

/**
 * "Santé / Health" (owner, 2026-11-09): where to go, who to call and what to say at the front desk, for a
 * student who doesn't know how health care works in Brazil. Research and the team's answers:
 * `docs/pesquisa/saude-bh.md` (section 9). General information only, never medical advice.
 *
 * Left out on purpose (team, 2026-11-09: "melhor não nos metermos"): the SUS rules for foreigners, the
 * school's insurance and vaccines. The UPA shows its address only (no hours, no phone).
 *
 * Every fact below was checked on an official page on 2026-11-09 (sources next to each one). Addresses and
 * hours change: re-check them each semester.
 */

const L = (fr: string, en: string): Localized => ({ fr, en });

export type HealthPlace = {
  id: 'upa' | 'materDei' | 'lifecenter';
  icon: IconName;
  /** Proper name, the same in every language. */
  name: string;
  kind: Localized;
  /** As written in Brazil, so the student can show it to a driver. */
  address: string;
  /** What Google Maps searches for (name + address finds the building). */
  mapsQuery: string;
};

const PRIVATE_ER = L('Hôpital privé · urgences 24 h/24', 'Private hospital · 24-hour emergency room');

/** In this order: the public emergency unit, then the two private hospitals the team recommends. */
export const HEALTH_PLACES: HealthPlace[] = [
  {
    // Prefeitura de Belo Horizonte, list of the city's UPAs: "UPA Centro-Sul, Rua Domingos Vieira, 488 -
    // Santa Efigênia". https://prefeitura.pbh.gov.br/saude/informacoes/atencao-a-saude/urgencia-e-emergencia/upa
    // (checked 2026-11-09). The team asked for the address only.
    id: 'upa',
    icon: 'emergency',
    name: 'UPA Centro-Sul',
    kind: L('Urgences publiques', 'Public emergency unit'),
    address: 'Rua Domingos Vieira, 488, Santa Efigênia',
    mapsQuery: 'UPA Centro-Sul, Rua Domingos Vieira, 488, Santa Efigênia, Belo Horizonte',
  },
  {
    // Mater Dei's own pages (checked 2026-11-09):
    // https://materdei.com.br/servicos/pronto-socorro-hub-bh: "Mater Dei Contorno: Atendimento de Urgência e
    //   emergência 24h – adulto e pediátrico", every day, 24 hours.
    // https://www.materdei.com.br/unidades: "Av. do Contorno, nº 9.000, 2º andar, Barro Preto Belo Horizonte,
    //   MG - CEP 30.110-064", 24h.
    id: 'materDei',
    icon: 'hospital',
    name: 'Mater Dei Contorno',
    kind: PRIVATE_ER,
    address: 'Av. do Contorno, 9000, Barro Preto',
    mapsQuery: 'Hospital Mater Dei Contorno, Av. do Contorno, 9000, Barro Preto, Belo Horizonte',
  },
  {
    // The hospital belongs to Hapvida NotreDame Intermédica; its unit page (checked 2026-11-09)
    // https://www2.hapvida.com.br/unidades/hospital-lifecenter-bh says "Atendimento 24h" and
    // "Av. do Contorno, 4747 - Funcionários, Belo Horizonte – MG". The team confirmed the 24-hour emergency
    // room (2026-11-09). lifecenter.com.br is the building's condominium site, not the hospital's.
    // Not to be confused with the group's "Pronto Atendimento Contorno" at Av. do Contorno, 2001.
    id: 'lifecenter',
    icon: 'hospital',
    name: 'Hospital Lifecenter',
    kind: PRIVATE_ER,
    address: 'Av. do Contorno, 4747, Funcionários',
    mapsQuery: 'Hospital Lifecenter, Av. do Contorno, 4747, Funcionários, Belo Horizonte',
  },
];

/**
 * Drogaria Araujo: the team (2026-11-09) says there is one everywhere in BH and almost all are open 24 hours.
 * Google Maps searches around the phone (same link as "Autour de moi", no key, no cost).
 */
export const ARAUJO_SEARCH = 'Drogaria Araujo';
/** Its app is already in "Applis et services" (`src/lib/services.ts`). */
export const ARAUJO_SERVICE_ID = 'araujo';

/**
 * Doctoralia: find a doctor, dentist or gynaecologist, with a "Teleconsulta" option, patient reviews, online
 * booking and an "Idioma" filter in the results (Inglês, Francês…). Checked 2026-11-09 on
 * https://www.doctoralia.com.br/ and https://www.doctoralia.com.br/clinicas/clinico-geral/belo-horizonte.
 */
export const DOCTORALIA_URL = 'https://www.doctoralia.com.br/';

/**
 * Psychologists in Belo Horizonte on Doctoralia, with a "Teleconsulta" filter (checked 2026-11-09 on this page).
 * Replaces the CVV 188 line on 2026-11-09 (owner: CVV only answers in Portuguese, which doesn't help a student who
 * doesn't speak it, at the worst moment). Crisis or immediate danger: 192, at the top of the page.
 */
export const PSYCHOLOGIST_URL = 'https://www.doctoralia.com.br/psicologo/belo-horizonte';

/* ---------- At the front desk ---------- */

const existing = (id: string) => ALL_PHRASES.filter((p) => p.id === id);

/**
 * What to say at a hospital's front desk (team, 2026-11-09: private hospitals charge on the spot, the student
 * asks the insurer for a refund, so they need the invoice and the medical report). Read aloud like the
 * "Parler portugais" phrases; two come from there, two are written for this page.
 * The `say` hints follow the rules at the top of `src/lib/portuguese.ts`.
 */
export const RECEPTION_PHRASES: Phrase[] = [
  ...existing('pharmacy-doctor'),
  ...existing('emergency-language'),
  {
    id: 'health-refund',
    pt: 'Vou pagar e pedir reembolso ao meu seguro.',
    fr: 'Je vais payer et demander le remboursement à mon assurance.',
    en: 'I’ll pay and ask my insurance for a refund.',
    say: 'vô pa-GA i pé-DJI hé-ein-BÔOU-ssou aou mêou ssé-GOU-rou',
  },
  {
    id: 'health-documents',
    pt: 'Pode me dar a nota fiscal e o relatório médico?',
    fr: 'Vous pouvez me donner la facture et le compte rendu médical ?',
    en: 'Can I have the invoice and the medical report?',
    say: 'PO-dji mi da a NO-ta fis-KAOU i ou hé-la-TO-riou MÈ-dji-kou ?',
  },
];
