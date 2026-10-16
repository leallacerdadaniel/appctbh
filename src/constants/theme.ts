import '@/global.css';

/**
 * Chez Toi BH design tokens.
 * Brand red comes from the main logo (red tile). Use it sparingly:
 * identity, primary action and active tab — never for errors.
 */
export const Brand = {
  red: '#E80C20',
  redPressed: '#C70A1B',
  onRed: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    brand: Brand.red,
    brandSoft: '#FDE8EA',
    onBrand: Brand.onRed,
    text: '#18181B',
    textSecondary: '#71717A',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    line: '#E4E4E7',
    error: '#B42318',
    errorSoft: '#FEF3F2',
    success: '#067647',
    successSoft: '#ECFDF3',
    eventCity: '#DC6803',
    eventOptional: '#1570EF',
    eventCleaning: '#0E9384',
  },
  dark: {
    brand: '#FF3346',
    brandSoft: '#3A1418',
    onBrand: Brand.onRed,
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    background: '#0B0B0C',
    surface: '#18181B',
    line: '#27272A',
    error: '#F97066',
    errorSoft: '#3B1512',
    success: '#47CD89',
    successSoft: '#0E2A1D',
    eventCity: '#FDB022',
    eventOptional: '#53B1FD',
    eventCleaning: '#2ED3B7',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Fonts = {
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/** Short type scale: 4 sizes. */
export const Type = {
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: Fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** Minimum tap target (Apple HIG: 44pt). */
export const TapTarget = 44;
export const MaxContentWidth = 560;
