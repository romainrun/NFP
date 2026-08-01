import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { SyncMetaSettings } from '@/features/settings/domain/adminSettings';
import { trackActivity } from '@/shared/services/activity/activityTracker';

export type SyncRunResult = {
  ok: boolean;
  message: string;
  syncedCount: number;
  failedCount: number;
  backendAvailable: boolean;
  latencyMs: number | null;
};

export async function runSyncNow(): Promise<SyncRunResult> {
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
  const syncRepo = container.resolve<ISyncRepository>(TOKENS.SyncRepository);
  const deviceRepo = container.resolve<IDeviceRepository>(TOKENS.DeviceRepository);

  const bundle = await adminRepo.getBundle();
  const syncMeta = bundle.ok ? bundle.value.sync : null;
  const apiUrl = syncMeta?.apiUrl ?? 'https://api.nf.tikilote.re/v1';
  const simulateOffline = syncMeta?.simulateOffline ?? false;

  let latencyMs: number | null = null;
  let backendAvailable = false;

  if (!simulateOffline) {
    const start = Date.now();
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      latencyMs = Date.now() - start;
      backendAvailable = response.ok;
    } catch {
      latencyMs = Date.now() - start;
      backendAvailable = false;
    }
  }

  await deviceRepo.appendSyncLog(
    backendAvailable ? 'info' : 'warn',
    backendAvailable
      ? `Backend joignable (${latencyMs ?? 0} ms)`
      : 'Backend indisponible ou mode hors-ligne simulé',
  );

  const pending = await syncRepo.listPending(100);
  let syncedCount = 0;
  let failedCount = 0;

  if (backendAvailable && pending.ok) {
    for (const item of pending.value) {
      const result = await syncRepo.markSynced(item.id);
      if (result.ok) syncedCount += 1;
      else failedCount += 1;
    }
  } else if (pending.ok && pending.value.length > 0) {
    failedCount = pending.value.length;
  }

  const failedPending = await syncRepo.countFailed();
  const now = new Date().toISOString();
  const nextSync: SyncMetaSettings = {
    ...(syncMeta ?? {
      apiUrl,
      backendVersion: null,
      catalogVersion: 1,
      lastSuccessfulSyncAt: null,
      backendAvailable: false,
      newCatalogAvailable: false,
      newDataAvailable: false,
      simulateOffline: false,
    }),
    backendAvailable,
    lastSuccessfulSyncAt:
      backendAvailable && syncedCount > 0 ? now : syncMeta?.lastSuccessfulSyncAt ?? null,
    newCatalogAvailable: false,
    newDataAvailable: false,
  };
  await adminRepo.setSyncMeta(nextSync);

  const syncStatus =
    simulateOffline || !backendAvailable
      ? 'offline'
      : failedCount > 0
        ? 'failed'
        : syncedCount > 0
          ? 'synced'
          : 'synced';

  await deviceRepo.updateSyncState(
    syncStatus,
    backendAvailable && !simulateOffline,
    backendAvailable ? now : null,
  );

  await trackActivity();

  return {
    ok: backendAvailable && failedCount === 0,
    message: simulateOffline
      ? 'Mode hors-ligne simulé — synchronisation ignorée'
      : backendAvailable
        ? syncedCount > 0
          ? `${syncedCount} opération(s) synchronisée(s)`
          : 'Aucune opération en attente'
        : 'Backend indisponible',
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
