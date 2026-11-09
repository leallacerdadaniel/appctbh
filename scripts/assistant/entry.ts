/**
 * Builds the assistant's knowledge base from the content already in the app, so the AI answers with
 * the same rules, procedures and places the student sees. Run: node scripts/assistant/build.mjs
 */
import { adminProcedures } from '@/lib/admin';
import { attractions } from '@/lib/attractions';
import { beautyPlaces } from '@/lib/beauty';
import { nightPlaces } from '@/lib/nightlife';
import { restaurants } from '@/lib/restaurants';
import { services } from '@/lib/services';
import { sportPlaces } from '@/lib/sports';
import { strings } from '@/i18n/strings';

type Any = Record<string, unknown>;
const fr = strings.fr as unknown as Any;

/** Localized {fr,en} → "fr / en"; strings stay; functions and assets are dropped. */
function plain(v: unknown): unknown {
  if (v == null || typeof v === 'function' || typeof v === 'number' || typeof v === 'boolean') {
    return typeof v === 'function' ? undefined : v;
  }
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(plain).filter((x) => x !== undefined && x !== '');
  const o = v as Any;
  if (typeof o.fr === 'string' && typeof o.en === 'string') return o.fr === o.en ? o.fr : `${o.fr} / ${o.en}`;
  const out: Any = {};
  for (const [k, val] of Object.entries(o)) {
    if (/photo|image|icon|url|lat|lng|longitude|latitude|placeId|hours|rating|reviews|id$/i.test(k)) continue;
    const p = plain(val);
    if (p !== undefined && p !== '' && !(Array.isArray(p) && p.length === 0)) out[k] = p;
  }
  return Object.keys(out).length ? out : undefined;
}

const line = (o: Any, keys: string[]) =>
  keys
    .map((k) => plain(o[k]))
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

const text = sections.join('\n\n');
process.stdout.write(text);
