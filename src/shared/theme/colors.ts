/**
 * Naturally Forme / NFP design tokens (site 2026).
 */
export const Colors = {
  primary: '#C9A457',
  primaryDark: '#B88E3A',
  primaryPressed: '#9F7B30',
  primaryLight: '#E7D3A2',

  background: '#F8F6F2',
  backgroundSecondary: '#FAF8F5',
  section: '#F4F1EB',

  surface: '#FFFFFF',

  text: '#222222',
  textSecondary: '#666666',
  textDisabled: '#9A9A9A',
  onPrimary: '#FFFFFF',

  border: '#E7E2D8',
  divider: '#EFEAE2',

  success: '#3CB371',
  error: '#E74C3C',
  warning: '#F39C12',
  info: '#3A86FF',

  iconActive: '#C9A457',
  iconInactive: '#888888',

  white: '#FFFFFF',
  black: '#181818',
} as const;

/** Semantic aliases used by Paper / screens. */
export const lightColors = {
  background: Colors.background,
  surface: Colors.surface,
  surfaceMuted: Colors.section,
  border: Colors.border,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  primary: Colors.primary,
  primaryMuted: Colors.primaryLight,
  onPrimary: Colors.onPrimary,
  accent: Colors.primaryDark,
  accentMuted: Colors.primaryLight,
  danger: Colors.error,
  warning: Colors.warning,
  success: Colors.success,
  info: Colors.info,
  overlay: 'rgba(34, 34, 34, 0.35)',
  gradientTop: Colors.primaryLight,
  gradientBottom: Colors.background,
  heroInk: Colors.primaryDark,
} as const;

/** Soft dark variant — brand stays gold-forward. */
export const darkColors = {
  background: '#1A1814',
  surface: '#24211C',
  surfaceMuted: '#2E2A24',
  border: '#3D3830',
  text: '#F5F2EC',
  textSecondary: '#B8B2A6',
  primary: Colors.primary,
  primaryMuted: '#4A3F24',
  onPrimary: Colors.black,
  accent: Colors.primaryLight,
  accentMuted: '#3A3424',
  danger: '#F07171',
  warning: '#F0B35A',
  success: '#5DCE8F',
  info: '#6BA3FF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  gradientTop: '#2E2A24',
  gradientBottom: '#1A1814',
  heroInk: Colors.primaryDark,
} as const;

export type ThemeColors = typeof lightColors;

/** @deprecated Prefer Colors */
export const palette = {
  gold: Colors.primary,
  goldHover: Colors.primaryDark,
  goldLight: Colors.primaryLight,
  goldPressed: Colors.primaryPressed,
  pine700: Colors.primary,
  seafoam500: Colors.primaryLight,
  ink: Colors.text,
  white: Colors.white,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 12,
  },
} as const;

export const brandGradient = ['#E7D3A2', '#C9A457', '#B88E3A'] as const;
