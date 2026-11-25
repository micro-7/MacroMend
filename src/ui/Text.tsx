import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts } from './theme';

/** The Inter font file that matches a CSS-style weight (custom fonts need one file per weight on Android). */
export function familyForWeight(weight: TextStyle['fontWeight']): string {
  switch (weight) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return fonts.bold;
    case '600':
      return fonts.semibold;
    case '500':
      return fonts.medium;
    default:
      return fonts.body;
  }
}

/** Every piece of text in the app: Inter by default, with `fontWeight` mapped to the right font file. */
export function Text({ style, ...rest }: TextProps) {
  const { fontWeight, fontFamily, ...flat } = StyleSheet.flatten(style) ?? {};
  return <RNText {...rest} style={[flat, { fontFamily: fontFamily ?? familyForWeight(fontWeight) }]} />;
}
