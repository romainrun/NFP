/**
 * NFP visual language — pine ink + seafoam + gold signal.
 * Avoids purple gradients, cream/terracotta, and newspaper layouts.
 */
export const palette = {
  pine950: '#061A18',
  pine900: '#0A2E2A',
  pine800: '#0C3B36',
  pine700: '#0F524B',
  pine600: '#14756B',
  seafoam500: '#2BB8A8',
  seafoam300: '#7ED9CE',
  seafoam100: '#D7F4F0',
  seafoam50: '#EEF8F6',
  mist: '#E7F1EE',
  paper: '#F5FAF8',
  ivory: '#FBFEFD',
  ink: '#102A27',
  inkMuted: '#4A6B66',
  inkFaint: '#8AA39E',
  line: '#C9DED9',
  gold: '#C79212',
  goldSoft: '#F4E2A8',
  danger: '#C23B3B',
  warning: '#C47A12',
  success: '#1F8A5B',
  white: '#FFFFFF',
} as const;

export const lightColors = {
  background: palette.mist,
  surface: palette.ivory,
  surfaceMuted: palette.seafoam50,
  border: palette.line,
  text: palette.ink,
  textSecondary: palette.inkMuted,
  primary: palette.pine700,
  primaryMuted: palette.seafoam100,
  onPrimary: palette.white,
  accent: palette.gold,
  accentMuted: palette.goldSoft,
  danger: palette.danger,
  warning: palette.warning,
  success: palette.success,
  overlay: 'rgba(6, 26, 24, 0.48)',
  gradientTop: '#DCEFEA',
  gradientBottom: '#F5FAF8',
  heroInk: palette.pine900,
} as const;

export const darkColors = {
  background: palette.pine950,
  surface: palette.pine900,
  surfaceMuted: palette.pine800,
  border: '#1E4A44',
  text: '#ECF8F5',
  textSecondary: '#9EC4BD',
  primary: palette.seafoam500,
  primaryMuted: '#134842',
  onPrimary: palette.pine950,
  accent: '#E0B33A',
  accentMuted: '#5C4A14',
  danger: '#F07171',
  warning: '#F0B35A',
  success: '#4ADE9B',
  overlay: 'rgba(2, 12, 11, 0.64)',
  gradientTop: '#0A2E2A',
  gradientBottom: '#061A18',
  heroInk: '#ECF8F5',
} as const;

export type ThemeColors = typeof lightColors;
