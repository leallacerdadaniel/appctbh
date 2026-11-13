import type { ThemeColors } from '@/constants/theme';
import type { EventKind } from '@/lib/events';

/** The Agenda's filter chips, in this order: holidays, the house, then the community. */
export const eventKinds: EventKind[] = ['national', 'city', 'optional', 'cleaning', 'contract', 'chezToi', 'trip'];

export function eventColor(theme: ThemeColors, kind: EventKind) {
  switch (kind) {
    case 'national':
      return theme.eventNational;
    case 'city':
      return theme.eventCity;
    case 'optional':
      return theme.eventOptional;
    case 'cleaning':
      return theme.eventCleaning;
    case 'contract':
      return theme.text;
    // The team's own events carry the brand: a small red accent (dot and label), in the contrast-safe red.
    case 'chezToi':
      return theme.brandText;
    case 'trip':
      return theme.eventTrip;
  }
}

/** 6‑digit hex + alpha → soft badge background. */
export function soft(hex: string) {
  return `${hex}1F`;
}
