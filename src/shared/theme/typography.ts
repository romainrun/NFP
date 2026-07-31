/**
 * Inter — single typeface for NFP (loaded via expo-font).
 * Expo font keys use Inter_700Bold form; Typography mirrors the design system.
 */
export const fonts = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Inter_700Bold',
  body: 'Inter_400Regular',
  mono: 'Inter_600SemiBold',
} as const;

/** Alias matching design-system naming (Inter-Bold → loaded key). */
export const FontFamily = {
  light: fonts.light,
  regular: fonts.regular,
  medium: fonts.medium,
  semiBold: fonts.semiBold,
  bold: fonts.bold,
} as const;

/** Design-system Typography (Naturally Forme). */
export const Typography = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: '#222222',
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: '#222222',
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#222222',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    fontWeight: '500' as const,
    color: '#666666',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    color: '#222222',
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#666666',
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
    color: '#222222',
  },
} as const;

/** App-wide style aliases (keeps existing screen imports working). */
export const typography = {
  brand: { ...Typography.amount, fontSize: 36 },
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  subtitle: Typography.subtitle,
  body: Typography.body,
  bodyStrong: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#222222',
  },
  caption: Typography.caption,
  button: Typography.button,
  amount: Typography.amount,
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
