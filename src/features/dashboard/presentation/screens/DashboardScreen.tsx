import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import { MetricCard } from '@/features/dashboard/presentation/components/MetricCard';
import { SalesSparkBars } from '@/features/dashboard/presentation/components/SalesSparkBars';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { AppStackParamList } from '@/navigation/types';
import { Screen } from '@/shared/components/Screen';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { APP_CONFIG } from '@/core/config/appConfig';

export function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { session, logout } = useAuth();
  const { useSplitLayout } = useResponsiveLayout();

  const snapshotQuery = useQuery({
    queryKey: ['dashboard', 'snapshot'],
    queryFn: async () => {
      const repo = container.resolve<IDashboardRepository>(TOKENS.DashboardRepository);
      const result = await repo.getSnapshot();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  if (snapshotQuery.isLoading || !snapshotQuery.data) {
    return <LoadingOverlay label="Préparation du tableau de bord…" />;
  }

  const snapshot = snapshotQuery.data;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.brand, { color: theme.colors.primary, fontSize: 32 }]}>
              {APP_CONFIG.shortName}
            </Text>
            <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
              Bonjour, {session?.employee.displayName}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
              Caisse · catalogue · encaissement offline
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Pos')}
              style={styles.logout}
            >
              Caisse
            </Button>
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('ProductList')}
              style={styles.logout}
            >
              Articles
            </Button>
            <Button mode="outlined" onPress={() => void logout()} style={styles.logout}>
              Verrouiller
            </Button>
          </View>
        </View>

        <View style={[styles.metrics, useSplitLayout && styles.metricsTablet]}>
          {snapshot.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </View>

        <View style={[styles.lower, useSplitLayout && styles.lowerTablet]}>
          <View style={{ flex: 1.4 }}>
            <SalesSparkBars points={snapshot.salesPerHour} />
          </View>

          <View
            style={[
              styles.sidePanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
              Top produits
            </Text>
            {snapshot.topProducts.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                    {product.name}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {product.quantitySold} vendus
                  </Text>
                </View>
                <Text style={[typography.bodyStrong, { color: theme.colors.primary }]}>
                  {product.revenueLabel}
                </Text>
              </View>
            ))}

            <Text
              style={[
                typography.h3,
                { color: theme.colors.onSurface, marginTop: spacing.lg },
              ]}
            >
              Alertes stock
            </Text>
            {snapshot.inventoryAlerts.map((alert) => (
              <Text
                key={alert}
                style={{ color: theme.colors.error, marginTop: spacing.xs }}
              >
                {alert}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  logout: {
    minHeight: 48,
    justifyContent: 'center',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricsTablet: {
    flexWrap: 'nowrap',
  },
  lower: {
    gap: spacing.md,
  },
  lowerTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sidePanel: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
