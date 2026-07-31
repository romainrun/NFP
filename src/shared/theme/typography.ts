import { Colors } from '@/shared/theme/colors';

/**
 * Montserrat — Naturally Forme website (nf.tikilote.re).
 */
export const fonts = {
  light: 'Montserrat_300Light',
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  display: 'Montserrat_700Bold',
  body: 'Montserrat_400Regular',
  mono: 'Montserrat_600SemiBold',
} as const;

export const FontFamily = {
  light: fonts.light,
  regular: fonts.regular,
  medium: fonts.medium,
  semiBold: fonts.semiBold,
  bold: fonts.bold,
} as const;

export const Typography = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 17,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.text,
  },
} as const;

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
    color: Colors.text,
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
  tagline: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: Colors.primaryDark,
  },
};
