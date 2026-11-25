/** Spacing, radii and type scale shared by every screen. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { card: 16, hero: 24, input: 12, pill: 999 } as const;

/** Colour roles of the dark theme. A light theme later only needs another table with the same names. */
export const palette = {
  bg: '#121212',
  card: '#1E1E1E',
  cardHigh: '#2A2A2A',
  border: '#333333',
  text: '#F5F5F2',
  muted: '#A8A8A4',
  /** Hero cards and main buttons. */
  brand: '#2E6B46',
  /** Green used for text, links and rings on dark surfaces. */
  brandBright: '#7CC68F',
  /** The highlight colour: active tab and accents. */
  coral: '#F26B4F',
  /** Third ring colour. */
  info: '#8FB8FF',
  warning: '#F0A64A',
  danger: '#FF7B7B',
  onBrand: '#FFFFFF',
} as const;

/** Font families. Loaded in the root layout; the system font is used until they are ready. */
export const fonts = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  heading: { fontFamily: fonts.semibold, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 16 },
  small: { fontFamily: fonts.body, fontSize: 13 },
  number: { fontFamily: fonts.bold, fontSize: 26, fontVariant: ['tabular-nums'] as const },
} as const;

/**
 * Old names kept so screens that are not restyled yet keep compiling; each stage of the refresh moves screens
 * onto the role names above, and the last stage removes these.
 */
export const colors = {
  ...palette,
  background: palette.bg,
  surface: palette.card,
  primary: palette.brand,
} as const;
