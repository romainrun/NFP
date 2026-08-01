import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { APP_CONFIG } from '@/core/config/appConfig';
import { runSyncNow, retryFailedSync } from '@/features/sync/services/syncCoordinator';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { useSyncSummary } from '@/features/settings/presentation/hooks/useSyncSummary';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminSyncScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const summaryQuery = useSyncSummary();
  const [message, setMessage] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => runSyncNow(),
    onSuccess: async (result) => {
      setMessage(result.message);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryFailedSync(),
    onSuccess: async (result) => {
      setMessage(result.message);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const sync = bundleQuery.data?.sync;
  const summary = summaryQuery.data;

  return (
    <AdminScreenShell title="Synchronisation" subtitle="État du backend">
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
          Dernière sync réussie :{' '}
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
        <Text style={typography.body}>
          Échecs :{' '}
          <Text style={typography.bodyStrong}>{summary?.failedCount ?? 0}</Text>
        </Text>
        <Text style={typography.body}>
          URL API : <Text style={typography.bodyStrong}>{sync?.apiUrl ?? '—'}</Text>
        </Text>
        <Text style={typography.body}>
          Version backend :{' '}
          <Text style={typography.bodyStrong}>{sync?.backendVersion ?? '—'}</Text>
        </Text>
        <Text style={typography.body}>
          Version catalogue :{' '}
          <Text style={typography.bodyStrong}>{sync?.catalogVersion ?? '—'}</Text>
        </Text>
        <Text style={typography.body}>
          Version app : <Text style={typography.bodyStrong}>{APP_CONFIG.version}</Text>
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={() => syncMutation.mutate()}
        loading={syncMutation.isPending}
      >
        Synchroniser maintenant
      </Button>
      <Button
        mode="outlined"
        onPress={() => retryMutation.mutate()}
        loading={retryMutation.isPending}
        disabled={(summary?.failedCount ?? 0) === 0}
      >
        Réessayer les échecs
      </Button>

      {message ? (
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>{message}</Text>
      ) : null}
    </AdminScreenShell>
  );
}
