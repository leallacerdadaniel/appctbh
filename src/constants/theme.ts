import '@/global.css';

/**
 * Chez Toi BH design tokens — light mode, DUO Gourmet-inspired (red brand bar, gray canvas, white cards).
 * Rules and rationale: .claude/skills/ctbh-design-system (keep references/tokens.md in sync).
 */
export const Brand = {
  red: '#E80C20',
  redPressed: '#C70A1B',
  onRed: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    brand: Brand.red,
    brandPressed: Brand.redPressed,
    onBrand: Brand.onRed,
    onBrandMuted: 'rgba(255,255,255,0.82)',
    /** Control tracks on the red band (language switch). */
    onBrandTrack: 'rgba(255,255,255,0.22)',
    text: '#141414',
    textSecondary: '#6B6A67',
    textTertiary: '#A09E99',
    /** Canvas behind every screen. */
    background: '#F4F4F2',
    /** Cards, search pill, tab bar. */
    surface: '#FFFFFF',
    fill: '#EFEEEA',
    /** Dark layer under text on photos. */
    scrim: 'rgba(0,0,0,0.45)',
    star: '#F5B301',
    /** Must-go medal only. */
    gold: '#C9971C',
    line: '#E9E7E3',
    error: '#B42318',
    errorSoft: '#FEF3F2',
    success: '#1F7A4D',
    successSoft: '#ECFDF3',
    warning: '#B54708',
    eventNational: '#7A5AF8',
    eventCity: '#DC6803',
    eventOptional: '#1570EF',
    eventCleaning: '#0E9384',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/** Light weights only (owner asked twice on 2026-10-16: "fontes grandes e grossas" → clean). */
export const Fonts = {
  display: 'Outfit_400Regular',
  body: 'Inter_400Regular',
  /** Emphasis: names, row titles, buttons. Never heavier than this. */
  bodyMedium: 'Inter_500Medium',
} as const;

/** Five sizes, nothing else. */
export const Type = {
  display: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  title: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 16 },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Screen side padding. */
  gutter: 20,
  /** Space between sections. */
  section: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 16,
  pill: 999,
} as const;

/** The only shadows of the app. */
export const Shadow = {
  card: { boxShadow: '0 2px 12px rgba(20, 20, 20, 0.06)' },
  floating: { boxShadow: '0 6px 24px rgba(20, 20, 20, 0.12)' },
} as const;

/** Minimum tap target (Apple HIG: 44pt). */
export const TapTarget = 44;
export const MaxContentWidth = 560;
