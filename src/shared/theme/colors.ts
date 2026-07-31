/**
 * NFP design tokens — slate neutrals + teal accent (POS / Stripe-inspired).
 * Avoids common AI purple/cream defaults.
 */
export const palette = {
  teal50: '#F0FDFA',
  teal100: '#CCFBF1',
  teal500: '#14B8A6',
  teal600: '#0D9488',
  teal700: '#0F766E',
  teal800: '#115E59',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
  white: '#FFFFFF',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#059669',
} as const;

export const lightColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceMuted: palette.slate100,
  border: palette.slate200,
  text: palette.slate900,
  textSecondary: palette.slate500,
  primary: palette.teal700,
  primaryMuted: palette.teal50,
  onPrimary: palette.white,
  danger: palette.danger,
  warning: palette.warning,
  success: palette.success,
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const darkColors = {
  background: palette.slate950,
  surface: palette.slate900,
  surfaceMuted: palette.slate800,
  border: palette.slate700,
  text: palette.slate50,
  textSecondary: palette.slate400,
  primary: palette.teal500,
  primaryMuted: palette.teal800,
  onPrimary: palette.slate950,
  danger: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  overlay: 'rgba(2, 6, 23, 0.6)',
} as const;

export type ThemeColors = typeof lightColors;
