import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { createPaperTheme } from '@/shared/theme/paperTheme';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: Props) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.themePreference);

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const theme = createPaperTheme(resolved);

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
