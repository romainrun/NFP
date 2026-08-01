import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import { EmployeeNotesPanel } from '@/features/dashboard/presentation/components/EmployeeNotesPanel';
import { MetricCard } from '@/features/dashboard/presentation/components/MetricCard';
import { SalesSparkBars } from '@/features/dashboard/presentation/components/SalesSparkBars';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import { SyncStatusCard } from '@/features/settings/presentation/components/SyncStatusCard';
import { useSyncSummary } from '@/features/settings/presentation/hooks/useSyncSummary';
import { runSyncNow } from '@/features/sync/services/syncCoordinator';
import {
  defaultDashboardWidgets,
  type DashboardWidgetId,
} from '@/features/settings/domain/types';
import type { MainParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { BrandHero } from '@/shared/components/BrandHero';
import { QueryErrorPanel } from '@/shared/components/QueryErrorPanel';
import { Screen } from '@/shared/components/Screen';
import { DashboardSkeleton } from '@/shared/components/skeletons';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { BRAND } from '@/shared/theme/brand';
import { Colors, darkColors, lightColors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const logoSource = require('../../../../../assets/logo.png');

export function DashboardScreen() {
  const theme = useTheme();
  const tokens = theme.dark ? darkColors : lightColors;
  const navigation = useNavigation<NativeStackNavigationProp<MainParamList>>();
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

  const settingsQuery = useQuery({
    queryKey: ['settings', 'dashboard-widgets'],
    queryFn: async () => {
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const result = await repo.getSettings();
      if (!result.ok) throw result.error;
      return result.value.dashboardWidgets;
    },
  });

  const syncSummaryQuery = useSyncSummary();
  const syncMutation = useMutation({
    mutationFn: () => runSyncNow(),
    onSuccess: () => {
      void syncSummaryQuery.refetch();
    },
  });

  if (snapshotQuery.isError) {
    return (
      <QueryErrorPanel
        onRetry={() => {
          void snapshotQuery.refetch();
        }}
      />
    );
  }

  if (snapshotQuery.isLoading || !snapshotQuery.data) {
    return (
      <Screen padded={false}>
        <DashboardSkeleton />
      </Screen>
    );
  }

  const snapshot = snapshotQuery.data;
  const enabledWidgets = new Set(
    (settingsQuery.data ?? defaultDashboardWidgets())
      .filter((widget) => widget.isEnabled)
      .map((widget) => widget.id),
  );
  const isWidgetEnabled = (id: DashboardWidgetId) => enabledWidgets.has(id);
  const revenueToday = isWidgetEnabled('revenue_today')
    ? snapshot.metrics.find((m) => m.id === 'revenue_today')
    : undefined;
  const secondaryMetrics = snapshot.metrics.filter(
    (metric) =>
      metric.id !== 'revenue_today' &&
      isWidgetEnabled(metric.id as DashboardWidgetId),
  );
  const showSalesChart = isWidgetEnabled('sales_chart');
  const showTopProducts = isWidgetEnabled('top_products');
  const showStockAlerts = isWidgetEnabled('stock_alerts');
  const showTeamNotes = isWidgetEnabled('team_notes');
  const showSidePanel = showTopProducts || showStockAlerts;

  return (
    <Screen padded={false} atmosphere>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Tableau de bord"
          subtitle={`Bonjour, ${session?.employee.displayName ?? ''}`}
          showBrandMark
        />

        {syncSummaryQuery.data ? (
          <SyncStatusCard
            summary={syncSummaryQuery.data}
            onSync={() => syncMutation.mutate()}
            syncing={syncMutation.isPending}
          />
        ) : null}

        {revenueToday ? (
          <Animated.View entering={FadeInDown.duration(420)}>
            <BrandHero
              eyebrow="CA de la journée"
              title={revenueToday.value}
              subtitle={revenueToday.deltaLabel ?? BRAND.tagline}
              logoSource={logoSource}
            >
              <View style={styles.heroActions}>
                <Button
                  mode="contained"
                  buttonColor={Colors.white}
                  textColor={Colors.primaryDark}
                  onPress={() => navigation.navigate('Pos')}
                  contentStyle={{ minHeight: 48 }}
                  labelStyle={typography.button}
                  style={styles.heroCta}
                >
                  Ouvrir la caisse
                </Button>
                <Button
                  mode="contained"
                  buttonColor={Colors.black}
                  textColor={Colors.white}
                  onPress={() => navigation.navigate('SalesHistory')}
                  contentStyle={{ minHeight: 48 }}
                  labelStyle={typography.button}
                  style={styles.heroCta}
                >
                  Voir l’historique
                </Button>
              </View>
            </BrandHero>
          </Animated.View>
        ) : null}

        {secondaryMetrics.length ? (
          <Animated.View
            entering={FadeInUp.delay(80).duration(400)}
            style={[styles.metrics, useSplitLayout && styles.metricsTablet]}
          >
            {secondaryMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </Animated.View>
        ) : null}

        {showTeamNotes && session?.employee.id ? (
          <Animated.View entering={FadeInUp.delay(120).duration(400)}>
            <EmployeeNotesPanel userId={session.employee.id} />
          </Animated.View>
        ) : null}

        <View style={[styles.lower, useSplitLayout && styles.lowerTablet]}>
          {showSalesChart ? (
            <View style={{ flex: 1.4 }}>
              <SalesSparkBars points={snapshot.salesPerHour} />
            </View>
          ) : null}

          {showSidePanel ? (
            <View
              style={[
                styles.sidePanel,
                shadows.sm,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
            >
              {showTopProducts ? (
                <>
                  <Text style={[typography.h3, { color: tokens.text }]}>Top produits</Text>
                  {snapshot.topProducts.length === 0 ? (
                    <Text style={[typography.caption, { color: tokens.textSecondary }]}>
                      Aucune vente aujourd’hui
                    </Text>
                  ) : (
                    snapshot.topProducts.map((product) => (
                      <Pressable key={product.id} style={styles.productRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.bodyStrong, { color: tokens.text }]}>
                            {product.name}
                          </Text>
                          <Text style={[typography.caption, { color: tokens.textSecondary }]}>
                            {product.quantitySold} vendus
                          </Text>
                        </View>
                        <Text style={[typography.money, { color: Colors.primary }]}>
                          {product.revenueLabel}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </>
              ) : null}

              {showStockAlerts ? (
                <>
                  <Text
                    style={[
                      typography.h3,
                      { color: tokens.text, marginTop: showTopProducts ? spacing.lg : 0 },
                    ]}
                  >
                    Alertes stock
                  </Text>
                  {snapshot.inventoryAlerts.length === 0 ? (
                    <Text style={[typography.caption, { color: tokens.textSecondary }]}>
                      Stock OK
                    </Text>
                  ) : (
                    snapshot.inventoryAlerts.map((alert) => (
                      <Text
                        key={alert}
                        style={[typography.caption, { color: Colors.error, marginTop: spacing.xs }]}
                      >
                        {alert}
                      </Text>
                    ))
                  )}
                </>
              ) : null}
            </View>
          ) : null}
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
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroCta: {
    borderRadius: radii.button,
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
    borderRadius: radii.card,
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
