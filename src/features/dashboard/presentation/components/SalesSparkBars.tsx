import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { HourlySalePoint } from '@/features/dashboard/domain/types';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  points: HourlySalePoint[];
};

/**
 * Lightweight bar sparkline without pulling chart libs in Phase 1.
 * Victory Native lands with the reports feature.
 */
export function SalesSparkBars({ points }: Props) {
  const theme = useTheme();
  const max = Math.max(...points.map((p) => p.amountCents), 1);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Ventes par heure</Text>
      <View style={styles.bars}>
        {points.map((point) => {
          const height = 24 + (point.amountCents / max) * 96;
          return (
            <View key={point.hourLabel} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {point.hourLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 140,
    gap: spacing.xs,
  },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  bar: {
    width: '70%',
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
});
