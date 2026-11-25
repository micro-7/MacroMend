import { StyleSheet, Text, type TextProps } from 'react-native';
import { fonts, palette, type as typeScale } from './theme';

export interface Piece {
  text: string;
  italic: boolean;
}

/** Split "Not sure *what* to *eat* next?" into plain and italic pieces. An unmatched star stays as plain text. */
export function splitEmphasis(text: string): Piece[] {
  const parts = text.split('*');
  if (parts.length % 2 === 0) return [{ text, italic: false }];
  return parts.map((t, i) => ({ text: t, italic: i % 2 === 1 })).filter((p) => p.text !== '');
}

/** A headline in the serif display font; words between *stars* are set in italic. */
export function Title({ children, size = 'title', style, ...rest }: { children: string; size?: 'hero' | 'title' } & TextProps) {
  const base = typeScale[size];
  const plain = children.replace(/\*/g, '');
  return (
    <Text accessibilityRole="header" accessibilityLabel={plain} style={[styles.text, base, style]} {...rest}>
      {splitEmphasis(children).map((p, i) => (
        <Text key={i} style={{ fontFamily: p.italic ? fonts.displayItalic : fonts.display }}>
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({ text: { color: palette.text } });
