import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
  type MD3Theme,
} from 'react-native-paper';
import { darkColors, lightColors } from '@/shared/theme/colors';
import { fonts } from '@/shared/theme/typography';

const fontConfig = {
  fontFamily: fonts.body,
} as const;

export function createPaperTheme(mode: 'light' | 'dark'): MD3Theme {
  const base = mode === 'light' ? MD3LightTheme : MD3DarkTheme;
  const colors = mode === 'light' ? lightColors : darkColors;

  return {
    ...base,
    fonts: configureFonts({ config: fontConfig }),
    roundness: 16,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryMuted,
      secondary: colors.textSecondary,
      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceMuted,
      outline: colors.border,
      error: colors.danger,
      onBackground: colors.text,
      onSurface: colors.text,
      onSurfaceVariant: colors.textSecondary,
    },
  };
}
