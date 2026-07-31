import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import { createPaperTheme } from '@/shared/theme/paperTheme';

type Props = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: Props) {
  const preference = useSettingsStore((s) => s.themePreference);
  const systemScheme = useColorScheme();
  const mode =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;
  const theme = createPaperTheme(mode);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
