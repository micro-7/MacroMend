// Each font is imported from its own folder: the package index would bundle every weight of Inter (about 5 MB).
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

/** The fonts are bundled in the app, so loading never needs the internet. Waiting longer than this shows the app in the system font. */
export const FONT_TIMEOUT_MS = 3000;

/** True when the fonts are ready, or when loading failed or took too long (the system font is used then). */
export function useAppFonts(timeoutMs: number = FONT_TIMEOUT_MS): boolean {
  const [loaded, error] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs]);
  return loaded || !!error || timedOut;
}
