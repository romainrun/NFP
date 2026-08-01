import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runSyncNow } from '@/features/sync/services/syncCoordinator';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { useSyncSummary } from '@/features/settings/presentation/hooks/useSyncSummary';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminSyncScreen() {
  const queryClient = useQueryClient();
  const summaryQuery = useSyncSummary();

  const syncMutation = useMutation({
    mutationFn: () => runSyncNow(),
    onSuccess: async () => {
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const summary = summaryQuery.data;

  return (
    <AdminScreenShell title="Synchronisation" subtitle="État du magasin">
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.body}>
          Backend :{' '}
          <Text
            style={[
              typography.bodyStrong,
              {
                color:
                  summary?.backendAvailable && !summary?.simulateOffline
                    ? Colors.success
                    : Colors.error,
              },
            ]}
          >
            {summary?.simulateOffline
              ? 'Hors ligne (simulé)'
              : summary?.backendAvailable
                ? 'Disponible'
                : 'Indisponible'}
          </Text>
        </Text>
        <Text style={typography.body}>
          Dernière synchronisation :{' '}
          <Text style={typography.bodyStrong}>
            {summary?.lastSuccessfulSyncAt
              ? format(new Date(summary.lastSuccessfulSyncAt), 'dd/MM/yy HH:mm')
              : '—'}
          </Text>
        </Text>
        <Text style={typography.body}>
          Opérations en attente :{' '}
          <Text style={typography.bodyStrong}>{summary?.pendingCount ?? 0}</Text>
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={() => syncMutation.mutate()}
        loading={syncMutation.isPending}
      >
        Synchroniser maintenant
      </Button>

      {syncMutation.data ? (
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          {syncMutation.data.message}
        </Text>
      ) : null}
    </AdminScreenShell>
  );
}
