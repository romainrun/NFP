import { useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IServerInfoRepository } from '@/features/sync/data/ServerInfoRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { logSettingsChange } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function formatWhen(value: string | null): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yy HH:mm');
  } catch {
    return value;
  }
}

export function AdminServerBackupsScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canRequestBackup = Boolean(
    session && hasPermission(session.employee.role, 'settings.manage'),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshotQuery = useQuery({
    queryKey: ['server', 'snapshot'],
    queryFn: async () => {
      const repo = container.resolve<IServerInfoRepository>(TOKENS.ServerInfoRepository);
      const result = await repo.getSnapshot();
      if (!result.ok) throw result.error;
      return result.value;
    },
    refetchInterval: 60_000,
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<IServerInfoRepository>(TOKENS.ServerInfoRepository);
      const result = await repo.requestServerBackup();
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async (result) => {
      setError(null);
      setMessage(result.message);
      await logSettingsChange('Sauvegarde serveur', session?.employee.id);
      await queryClient.invalidateQueries({ queryKey: ['server'] });
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(err.message);
    },
  });

  const snapshot = snapshotQuery.data;

  return (
    <AdminScreenShell title="Serveur & sauvegardes" subtitle="Source de vérité — backend NFP">
      <Text style={[typography.caption, { color: Colors.textSecondary, marginBottom: spacing.sm }]}>
        Les données métier sont stockées sur le serveur. Cette application affiche l’état du
        backend et permet de demander une sauvegarde côté serveur.
      </Text>

      {snapshotQuery.isLoading && !snapshot ? (
        <Text style={typography.body}>Chargement…</Text>
      ) : snapshot ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.body}>
            Backend :{' '}
            <Text
              style={[
                typography.bodyStrong,
                { color: snapshot.online ? Colors.success : Colors.error },
              ]}
            >
              {snapshot.online ? 'En ligne' : 'Hors ligne'}
            </Text>
          </Text>
          <Text style={typography.body}>
            Version API : <Text style={typography.bodyStrong}>{snapshot.apiVersion ?? '—'}</Text>
          </Text>
          <Text style={typography.body}>
            Version backend :{' '}
            <Text style={typography.bodyStrong}>{snapshot.backendVersion ?? '—'}</Text>
          </Text>
          <Text style={typography.body}>
            Version app : <Text style={typography.bodyStrong}>{APP_CONFIG.version}</Text>
          </Text>
          <Text style={typography.body}>
            Dernière synchronisation :{' '}
            <Text style={typography.bodyStrong}>{formatWhen(snapshot.lastSyncAt)}</Text>
          </Text>
          <Text style={typography.body}>
            Dernière sauvegarde serveur :{' '}
            <Text style={typography.bodyStrong}>
              {formatWhen(snapshot.lastServerBackupAt)}
            </Text>
          </Text>
          {snapshot.storageUsageLabel ? (
            <Text style={typography.body}>
              Stockage serveur :{' '}
              <Text style={typography.bodyStrong}>{snapshot.storageUsageLabel}</Text>
            </Text>
          ) : null}
          <Text style={typography.body}>
            Opérations en attente :{' '}
            <Text style={typography.bodyStrong}>{snapshot.pendingOperations}</Text>
          </Text>
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>
            URL : {snapshot.apiUrl}
          </Text>
        </View>
      ) : null}

      {canRequestBackup ? (
        <Button
          mode="contained"
          icon="cloud-upload"
          onPress={() => backupMutation.mutate()}
          loading={backupMutation.isPending}
          disabled={!snapshot?.online}
          style={{ marginTop: spacing.md }}
        >
          Demander une sauvegarde serveur
        </Button>
      ) : (
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          Seuls les administrateurs peuvent demander une sauvegarde serveur.
        </Text>
      )}

      {message ? (
        <HelperText type="info" visible>{message}</HelperText>
      ) : null}
      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
