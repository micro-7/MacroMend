import { fonts, palette } from './theme';

/** Header look shared by every stack: dark bar, light title, green back arrow, no shadow. */
export const darkHeader = {
  headerTintColor: palette.brandBright,
  headerStyle: { backgroundColor: palette.bg },
  headerTitleStyle: { color: palette.text, fontFamily: fonts.semibold },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: palette.bg },
} as const;
