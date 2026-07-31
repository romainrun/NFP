import type { ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { createPaperTheme } from '@/shared/theme/paperTheme';

type Props = {
  children: ReactNode;
};

/**
 * NFP brand is light-first (white / warm paper + gold).
 * Dark system preference is ignored to keep payment UI consistent with the site.
 */
export function AppThemeProvider({ children }: Props) {
  const theme = createPaperTheme('light');
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
