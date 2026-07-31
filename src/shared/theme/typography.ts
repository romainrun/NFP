import { Platform } from 'react-native';

/**
 * Expressive stacks — serif display for brand presence, clean body for POS density.
 */
export const fonts = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }) as string,
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
};

export const typography = {
  brand: {
    fontFamily: fonts.display,
    fontSize: 44,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  pin: {
    fontFamily: fonts.mono,
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 8,
  },
  money: {
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: '700' as const,
  },
};
