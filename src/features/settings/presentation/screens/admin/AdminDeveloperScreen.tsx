import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, HelperText, Switch, Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import { probeBackend, runSyncNow } from '@/features/sync/services/syncCoordinator';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function deviceIdentifier(): string {
  return `${Platform.OS}-${Constants.sessionId ?? 'device'}`;
}

export function AdminDeveloperScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ['sync', 'queue-dev'],
    queryFn: async () => {
      const repo = container.resolve<ISyncRepository>(TOKENS.SyncRepository);
      const pending = await repo.listPending(50);
      const failed = await repo.listFailed(50);
      if (!pending.ok) throw pending.error;
      if (!failed.ok) throw failed.error;
      return { pending: pending.value, failed: failed.value };
    },
  });

  const logsQuery = useQuery({
    queryKey: ['sync', 'logs'],
    queryFn: async () => {
      const repo = container.resolve<IDeviceRepository>(TOKENS.DeviceRepository);
      const result = await repo.listSyncLogs(30);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => runSyncNow(),
    onSuccess: async () => {
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const offlineMutation = useMutation({
    mutationFn: async (simulateOffline: boolean) => {
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const bundle = await admin.getBundle();
      if (!bundle.ok) throw bundle.error;
      const result = await admin.setSyncMeta({
        ...bundle.value.sync,
        simulateOffline,
      });
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const probeMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = bundleQuery.data?.sync.apiUrl ?? 'https://api.nf.tikilote.re/v1';
      const result = await probeBackend(apiUrl);
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const bundle = await admin.getBundle();
      if (bundle.ok) {
        await admin.setSyncMeta({
          ...bundle.value.sync,
          backendAvailable: result.ok,
          backendVersion: result.version,
        });
      }
      return result;
    },
    onSuccess: (result) => {
      setProbeResult(
        result.ok
          ? `OK · ${result.latencyMs} ms · v${result.version ?? '?'}`
          : `Échec · ${result.latencyMs} ms`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const simulateOffline = bundleQuery.data?.sync.simulateOffline ?? false;

  return (
    <AdminScreenShell title="Mode développeur" subtitle="Diagnostics (sans actions dangereuses)">
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.body}>
          Version app : <Text style={typography.bodyStrong}>{APP_CONFIG.version}</Text>
        </Text>
        <Text style={typography.body}>
          Identifiant appareil : <Text style={typography.bodyStrong}>{deviceIdentifier()}</Text>
        </Text>
        <Text style={typography.body}>
          Version backend :{' '}
          <Text style={typography.bodyStrong}>
            {bundleQuery.data?.sync.backendVersion ?? '—'}
          </Text>
        </Text>
      </View>

      <Button mode="contained" onPress={() => probeMutation.mutate()} loading={probeMutation.isPending}>
        Tester la connexion API
      </Button>
      {probeResult ? (
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>{probeResult}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Simuler hors ligne</Text>
        <Switch
          value={simulateOffline}
          onValueChange={(v) => offlineMutation.mutate(v)}
        />
      </View>
      <Button
        mode="outlined"
        onPress={() => offlineMutation.mutate(false)}
        disabled={!simulateOffline}
      >
        Simuler en ligne
      </Button>

      <Button mode="outlined" onPress={() => syncMutation.mutate()} loading={syncMutation.isPending}>
        Forcer synchronisation
      </Button>

      <Text style={typography.h3}>File d’attente ({queueQuery.data?.pending.length ?? 0} pending)</Text>
      <FlatList
        data={queueQuery.data?.pending ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>
            {item.entityType} · {item.operation} · {item.status}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>File vide</Text>
        }
      />

      <Text style={typography.h3}>Logs synchronisation</Text>
      <FlatList
        data={logsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>
            {format(new Date(item.createdAt), 'HH:mm:ss')} [{item.level}] {item.message}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>Aucun log</Text>
        }
      />

      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
