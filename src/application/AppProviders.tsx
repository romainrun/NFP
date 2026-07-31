import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from 'react-native-paper';
import { bootstrap } from '@/application/bootstrap';
import { useAuthStore } from '@/features/authentication/presentation/store/authStore';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { appFontMap } from '@/shared/theme/loadFonts';
import { AppThemeProvider } from '@/shared/theme/ThemeProvider';

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

function AppSurface({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.appSurface, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );
}

type Props = {
  children?: ReactNode;
};

export function AppProviders({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);
  const [fontsLoaded, fontError] = useFonts(appFontMap);

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

  if (bootError || fontError) {
    return (
      <LoadingOverlay
        label={`Erreur: ${bootError ?? fontError?.message ?? 'Police'}`}
        variant="minimal"
      />
    );
  }

  if (!ready || !fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <AppSurface>
              <LoadingOverlay label="Initialisation NFP…" />
            </AppSurface>
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
            <AppSurface>
              <StatusBarBridge />
              {children ?? <RootNavigator />}
            </AppSurface>
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appSurface: {
    flex: 1,
  },
});
