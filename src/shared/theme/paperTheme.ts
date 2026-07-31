import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
  type MD3Theme,
} from 'react-native-paper';
import { darkColors, lightColors } from '@/shared/theme/colors';
import { fonts } from '@/shared/theme/typography';

export function createPaperTheme(mode: 'light' | 'dark' = 'light'): MD3Theme {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const baseTheme = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return {
    ...baseTheme,
    dark: mode === 'dark',
    fonts: configureFonts({
      config: {
        fontFamily: fonts.regular,
      },
    }),
    roundness: 14,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryMuted,
      onPrimaryContainer: colors.text,
      secondary: colors.accent,
      onSecondary: colors.onPrimary,
      secondaryContainer: colors.accentMuted,
      tertiary: colors.accent,
      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceMuted,
      outline: colors.border,
      error: colors.danger,
      onBackground: colors.text,
      onSurface: colors.text,
      onSurfaceVariant: colors.textSecondary,
      elevation: {
        ...baseTheme.colors.elevation,
        level0: 'transparent',
        level1: colors.surface,
        level2: colors.surfaceMuted,
        level3: colors.surfaceMuted,
        level4: colors.surface,
        level5: colors.surface,
      },
    },
  };
}
