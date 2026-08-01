import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import { runSyncNow } from '@/features/sync/services/syncCoordinator';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const STATUS_LABELS: Record<string, string> = {
  never: 'Jamais synchronisé',
  pending: 'En attente',
  synced: 'Synchronisé',
  failed: 'Échec',
  offline: 'Hors ligne',
};

export function AdminDevicesScreen() {
  const queryClient = useQueryClient();

  const deviceQuery = useQuery({
    queryKey: ['device', 'local'],
    queryFn: async () => {
      const repo = container.resolve<IDeviceRepository>(TOKENS.DeviceRepository);
      const result = await repo.getLocalDevice();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => runSyncNow(),
    onSuccess: async () => {
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
      await queryClient.invalidateQueries({ queryKey: ['device'] });
    },
  });

  const device = deviceQuery.data;

  if (!device) {
    return (
      <AdminScreenShell title="Appareils" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  return (
    <AdminScreenShell title="Appareils" subtitle="Cet appareil">
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.body}>
          Nom : <Text style={typography.bodyStrong}>{device.deviceName}</Text>
        </Text>
        <Text style={typography.body}>
          Plateforme : <Text style={typography.bodyStrong}>{device.platform}</Text>
        </Text>
        <Text style={typography.body}>
          Version app : <Text style={typography.bodyStrong}>{device.appVersion}</Text>
        </Text>
        <Text style={typography.body}>
          Dernière sync :{' '}
          <Text style={typography.bodyStrong}>
            {device.lastSyncAt ? format(new Date(device.lastSyncAt), 'dd/MM/yy HH:mm') : '—'}
          </Text>
        </Text>
        <Text style={typography.body}>
          Statut :{' '}
          <Text style={typography.bodyStrong}>
            {STATUS_LABELS[device.syncStatus] ?? device.syncStatus}
          </Text>
        </Text>
        <Text style={typography.body}>
          Connexion :{' '}
          <Text
            style={[
              typography.bodyStrong,
              { color: device.isOnline ? Colors.success : Colors.error },
            ]}
          >
            {device.isOnline ? 'En ligne' : 'Hors ligne'}
          </Text>
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={() => syncMutation.mutate()}
        loading={syncMutation.isPending}
      >
        Forcer la synchronisation
      </Button>

      {syncMutation.data ? (
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          {syncMutation.data.message}
        </Text>
      ) : null}
    </AdminScreenShell>
  );
}
