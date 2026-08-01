import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { BrandCard } from '@/shared/components/BrandCard';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { SyncSummary } from '@/features/settings/presentation/hooks/useSyncSummary';

type Props = {
  summary: SyncSummary;
  onSync?: () => void;
  syncing?: boolean;
};

export function SyncStatusCard({ summary, onSync, syncing }: Props) {
  const theme = useTheme();

  const warnings: string[] = [];
  if (summary.simulateOffline) warnings.push('Mode hors-ligne simulé');
  if (!summary.backendAvailable && !summary.simulateOffline) {
    warnings.push('Backend indisponible');
  }
  if (summary.pendingCount > 0) {
    warnings.push(`${summary.pendingCount} opération(s) en attente`);
  }
  if (summary.failedCount > 0) {
    warnings.push(`${summary.failedCount} échec(s) de synchronisation`);
  }
  if (summary.newCatalogAvailable) warnings.push('Nouveau catalogue disponible');
  if (summary.newDataAvailable) warnings.push('Nouvelles données disponibles');

  if (warnings.length === 0) return null;

  return (
    <BrandCard accent style={styles.card}>
      <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
        Synchronisation
      </Text>
      {warnings.map((line) => (
        <Text
          key={line}
          style={[typography.body, { color: Colors.error, marginTop: spacing.xxs }]}
        >
          {line}
        </Text>
      ))}
      {onSync ? (
        <View style={styles.actions}>
          <Button mode="contained" onPress={onSync} loading={syncing} compact>
            Synchroniser maintenant
          </Button>
        </View>
      ) : null}
    </BrandCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
