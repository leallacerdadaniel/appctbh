import '@/global.css';

/**
 * Chez Toi BH design tokens — light mode. v3 (owner, 2026-11-08): "mix do Airbnb com o Revolut":
 * cool gray canvas, white cards with large radius, bold Plus Jakarta Sans titles, photos as content, brand red for accents.
 * Rules and rationale: .claude/skills/ctbh-design-system (keep references/tokens.md in sync).
 */
export const Brand = {
  red: '#E80C20',
  redPressed: '#C70A1B',
  onRed: '#FFFFFF',
  /** The brand bar's gradient (owner, 2026-11-09: "um pouco de tom escuro"): brand red to a deep wine. */
  barGradient: ['#EE1427', '#D20B1E', '#8E0614'] as const,
} as const;

export const Colors = {
  light: {
    brand: Brand.red,
    brandPressed: Brand.redPressed,
    onBrand: Brand.onRed,
    onBrandMuted: 'rgba(255,255,255,0.82)',
    /** Control tracks on the red band (language switch). */
    onBrandTrack: 'rgba(255,255,255,0.22)',
    text: '#16161A',
    textSecondary: '#6B6B74',
    textTertiary: '#A3A3AD',
    /** Canvas behind every screen. */
    background: '#F2F2F5',
    /** Cards, search pill, tab bar. */
    surface: '#FFFFFF',
    fill: '#ECECF0',
    /** Dark layer under text on photos. */
    scrim: 'rgba(0,0,0,0.45)',
    star: '#F5B301',
    /** Must-go medal only. */
    gold: '#C9971C',
    line: '#ECECF0',
    /** Empty part of progress bars, on the canvas. */
    track: '#DCDCE3',
    error: '#B42318',
    errorSoft: '#FEF3F2',
    success: '#1F7A4D',
    successSoft: '#E6F5EC',
    /** Tinted circles behind list icons (Revolut-like). */
    brandSoft: '#FDEBEC',
    infoSoft: '#EEF1FB',
    info: '#3456C5',
    warningSoft: '#FFF4DB',
    warning: '#B54708',
    eventNational: '#7A5AF8',
    eventCity: '#DC6803',
    eventOptional: '#1570EF',
    eventCleaning: '#0E9384',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/**
 * v3 (2026-11-08): bold Plus Jakarta Sans for screen and section titles only; Inter for everything else.
 * (2026-10-16 "fontes grossas" was about body text: keep body light, never bold paragraphs.)
 */
export const Fonts = {
  display: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  /** Names and row titles in the v3 cards, numbers, buttons. */
  bodySemi: 'Inter_600SemiBold',
} as const;

/** Five sizes, nothing else. */
export const Type = {
  display: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
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
  lg: 20,
  /** Big cards: address card, checklist, hero sheet. */
  xl: 24,
  pill: 999,
} as const;

/** The only shadows of the app. */
export const Shadow = {
  card: { boxShadow: '0 2px 12px rgba(22, 22, 26, 0.05)' },
  /** The address card and other cards that sit over a color or photo. */
  raised: { boxShadow: '0 8px 24px rgba(22, 22, 26, 0.08)' },
  floating: { boxShadow: '0 6px 24px rgba(20, 20, 20, 0.12)' },
} as const;

/** Minimum tap target (Apple HIG: 44pt). */
export const TapTarget = 44;
export const MaxContentWidth = 560;
