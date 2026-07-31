import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import { useIdleLogout } from '@/shared/hooks/useIdleLogout';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';

export function RootNavigator() {
  const paperTheme = useTheme();
  const session = useAuthStore((s) => s.session);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useIdleLogout();

  const navTheme = {
    ...(paperTheme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(paperTheme.dark ? DarkTheme.colors : DefaultTheme.colors),
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      primary: paperTheme.colors.primary,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
    },
  };

  if (isBootstrapping) {
    return <LoadingOverlay label="Démarrage NFP…" />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
