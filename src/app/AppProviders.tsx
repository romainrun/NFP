import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from 'react-native-paper';
import { bootstrap } from '@/app/bootstrap';
import { AppThemeProvider } from '@/shared/theme/ThemeProvider';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import { RootNavigator } from '@/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function StatusBarBridge() {
  const theme = useTheme();
  return <StatusBar style={theme.dark ? 'light' : 'dark'} />;
}

type Props = {
  children?: ReactNode;
};

export function AppProviders({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await bootstrap();
        if (!mounted) return;
        setReady(true);
        setBootstrapping(false);
      } catch (error) {
        if (!mounted) return;
        setBootError(error instanceof Error ? error.message : 'Bootstrap failed');
        setBootstrapping(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setBootstrapping]);

  if (bootError) {
    return <LoadingOverlay label={`Erreur: ${bootError}`} />;
  }

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <LoadingOverlay label="Initialisation NFP…" />
          </AppThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <StatusBarBridge />
            {children ?? <RootNavigator />}
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
