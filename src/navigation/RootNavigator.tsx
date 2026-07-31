import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import { useIdleLogout } from '@/shared/hooks/useIdleLogout';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Colors } from '@/shared/theme/colors';

export function RootNavigator() {
  const paperTheme = useTheme();
  const session = useAuthStore((s) => s.session);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  useIdleLogout();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.background,
      card: Colors.surface,
      primary: Colors.primary,
      text: Colors.text,
      border: Colors.border,
      notification: paperTheme.colors.error,
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
