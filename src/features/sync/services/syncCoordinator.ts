import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { mergeSyncVersions } from '@/core/sync/SyncVersions';
import type { IActivityHistoryRepository } from '@/features/settings/data/ActivityHistoryRepository';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { LocalAdminSettingsDataSource } from '@/features/settings/data/local/LocalAdminSettingsDataSource';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import type { LocalSyncQueueDataSource } from '@/features/sync/data/local/LocalSyncQueueDataSource';
import type { RemoteSyncDataSource } from '@/features/sync/data/remote/RemoteSyncDataSource';
import type { SyncMetaSettings } from '@/features/settings/domain/adminSettings';
import { defaultSyncMetaSettings } from '@/features/settings/domain/adminSettings';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import { trackActivity } from '@/shared/services/activity/activityTracker';

export type SyncRunResult = {
  ok: boolean;
  message: string;
  syncedCount: number;
  failedCount: number;
  backendAvailable: boolean;
  latencyMs: number | null;
};

/**
 * Central synchronization worker — push queue, version-based pull, refresh caches.
 * No screen should duplicate this logic.
 */
export async function runSyncNow(): Promise<SyncRunResult> {
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
  const syncQueue = container.resolve<LocalSyncQueueDataSource>(TOKENS.SyncRepository);
  const syncRemote = container.resolve<RemoteSyncDataSource>(TOKENS.RemoteSyncDataSource);
  const deviceRepo = container.resolve<IDeviceRepository>(TOKENS.DeviceRepository);
  const activityRepo = container.resolve<IActivityHistoryRepository>(TOKENS.ActivityHistoryRepository);
  const settingsLocal = container.resolve<LocalAdminSettingsDataSource>(TOKENS.LocalAdminSettingsDataSource);

  const bundle = await adminRepo.getBundle();
  const syncMeta = bundle.ok ? bundle.value.sync : defaultSyncMetaSettings();
  const simulateOffline = syncMeta.simulateOffline;

  let latencyMs: number | null = null;
  let backendAvailable = false;
  let backendVersion: string | null = syncMeta.backendVersion;

  if (!simulateOffline) {
    const start = Date.now();
    const health = await syncRemote.health();
    latencyMs = Date.now() - start;
    backendAvailable = health.ok && health.value.ok;
    if (health.ok && health.value.version) {
      backendVersion = health.value.version;
    }
  }

  await deviceRepo.appendSyncLog(
    backendAvailable ? 'info' : 'warn',
    backendAvailable
      ? `Backend joignable (${latencyMs ?? 0} ms)`
      : 'Backend indisponible ou mode hors-ligne simulé',
  );

  let syncedCount = 0;
  let failedCount = 0;

  if (backendAvailable) {
    const pending = await syncQueue.listPending(100);
    if (pending.ok && pending.value.length > 0) {
      const events = pending.value.map((item) => ({
        localId: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        payload: JSON.parse(item.payloadJson) as Record<string, unknown>,
        createdAt: item.createdAt,
      }));

      const push = await syncRemote.push(events);
      if (push.ok) {
        for (const result of push.value.results) {
          const item = pending.value.find((e) => e.id === result.localId);
          if (!item) continue;
          if (result.status === 'accepted' || result.status === 'duplicate') {
            const marked = await syncQueue.markSynced(item.id);
            if (marked.ok) syncedCount += 1;
            else failedCount += 1;
          } else {
            await syncQueue.markFailed(item.id, result.message ?? 'Rejeté par le serveur');
            failedCount += 1;
          }
        }
      } else {
        failedCount = pending.value.length;
      }
    }

    const versions = await settingsLocal.getSyncVersions();
    if (versions.ok) {
      const pull = await syncRemote.pull(versions.value);
      if (pull.ok) {
        const body = pull.value;
        const nextVersions = mergeSyncVersions(versions.value, {
          settingsVersion: body.settingsVersion,
          productsVersion: body.productsVersion,
          inventoryVersion: body.inventoryVersion,
          employeesVersion: body.employeesVersion,
          promotionsVersion: body.promotionsVersion,
          activityVersion: body.activityVersion,
        });
        await settingsLocal.setSyncVersions(nextVersions);
      }
    }

    await adminRepo.refreshFromServer();
    await activityRepo.refreshFromServer();
  } else {
    const pending = await syncQueue.listPending(100);
    if (pending.ok && pending.value.length > 0) {
      failedCount = pending.value.length;
    }
  }

  const failedPending = await syncQueue.countFailed();
  const now = new Date().toISOString();
  const refreshed = await adminRepo.getBundle();
  const currentMeta = refreshed.ok ? refreshed.value.sync : syncMeta;

  const nextSync: SyncMetaSettings = {
    ...currentMeta,
    backendVersion,
    backendAvailable,
    lastSuccessfulSyncAt:
      backendAvailable ? now : currentMeta.lastSuccessfulSyncAt,
    newCatalogAvailable: false,
    newDataAvailable: false,
  };
  await adminRepo.setSyncMeta(nextSync);

  const syncStatus =
    simulateOffline || !backendAvailable
      ? 'offline'
      : failedCount > 0
        ? 'failed'
        : 'synced';

  await deviceRepo.updateSyncState(
    syncStatus,
    backendAvailable && !simulateOffline,
    backendAvailable ? now : null,
  );

  const audit = container.resolve<IAuditService>(TOKENS.AuditService);
  await audit.log({
    action: 'sync',
    payload: {
      message:
        backendAvailable && syncedCount > 0
          ? `${syncedCount} opération(s)`
          : simulateOffline
            ? 'Mode hors-ligne simulé'
            : backendAvailable
              ? 'Synchronisation terminée'
              : 'Backend indisponible',
    },
  });

  await trackActivity();

  return {
    ok: backendAvailable && failedCount === 0,
    message: simulateOffline
      ? 'Mode hors-ligne simulé — synchronisation ignorée'
      : backendAvailable
        ? syncedCount > 0
          ? `${syncedCount} opération(s) synchronisée(s)`
          : 'Synchronisation terminée'
        : 'Backend indisponible — modifications en attente',
    syncedCount,
    failedCount: failedPending.ok ? failedPending.value : failedCount,
    backendAvailable,
    latencyMs,
  };
}

export async function retryFailedSync(): Promise<SyncRunResult> {
  const syncQueue = container.resolve<LocalSyncQueueDataSource>(TOKENS.SyncRepository);
  const failed = await syncQueue.listFailed(100);
  if (failed.ok) {
    for (const item of failed.value) {
      await syncQueue.requeue(item.id);
    }
  }
  return runSyncNow();
}

export async function probeBackend(apiUrl: string): Promise<{
  ok: boolean;
  latencyMs: number;
  version: string | null;
}> {
  const start = Date.now();
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const latencyMs = Date.now() - start;
    if (!response.ok) return { ok: false, latencyMs, version: null };
    const body = (await response.json()) as { version?: string };
    return { ok: true, latencyMs, version: body.version ?? null };
  } catch {
    return { ok: false, latencyMs: Date.now() - start, version: null };
  }
}

/** Startup: cache already loaded — refresh from backend when online. */
export async function refreshOnStartup(): Promise<void> {
  const syncRemote = container.resolve<RemoteSyncDataSource>(TOKENS.RemoteSyncDataSource);
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);

  const bundle = await adminRepo.getBundle();
  if (!bundle.ok || bundle.value.sync.simulateOffline) return;

  const health = await syncRemote.health();
  if (!health.ok || !health.value.ok) return;

  await runSyncNow();
}
