import { Platform } from 'react-native';

/**
 * Expressive stacks: SF Pro on iOS, system UI / sans on Android.
 * Avoid Inter/Roboto as explicit defaults.
 */
export const fonts = {
  display: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
  body: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif',
    default: 'System',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
};

export const typography = {
  brand: { fontFamily: fonts.display, fontSize: 40, fontWeight: '700' as const, letterSpacing: -1 },
  h1: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display, fontSize: 22, fontWeight: '600' as const },
  h3: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600' as const },
  body: { fontFamily: fonts.body, fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600' as const },
  caption: { fontFamily: fonts.body, fontSize: 13, fontWeight: '500' as const },
  pin: { fontFamily: fonts.mono, fontSize: 28, fontWeight: '600' as const, letterSpacing: 8 },
};
