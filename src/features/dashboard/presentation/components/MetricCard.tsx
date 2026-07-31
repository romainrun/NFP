import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { DashboardMetric } from '@/features/dashboard/domain/types';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: Props) {
  const theme = useTheme();

  const toneColor =
    metric.tone === 'positive'
      ? theme.colors.tertiary
      : metric.tone === 'warning'
        ? theme.colors.error
        : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        {metric.label}
      </Text>
      <Text style={[typography.h1, { color: theme.colors.primary, marginTop: spacing.xs, fontSize: 26 }]}>
        {metric.value}
      </Text>
      {metric.deltaLabel ? (
        <Text style={[typography.caption, { color: toneColor, marginTop: spacing.xs }]}>
          {metric.deltaLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 160,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    padding: spacing.md,
  },
});
