import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IActivityHistoryRepository } from '@/features/settings/data/ActivityHistoryRepository';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import type { ISyncApiRepository } from '@/features/sync/data/SyncApiRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
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
 * Central synchronization worker. Push pending changes, pull server state (settings win).
 */
export async function runSyncNow(): Promise<SyncRunResult> {
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
  const syncRepo = container.resolve<ISyncRepository>(TOKENS.SyncRepository);
  const syncApi = container.resolve<ISyncApiRepository>(TOKENS.SyncApiRepository);
  const deviceRepo = container.resolve<IDeviceRepository>(TOKENS.DeviceRepository);
  const activityRepo = container.resolve<IActivityHistoryRepository>(TOKENS.ActivityHistoryRepository);

  const bundle = await adminRepo.getBundle();
  const syncMeta = bundle.ok ? bundle.value.sync : defaultSyncMetaSettings();
  const simulateOffline = syncMeta.simulateOffline;

  let latencyMs: number | null = null;
  let backendAvailable = false;
  let backendVersion: string | null = syncMeta.backendVersion;

  if (!simulateOffline) {
    const start = Date.now();
    const health = await syncApi.health();
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
    const pending = await syncRepo.listPending(100);
    if (pending.ok && pending.value.length > 0) {
      const events = pending.value.map((item) => ({
        localId: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        payload: JSON.parse(item.payloadJson) as Record<string, unknown>,
        createdAt: item.createdAt,
      }));

      const push = await syncApi.push(events);
      if (push.ok) {
        for (const result of push.value.results) {
          const item = pending.value.find((e) => e.id === result.localId);
          if (!item) continue;
          if (result.status === 'accepted' || result.status === 'duplicate') {
            const marked = await syncRepo.markSynced(item.id);
            if (marked.ok) syncedCount += 1;
            else failedCount += 1;
          } else {
            await syncRepo.markFailed(item.id, result.message ?? 'Rejeté par le serveur');
            failedCount += 1;
          }
        }
      } else {
        failedCount = pending.value.length;
      }
    }

    await adminRepo.refreshFromServer();
    await activityRepo.refreshFromServer();
  } else {
    const pending = await syncRepo.listPending(100);
    if (pending.ok && pending.value.length > 0) {
      failedCount = pending.value.length;
    }
  }

  const failedPending = await syncRepo.countFailed();
  const now = new Date().toISOString();
  const refreshed = await adminRepo.getBundle();
  const currentMeta = refreshed.ok ? refreshed.value.sync : syncMeta;

  const nextSync: SyncMetaSettings = {
    ...currentMeta,
    backendVersion,
    backendAvailable,
    lastSuccessfulSyncAt:
      backendAvailable && (syncedCount > 0 || currentMeta.lastSuccessfulSyncAt)
        ? now
        : currentMeta.lastSuccessfulSyncAt,
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
  const syncRepo = container.resolve<ISyncRepository>(TOKENS.SyncRepository);
  const failed = await syncRepo.listFailed(100);
  if (failed.ok) {
    for (const item of failed.value) {
      await syncRepo.requeue(item.id);
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

/** Load cached settings then refresh from backend when network is available. */
export async function refreshOnStartup(): Promise<void> {
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
  const activityRepo = container.resolve<IActivityHistoryRepository>(TOKENS.ActivityHistoryRepository);
  const syncApi = container.resolve<ISyncApiRepository>(TOKENS.SyncApiRepository);

  const bundle = await adminRepo.getBundle();
  if (!bundle.ok || bundle.value.sync.simulateOffline) return;

  const health = await syncApi.health();
  if (!health.ok || !health.value.ok) return;

  await adminRepo.refreshFromServer();
  await activityRepo.refreshFromServer();
  await runSyncNow();
}
