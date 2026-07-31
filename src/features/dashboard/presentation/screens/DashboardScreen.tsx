import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import { MetricCard } from '@/features/dashboard/presentation/components/MetricCard';
import { SalesSparkBars } from '@/features/dashboard/presentation/components/SalesSparkBars';
import type { MainParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { brandGradient, Colors, darkColors, lightColors, shadows } from '@/shared/theme/colors';
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

  if (snapshotQuery.isLoading || !snapshotQuery.data) {
    return <LoadingOverlay label="Préparation du tableau de bord…" />;
  }

  const snapshot = snapshotQuery.data;
  const revenueToday = snapshot.metrics.find((m) => m.id === 'revenue_today');
  const secondaryMetrics = snapshot.metrics.filter((m) => m.id !== 'revenue_today');

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Tableau de bord"
          subtitle={`Bonjour, ${session?.employee.displayName ?? ''}`}
        />

        <Animated.View entering={FadeInDown.duration(420)}>
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            <Text style={[typography.caption, { color: Colors.white, opacity: 0.9 }]}>
              CA de la journée
            </Text>
            <Text style={[typography.amount, { color: Colors.white, marginTop: 2 }]}>
              {revenueToday?.value ?? '0,00 €'}
            </Text>
            <Text style={[typography.caption, { color: Colors.white, opacity: 0.85 }]}>
              {revenueToday?.deltaLabel ?? ''}
            </Text>
            <View style={styles.heroActions}>
              <Button
                mode="contained"
                buttonColor={Colors.white}
                textColor={Colors.primaryDark}
                onPress={() => navigation.navigate('Pos')}
                contentStyle={{ minHeight: 48 }}
                labelStyle={typography.button}
              >
                Ouvrir la caisse
              </Button>
              <Button
                mode="outlined"
                textColor={Colors.white}
                style={{ borderColor: Colors.white }}
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
          {secondaryMetrics.map((metric) => (
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
              shadows.sm,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
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

            <Text style={[typography.h3, { color: tokens.text, marginTop: spacing.lg }]}>
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
  logo: {
    width: 112,
    height: 58,
    marginBottom: spacing.xs,
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
