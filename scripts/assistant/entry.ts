/**
 * Builds the assistant's knowledge base from the content already in the app, so the AI answers with
 * the same rules, procedures and places the student sees. Run: node scripts/assistant/build.mjs
 */
import { readFileSync } from 'node:fs';

import { adminProcedures } from '@/lib/admin';
import { attractions } from '@/lib/attractions';
import { beautyPlaces } from '@/lib/beauty';
import { HEALTH_PLACES, RECEPTION_PHRASES } from '@/lib/health';
import { nightPlaces } from '@/lib/nightlife';
import { HELP_STEPS, PREP_CONTENT, PREP_STEPS } from '@/lib/phone-stolen';
import { restaurants } from '@/lib/restaurants';
import { services } from '@/lib/services';
import { sportPlaces } from '@/lib/sports';
import { strings } from '@/i18n/strings';

type Any = Record<string, unknown>;
const fr = strings.fr as unknown as Any;
const en = strings.en as unknown as Any;

/**
 * Localized {fr,en} → the French text; strings stay; functions and assets are dropped.
 * French only since 2026-11-10: the base goes with every question, and "fr / en" doubled the two longest sections
 * for nothing (Charlotte answers in the student's language anyway). Only the names of screens and buttons are
 * given in both languages (`name`, below), because the student has to find them as written.
 */
function plain(v: unknown): unknown {
  if (v == null || typeof v === 'function' || typeof v === 'number' || typeof v === 'boolean') {
    return typeof v === 'function' ? undefined : v;
  }
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(plain).filter((x) => x !== undefined && x !== '');
  const o = v as Any;
  if (typeof o.fr === 'string' && typeof o.en === 'string') return o.fr;
  const out: Any = {};
  for (const [k, val] of Object.entries(o)) {
    if (/photo|image|icon|url|lat|lng|longitude|latitude|placeId|hours|rating|reviews|keywords|mapsName|id$/i.test(k)) continue;
    const p = plain(val);
    if (p !== undefined && p !== '' && !(Array.isArray(p) && p.length === 0)) out[k] = p;
  }
  return Object.keys(out).length ? out : undefined;
}

/** "R. Sergipe, 1414 - Savassi, Belo Horizonte - MG, 30130-174" → "R. Sergipe, 1414 - Savassi": the city and the postcode say nothing here. */
const street = (address: unknown) =>
  typeof address === 'string' ? address.replace(/,? ?Belo Horizonte - MG(, \d{5}-\d{3})?$/, '') : address;

const line = (o: Any, keys: string[]) =>
  keys
    .map((k) => (k === 'address' ? street(plain(o[k])) : plain(o[k])))
    .filter((x) => typeof x === 'string' && x)
    .join(' · ');

const placeKeys = ['name', 'title', 'cuisine', 'kind', 'group', 'category', 'neighborhood', 'district', 'address'];
const list = (title: string, items: unknown[]) =>
  `## ${title}\n` + (items as Any[]).map((o) => `- ${line(o, placeKeys)}`).filter((l) => l.length > 2).join('\n');

const sections = [
  '## Règles de l’appartement (cartilha)\n' + JSON.stringify(plain((fr.apartment as Any).rules)),
  '## Urgences\n' + JSON.stringify(plain(fr.emergency)),
  '## Démarches administratives (CPF, RNM…)\n' + JSON.stringify(plain(adminProcedures)),
  '## Applis et services utiles (Uber, 99, banques, compagnies aériennes, bus)\n' + JSON.stringify(plain(services)),
  list('Restaurants recommandés', restaurants),
  list('Vie nocturne', nightPlaces),
  list('Sport', sportPlaces),
  list('Beauté (coiffeurs, barbiers, manucure)', beautyPlaces),
  list('Attractions à BH', attractions),
];

/* ---------- The app itself (2026-11-10): where things are, and the parts added since the first build ----------
 *
 * Everything below quotes the app's own texts (`src/i18n/strings.ts`) and data (`src/lib/*.ts`), so Charlotte says
 * what the screens say. Only the order and the few joining words are written here. A text that was renamed or
 * removed stops the build (`s`, `name`), and so does a screen that no longer shows what the map says (`shown`):
 * fix this file, run the build again and republish the function.
 */

function at(root: Any, path: string): unknown {
  let v: unknown = root;
  for (const k of path.split('.')) v = (v as Any | null | undefined)?.[k];
  if (v == null) throw new Error(`strings: "${path}" não existe mais. Ajustar scripts/assistant/entry.ts.`);
  return v;
}

/** The French text at this path of the strings; a text that takes arguments is called with `args`. */
function s(path: string, ...args: unknown[]): string {
  const v = at(fr, path);
  const out = typeof v === 'function' ? (v as (...a: unknown[]) => unknown)(...args) : v;
  if (typeof out !== 'string') throw new Error(`strings: "${path}" não é um texto.`);
  return out;
}

/** A screen or button as the student reads it, in both languages: « Séjour / My stay ». */
function name(path: string): string {
  const a = s(path);
  const b = at(en, path);
  return typeof b === 'string' && b !== a ? `« ${a} / ${b} »` : `« ${a} »`;
}

const names = (...paths: string[]) => paths.map(name).join(', ');

/** Sentences of the app, one after the other. */
const say = (...paths: string[]) => paths.map((p) => s(p)).join(' ');

/** A group of short labels ("topics", "reasons") as one line. */
const labels = (path: string) => Object.values(at(fr, path) as Any).filter((v) => typeof v === 'string').join(', ');

/** The hand-written map must match the screens: stop when a screen file no longer contains one of these. */
function shown(file: string, ...needles: string[]) {
  const src = readFileSync(file, 'utf8');
  for (const n of needles) {
    if (!src.includes(n)) {
      throw new Error(`${file} não tem mais "${n}": conferir o mapa do app em scripts/assistant/entry.ts.`);
    }
  }
  return src;
}

/** Explorer's categories, in the order of the screen. */
const explorerSrc = shown(
  'src/app/(tabs)/explorer.tsx',
  '<FirstStepsBanner',
  '<PortugueseEntry',
  '<PhoneStolenEntry',
  '<HealthEntry',
  "only={['around', 'start', 'daily']}",
  '<GroupTripsEntry',
);
shown('src/components/guide-content.tsx', 't.admin.title', 't.services.title', 't.nearby.title', 't.home.emergency');
const categories = /const CATEGORIES = \[([^\]]+)\]/.exec(explorerSrc)?.[1].match(/\w+/g);
if (!categories) throw new Error('src/app/(tabs)/explorer.tsx: CATEGORIES não encontrado.');

shown('src/app/(tabs)/_layout.tsx', 'explorer', 'maison', 'sejour');
shown('src/components/home-v3.tsx', 't.today.quick.wifi', 't.today.quick.services', 't.today.quick.roommates', 't.today.quick.sos');
shown('src/app/emergency.tsx', 't.health.entry', 't.emergency.hospitals');
shown('src/app/profile.tsx', 't.profile.language', 't.profile.contact', 't.profile.signOut', 't.account.rowTitle', '/house/my-profile');
shown(
  'src/app/(tabs)/maison.tsx',
  't.maison.daily',
  't.houseSocial.section',
  't.houseSocial.visitors.tile',
  't.houseSocial.packages.tile',
  't.maison.roommates',
  't.chores.tile',
  't.expenses.tile',
  't.maison.roommatesTile',
  't.maison.residents',
  't.community.hubRow',
  't.maison.cleaning',
);
shown(
  'src/app/(tabs)/sejour.tsx',
  't.chezToi.ask',
  't.chezToi.pay',
  't.chezToi.contract',
  't.chezToi.help',
  't.tour.replay',
  't.common.privacyPolicy',
  't.chezToi.stay',
  '<RecapHubRow',
  '<FeedbackHubRow',
  '<ReferralHubRow',
  't.family.title',
);
shown('src/app/login.tsx', 't.login.forgot', 't.login.firstAccess');

const practical = name('explorerTab.categories.practical');
const inPractical = `${name('tabs.explorer')} › ${practical}`;

const appMap = [
  '## Où trouver chaque chose dans l’app (noms des écrans et des boutons : français / anglais ; le reste de cette base est en français)',
  `- Barre du bas : ${names('tabs.home', 'tabs.explorer')}, le bouton rouge de Charlotte au centre, ${names('tabs.maison', 'tabs.sejour')}.`,
  `- En haut de chaque onglet. ${s('tour.steps.top')} ${name('profile.title')} : ${names('houseSocial.profile.row', 'profile.language', 'profile.contact', 'profile.signOut', 'account.rowTitle')}. La cloche : ${name('notices.title')}.`,
  `- ${name('tabs.home')} : ${s('tour.steps.address')} Raccourcis : ${s('tour.steps.quick')} SOS ouvre ${name('emergency.title')} : ${names('health.entry', 'emergency.hospitals')}.`,
  `- ${name('tabs.explorer')} : ${s('tour.steps.explorer')} Catégories : ${categories.map((c) => name(`explorerTab.categories.${c}`)).join(', ')}.`,
  `  - ${name('explorerTab.categories.forYou')} : ${name('explorerTab.firstSteps')} (${s('explorerTab.firstStepsHint')}).`,
  `  - ${practical} : ${names('portuguese.title', 'phoneStolen.entry', 'health.entry', 'admin.title', 'services.title', 'nearby.title', 'home.emergency')}.`,
  `  - ${name('explorerTab.categories.trips')} : ${name('community.trips.banner')} (${s('community.trips.bannerBody')}) et les destinations.`,
  `- ${name('tabs.maison')} : ${s('maison.subtitle')}`,
  `  - ${name('maison.daily')} : ${s('maison.dailyHint')}.`,
  `  - ${name('houseSocial.section')} : ${names('houseSocial.visitors.tile', 'houseSocial.packages.tile')}.`,
  `  - ${name('maison.roommates')} : ${names('chores.tile', 'expenses.tile', 'maison.roommatesTile')}.`,
  `  - ${name('maison.residents')} : ${name('community.hubRow')} (${s('community.hubRowSubtitle')}).`,
  `  - ${name('maison.cleaning')} : ${s('maison.cleaningHint')}.`,
  `- ${name('tabs.sejour')} : ${s('chezToi.subtitle')}`,
  `  - ${name('chezToi.ask')} : ${s('chezToi.askHint')}.`,
  `  - ${name('chezToi.pay')} : ${s('chezToi.payHint')}.`,
  `  - ${name('chezToi.contract')} : ${s('chezToi.contractHint')}.`,
  `  - ${name('chezToi.help')} : ${s('chezToi.helpHint')} ; aussi ${names('tour.replay', 'common.privacyPolicy')}.`,
  `  - ${name('chezToi.stay')} : ${names('recap.hub.title', 'feedback.rowTitle', 'referral.rowTitle', 'family.title')}.`,
  `- Sans internet : ${s('offline.hint')}`,
].join('\n');

/* Health. The team asked (2026-11-09) to stay out of the public system's rules for foreigners, the school's
   insurance and vaccines: the page has none of it, and the build stops if such a text ever reaches this section. */
const health = [
  `## Santé : page ${name('health.entry')} (${inPractical}, ou SOS). Jamais d’avis médical.`,
  s('health.subtitle'),
  `- ${s('health.urgent')} : ${s('health.urgentHint')} 192 (SAMU).`,
  `- ${s('health.where')} : ${s('health.whereHint')}`,
  ...HEALTH_PLACES.map((p) => `  - ${p.name} · ${p.kind.fr} · ${p.address}`),
  `- ${s('health.payment')}`,
  `- ${s('health.reception')}, phrases en portugais : ${RECEPTION_PHRASES.map((p) => `${p.pt} (${p.fr})`).join(' · ')}`,
  `- ${s('health.pharmacies')} : ${say('health.pharmaciesHint')} ${s('health.findAraujo')} : ${s('health.findAraujoHint')}. ${s('health.araujoApp')} : ${s('health.araujoAppHint')}.`,
  `- ${s('health.doctors')} : ${s('health.doctorsHint')} ${s('health.doctoralia')} : ${s('health.doctoraliaHint')}`,
  `- ${s('health.talk')} ${s('health.talkHint')} ${s('health.psychologist')} : ${s('health.psychologistHint')}`,
].join('\n');
const leftOut = /\bSUS\b|SKEMA|vaccin|vacina/i.exec(health);
if (leftOut) throw new Error(`Saúde: "${leftOut[0]}" não entra na base da Charlotte (pedido da equipe, 09/11/2026).`);

const charter = at(fr, 'community.charter.rules') as { title: string; body: string }[];
const community = [
  `## Communauté des résidents (${name('tabs.maison')} › ${name('community.hubRow')})`,
  `${s('community.subtitle')}. ${s('community.errors.noRental')}`,
  `- ${s('community.wall.title')} : ${s('community.wall.subtitle')}. ${s('community.compose.who')} ${s('community.compose.scopeAll')} ou ${s('community.compose.scopeApartment')}. ${s('community.compose.kind')} : ${labels('community.wall.kinds')}.`,
  `- ${s('community.trips.title')} : ${say('community.trips.subtitle')}. ${name('community.trips.propose')} : ${[s('community.tripEdit.destination'), s('community.tripEdit.start'), s('community.tripEdit.duration'), s('community.tripEdit.seats'), s('community.tripEdit.description')].join(', ')}. Pour participer : ${name('community.trips.join')}. ${s('community.trips.talk')} : ${say('community.trips.talkHint', 'community.trips.talkJoin')} ${s('community.trips.help')}. ${s('community.trips.cancelConfirm')}`,
  `- ${s('community.events.title')} : ${s('community.events.subtitle')}. Réponse : ${names('community.events.join', 'community.events.decline')}.`,
  `- ${s('community.charter.title')} (à accepter avant de publier) : ${charter.map((r) => `${r.title} : ${r.body}`).join(' ')}`,
  `- Modération : ${s('community.charter.moderation')}`,
  `- ${s('community.report.title')} : ${s('community.report.subtitle')} Motifs : ${labels('community.report.reasons')}. ${s('community.report.danger')}`,
  `- Bloquer quelqu’un : ${s('community.post.blockConfirmBody')}`,
  `- Liens : ${s('common.noLinks')}`,
].join('\n');

const stepLine = (step: (typeof HELP_STEPS)[number], i: number) => {
  const headings = step.blocks.map((b) => b.heading?.fr).filter(Boolean);
  const calls = step.blocks.flatMap((b) => b.links ?? []).filter((l) => l.kind === 'call').map((l) => l.label.fr);
  return `${i + 1}. ${step.title.fr} : ${step.summary.fr}${headings.length ? ` (${headings.join(', ')})` : ''}${calls.length ? ` ${calls.join(', ')}.` : ''}`;
};
const phoneStolen = [
  `## Téléphone volé : guide ${name('phoneStolen.entry')} (${inPractical})`,
  `${say('phoneStolen.subtitle')} ${s('phoneStolen.helpMode')} : ${s('phoneStolen.helpModeHint')} ${s('phoneStolen.danger')} ${s('phoneStolen.dangerHint')} ${s('phoneStolen.police')}, ${s('phoneStolen.samu')}.`,
  'Les étapes, dans cet ordre (le détail, les liens officiels et les numéros sont dans le guide) :',
  ...HELP_STEPS.map(stepLine),
  `${HELP_STEPS.length + 1}. ${s('phoneStolen.help.team')} : ${s('phoneStolen.help.teamText')}`,
  s('phoneStolen.computer'),
  `${s('phoneStolen.before')} (réglages à faire tant qu’on a son téléphone) : ${PREP_STEPS.map((id) => PREP_CONTENT[id].title.fr).join(' ; ')}.`,
].join('\n');

const access = [
  '## Accès à l’app et compte',
  `- ${s('firstAccess.title')} (écran de connexion, ${name('login.firstAccess')}), 3 étapes. 1, ${s('firstAccess.identityTitle')} ${[s('login.email'), s('firstAccess.birthDate'), s('firstAccess.passport')].join(', ')} : ${s('firstAccess.identityHint')} 2, ${s('firstAccess.profileTitle')} : ${s('firstAccess.profileHint')} ${name('firstAccess.correct')} : ${s('firstAccess.correctionNote')} 3, ${s('firstAccess.passwordTitle')} : ${s('firstAccess.errors.tooShort')}`,
  `  - Si ça bloque : ${say('firstAccess.errors.noMatch', 'firstAccess.errors.tooMany', 'firstAccess.incomplete', 'firstAccess.errors.hasAccount')}`,
  `- ${s('forgotPassword.title')} (écran de connexion, ${name('login.forgot')}) : ${s('forgotPassword.intro')} ${s('forgotPassword.sentEmail', 'cet e‑mail')} Sans e‑mail automatique : ${s('forgotPassword.sentTeam')}`,
  `- Fin du séjour : ${s('account.accessEnds', '30e jour après la date de sortie')} ${s('login.errors.accessEnded')}`,
  `- ${s('account.title')} (${name('profile.title')} › ${name('account.rowTitle')}) : ${say('account.intro', 'account.confirmBody')} ${s('account.password')}. ${s('account.deletedTitle')} : ${(at(fr, 'account.deleted') as string[]).join(' ; ')}. ${s('account.keptTitle')} : ${(at(fr, 'account.kept') as string[]).join(' ; ')}.`,
].join('\n');

const privacy = [
  '## Confidentialité et Charlotte (IA)',
  `- ${say('assistant.consentBody', 'assistant.consentHint', 'assistant.caution')}`,
  `- ${name('assistant.reportAnswer')} (sous chaque réponse) : ${labels('assistant.reportReasons')}. ${s('assistant.reportThanks')}.`,
  `- ${name('common.privacyPolicy')} (${s('common.privacyHint')}) : ${name('tabs.sejour')} › ${name('chezToi.help')}.`,
].join('\n');

const stay = [
  `## Avis, questionnaire et parrainage (${name('tabs.sejour')} › ${name('chezToi.stay')})`,
  `- ${name('feedback.rowTitle')} : ${s('feedback.newSubtitle')} ${s('feedback.topic')} : ${labels('feedback.topics')}. ${s('feedback.urgent')}`,
  `- Questionnaire (au milieu et à la fin du séjour, annoncé sur ${name('tabs.home')}) : ${s('survey.subtitle')} ${s('survey.npsQuestion')} ${s('survey.details')} : ${labels('survey.scores')}. ${s('survey.testimonial')} ${s('survey.nothing')}`,
  `- ${name('referral.rowTitle')} : ${s('referral.subtitle')} ${(at(fr, 'referral.steps') as string[]).join(' ')} ${s('referral.reward')} et ${s('referral.terms').toLowerCase()} : affichés sur la page, fixés par l’équipe. ${s('referral.mine')} : ${labels('referral.status')}.`,
].join('\n');

const building = [
  `## Visites, colis et profil (${name('tabs.maison')} › ${name('houseSocial.section')})`,
  `- ${name('houseSocial.visitors.tile')} : ${say('houseSocial.visitors.subtitle', 'houseSocial.visitors.why', 'houseSocial.visitors.noPortaria', 'houseSocial.visitors.changedNotice')}`,
  `- ${name('houseSocial.packages.tile')} : ${s('houseSocial.packages.how')}`,
  `- ${name('houseSocial.profile.row')} (${name('profile.title')}) : ${s('houseSocial.profile.subtitle')} ${[s('houseSocial.profile.school'), s('houseSocial.profile.hometown'), s('houseSocial.profile.languages'), s('houseSocial.profile.instagram'), s('houseSocial.profile.about')].join(', ')}. ${say('houseSocial.profile.visibleHint', 'houseSocial.profile.teamNote')}`,
].join('\n');

const text = [appMap, ...sections, health, community, phoneStolen, access, privacy, stay, building].join('\n\n');

// A text of the app that still names a tab of an older navigation would teach Charlotte a place that is gone:
// say so on every build (stderr, the knowledge is on stdout) until the text is fixed in the app.
const tabNames = new Set(['home', 'explorer', 'maison', 'sejour'].flatMap((k) => [s(`tabs.${k}`), at(en, `tabs.${k}`)]));
for (const m of text.matchAll(/l’onglet (\p{Lu}\p{L}*)|[Tt]he (\p{Lu}[\p{L} ]*?) tab\b/gu)) {
  if (!tabNames.has(m[1] ?? m[2])) {
    console.error(`AVISO: um texto do app cita uma aba que não existe mais: "${text.slice(m.index, m.index + 70)}"`);
  }
}

process.stdout.write(text);
