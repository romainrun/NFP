import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import { MetricCard } from '@/features/dashboard/presentation/components/MetricCard';
import { SalesSparkBars } from '@/features/dashboard/presentation/components/SalesSparkBars';
import type { DrawerParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { darkColors, lightColors, palette } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function DashboardScreen() {
  const theme = useTheme();
  const tokens = theme.dark ? darkColors : lightColors;
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { session } = useAuth();
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
        <AppHeader
          title="Tableau de bord"
          subtitle={`Bonjour, ${session?.employee.displayName ?? ''}`}
        />

        <Animated.View entering={FadeInDown.duration(420)}>
          <LinearGradient
            colors={[tokens.heroInk, tokens.primary, palette.seafoam500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={[typography.brand, { color: tokens.onPrimary, fontSize: 42 }]}>
              {APP_CONFIG.shortName}
            </Text>
            <Text style={{ color: tokens.onPrimary, opacity: 0.9, marginTop: spacing.xs }}>
              Caisse offline · NaturallyForme
            </Text>
            <View style={styles.heroActions}>
              <Button
                mode="contained"
                buttonColor={tokens.accent}
                textColor={palette.ink}
                onPress={() => navigation.navigate('Pos')}
                contentStyle={{ minHeight: 48 }}
              >
                Ouvrir la caisse
              </Button>
              <Button
                mode="outlined"
                textColor={tokens.onPrimary}
                style={{ borderColor: tokens.onPrimary }}
                onPress={() => navigation.navigate('SalesHistory')}
              >
                Historique
              </Button>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(80).duration(400)}
          style={[styles.metrics, useSplitLayout && styles.metricsTablet]}
        >
          {snapshot.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </Animated.View>

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
              <Pressable key={product.id} style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                    {product.name}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {product.quantitySold} vendus
                  </Text>
                </View>
                <Text style={[typography.money, { color: theme.colors.primary }]}>
                  {product.revenueLabel}
                </Text>
              </Pressable>
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
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
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
    borderRadius: radii.lg,
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
