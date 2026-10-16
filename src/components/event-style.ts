import type { ThemeColors } from '@/constants/theme';
import type { EventKind } from '@/lib/events';

export const eventKinds: EventKind[] = ['national', 'city', 'optional', 'cleaning', 'contract'];

export function eventColor(theme: ThemeColors, kind: EventKind) {
  switch (kind) {
    case 'national':
      return theme.brand;
    case 'city':
      return theme.eventCity;
    case 'optional':
      return theme.eventOptional;
    case 'cleaning':
      return theme.eventCleaning;
    case 'contract':
      return theme.text;
  }
}

/** 6‑digit hex + alpha → soft badge background. */
export function soft(hex: string) {
  return `${hex}1F`;
}
