/**
 * Inter — primary NFP typeface for payment UI clarity.
 * Font files loaded in AppProviders via expo-font.
 */
export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Aliases used across the app */
  display: 'Inter_700Bold',
  body: 'Inter_400Regular',
  mono: 'Inter_600SemiBold',
} as const;

export const typography = {
  brand: {
    fontFamily: fonts.bold,
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400' as const,
  },
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  money: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  pin: {
    fontFamily: fonts.semiBold,
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 8,
  },
};
