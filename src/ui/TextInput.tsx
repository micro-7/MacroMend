import { TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { fonts, palette } from './theme';

/** Every text field in the app: Inter, light text and a readable placeholder colour on the dark background. */
export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput placeholderTextColor={palette.muted} selectionColor={palette.brandBright} {...rest} style={[{ fontFamily: fonts.body }, style]} />;
}
