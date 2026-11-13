import { attractions } from '@/lib/attractions';
import { nightPlaces } from '@/lib/nightlife';
import { displayName, restaurants } from '@/lib/restaurants';
import type { VisitKind } from '@/lib/visited';

/**
 * Geography for the recaps, computed on the phone only: distances, "is this BH?", the guide place the
 * student is standing at, and a city name from a small table (the travel ideas of the app) when the
 * system geocoder can't be used (no opt-in, offline, web).
 */

export type PlaceRef = { id: string; kind: VisitKind; name: string };

/** Praça Sete, the center of Belo Horizonte. */
const BH = { lat: -19.9191, lng: -43.9386 };
/** Within this distance of the center it counts as BH (the city and its first ring: Pampulha, Nova Lima, Contagem). */
const BH_RADIUS_KM = 25;
/** A guide place counts as visited when the position is this close to it. */
export const PLACE_RADIUS_M = 80;

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export const isInBH = (p: { lat: number; lng: number }) => distanceM(p, BH) <= BH_RADIUS_KM * 1000;

/** About 110 m: what the journal keeps of a position. */
export const roughly = (n: number) => Math.round(n * 1000) / 1000;

type GuidePlace = PlaceRef & { lat: number; lng: number; neighborhood: string };

/** Every guide place with coordinates: restaurants, bars and clubs, attractions (Mercado Novo once). */
const GUIDE: GuidePlace[] = (() => {
  const list: GuidePlace[] = [
    ...restaurants.map((r) => ({ id: r.id, kind: 'restaurant' as const, name: displayName(r), lat: r.lat, lng: r.lng, neighborhood: r.neighborhood })),
    ...nightPlaces.map((p) => ({ id: p.id, kind: p.kind, name: p.name, lat: p.lat, lng: p.lng, neighborhood: p.neighborhood })),
    ...attractions.map((a) => ({ id: a.id, kind: 'attraction' as const, name: a.name, lat: a.lat, lng: a.lng, neighborhood: a.neighborhood })),
  ];
  const seen = new Set<string>();
  return list.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !seen.has(p.id) && !!seen.add(p.id));
})();

/** The guide place the position is at (≤ 80 m), the closest one. */
export function guidePlaceAt(p: { lat: number; lng: number }, radius = PLACE_RADIUS_M): PlaceRef | null {
  let best: GuidePlace | null = null;
  let bestD = radius;
  for (const g of GUIDE) {
    const d = distanceM(p, g);
    if (d <= bestD) {
      best = g;
      bestD = d;
    }
  }
  return best ? { id: best.id, kind: best.kind, name: best.name } : null;
}

/** Neighbourhood of the closest guide place within 1.2 km (fallback when the geocoder gives none). */
export function nearbyNeighborhood(p: { lat: number; lng: number }) {
  let best: GuidePlace | null = null;
  let bestD = 1200;
  for (const g of GUIDE) {
    const d = distanceM(p, g);
    if (d <= bestD) {
      best = g;
      bestD = d;
    }
  }
  return best?.neighborhood ?? null;
}

export function guideNeighborhood(id: string) {
  return GUIDE.find((g) => g.id === id)?.neighborhood ?? null;
}

/**
 * Approximate centers of the trips suggested in Explorer (src/lib/travel.ts), with a radius in km:
 * enough to name the city of a photo or a position outside BH without asking any server.
 */
const CITIES: { name: string; lat: number; lng: number; km: number }[] = [
  { name: 'Inhotim', lat: -20.124, lng: -44.218, km: 12 },
  { name: 'Ouro Preto', lat: -20.385, lng: -43.503, km: 6 },
  { name: 'Mariana', lat: -20.377, lng: -43.416, km: 6 },
  { name: 'Serra do Cipó', lat: -19.34, lng: -43.59, km: 30 },
  { name: 'Congonhas', lat: -20.5, lng: -43.86, km: 10 },
  { name: 'Tiradentes', lat: -21.11, lng: -44.176, km: 6 },
  { name: 'São João del-Rei', lat: -21.136, lng: -44.261, km: 8 },
  { name: 'Diamantina', lat: -18.24, lng: -43.6, km: 15 },
  { name: 'Capitólio', lat: -20.61, lng: -46.05, km: 30 },
  { name: 'Serra da Canastra', lat: -20.25, lng: -46.45, km: 50 },
  { name: 'Ibitipoca', lat: -21.7, lng: -43.89, km: 15 },
  { name: 'São Thomé das Letras', lat: -21.72, lng: -44.985, km: 10 },
  { name: 'Rio de Janeiro', lat: -22.91, lng: -43.2, km: 40 },
  { name: 'Paraty', lat: -23.22, lng: -44.71, km: 20 },
  { name: 'Ilha Grande', lat: -23.14, lng: -44.2, km: 15 },
  { name: 'Angra dos Reis', lat: -23.0, lng: -44.32, km: 25 },
  { name: 'Búzios', lat: -22.75, lng: -41.88, km: 15 },
  { name: 'Salvador', lat: -12.97, lng: -38.5, km: 40 },
  { name: 'Chapada Diamantina', lat: -12.56, lng: -41.39, km: 80 },
  { name: 'Foz do Iguaçu', lat: -25.55, lng: -54.58, km: 40 },
  { name: 'Lençóis Maranhenses', lat: -2.6, lng: -43.0, km: 80 },
  { name: 'Jericoacoara', lat: -2.79, lng: -40.51, km: 30 },
  { name: 'Bonito', lat: -21.13, lng: -56.49, km: 50 },
  { name: 'Florianópolis', lat: -27.6, lng: -48.55, km: 40 },
  { name: 'Fernando de Noronha', lat: -3.85, lng: -32.42, km: 20 },
  { name: 'Chapada dos Veadeiros', lat: -14.13, lng: -47.51, km: 60 },
  { name: 'Manaus', lat: -3.12, lng: -60.02, km: 150 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, km: 50 },
  { name: 'Brasília', lat: -15.79, lng: -47.88, km: 40 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38, km: 50 },
  { name: 'Colonia del Sacramento', lat: -34.47, lng: -57.84, km: 15 },
  { name: 'Montevideo', lat: -34.9, lng: -56.19, km: 40 },
  { name: 'Santiago', lat: -33.45, lng: -70.67, km: 50 },
  { name: 'Valparaíso', lat: -33.05, lng: -71.62, km: 30 },
  { name: 'Bariloche', lat: -41.13, lng: -71.31, km: 50 },
  { name: 'Cusco', lat: -13.53, lng: -71.97, km: 40 },
  { name: 'Machu Picchu', lat: -13.16, lng: -72.55, km: 30 },
  { name: 'San Pedro de Atacama', lat: -22.91, lng: -68.2, km: 100 },
  { name: 'El Calafate', lat: -50.34, lng: -72.26, km: 120 },
  { name: 'Uyuni', lat: -20.46, lng: -66.83, km: 120 },
  { name: 'Cartagena', lat: 10.39, lng: -75.51, km: 40 },
  { name: 'Mendoza', lat: -32.89, lng: -68.83, km: 60 },
];

/** "Belo Horizonte" inside BH, else the closest known trip city, else null (still counted as outside BH). */
export function knownCity(p: { lat: number; lng: number }) {
  if (isInBH(p)) return 'Belo Horizonte';
  let best: string | null = null;
  let bestRatio = 1;
  for (const c of CITIES) {
    const ratio = distanceM(p, c) / (c.km * 1000);
    if (ratio <= bestRatio) {
      best = c.name;
      bestRatio = ratio;
    }
  }
  return best;
}
