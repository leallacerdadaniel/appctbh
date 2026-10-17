import data from '@/data/restaurants.json';
import type { Lang } from '@/i18n';
import { formatTime } from '@/lib/format';
import { restaurantContent, type RestaurantContent } from '@/lib/restaurants-content';

/**
 * Recommended restaurants: chosen by the team for quality, not distance.
 * Google facts from scripts/restaurants.py + team content from restaurants-content.ts.
 * Distance is from the demo apartment; later it comes per student from Supabase.
 */

export type Tier = 'occasion' | 'everyday';

/** Google opening period. day: 0 = Sunday. time: "HHMM". No close = open 24h. */
export type Period = { open: { day: number; time: string }; close?: { day: number; time: string } | null };

type RestaurantFacts = {
  id: string;
  name: string;
  tier: Tier;
  top100: number | null;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  placeId: string;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: number | null;
  hours: Period[];
  phone: string | null;
  website: string | null;
  distanceM?: number;
  walkMin?: number;
  driveMin?: number;
};

export type Restaurant = RestaurantFacts & Omit<RestaurantContent, 'priceLevel'>;

const facts = (data as { origin: { lat: number; lng: number }; restaurants: RestaurantFacts[] }).restaurants;

export const restaurants: Restaurant[] = facts
  .filter((f) => restaurantContent[f.id])
  .map((f) => {
    const content = restaurantContent[f.id];
    return { ...f, ...content, priceLevel: f.priceLevel ?? content.priceLevel ?? null };
  });

export function getRestaurant(id: string) {
  return restaurants.find((r) => r.id === id);
}

export function mapsUrl(r: Restaurant) {
  const params = new URLSearchParams({ api: '1', query: r.name, query_place_id: r.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}

/** Google's names carry SEO tails ("Casa Calixto: Restaurante, Drinks, …"). */
export function displayName(r: Restaurant) {
  return r.name.split(/:| \| | - /)[0].trim();
}

/* ---------- Opening hours ---------- */

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));
const toClock = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;

/** Ranges for one weekday (0 = Sunday), e.g. ["12h00–15h00", "19h00–23h30"]. Empty = closed. */
export function hoursFor(r: { hours: Period[] }, day: number, lang: Lang): string[] {
  if (r.hours.length === 1 && !r.hours[0].close) return ['24h/24'];
  return r.hours
    .filter((p) => p.open.day === day)
    .sort((a, b) => toMinutes(a.open.time) - toMinutes(b.open.time))
    .map((p) => {
      const open = formatTime(toClock(p.open.time), lang);
      return p.close ? `${open}–${formatTime(toClock(p.close.time), lang)}` : open;
    });
}

/** Open right now? Uses the device clock, which is Brasília time for students in BH. */
export function isOpenNow(r: { hours: Period[] }, now = new Date()) {
  if (!r.hours.length) return null;
  if (r.hours.length === 1 && !r.hours[0].close) return true;
  const week = 7 * 24 * 60;
  const t = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  return r.hours.some((p) => {
    if (!p.close) return false;
    const start = p.open.day * 24 * 60 + toMinutes(p.open.time);
    let end = p.close.day * 24 * 60 + toMinutes(p.close.time);
    if (end <= start) end += week; // closes after Saturday midnight
    return (t >= start && t < end) || (t + week >= start && t + week < end);
  });
}
