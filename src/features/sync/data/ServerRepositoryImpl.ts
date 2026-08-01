import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { LocalAdminSettingsDataSource } from '@/features/settings/data/local/LocalAdminSettingsDataSource';
import type { LocalSyncQueueDataSource } from '@/features/sync/data/local/LocalSyncQueueDataSource';
import type { RemoteServerDataSource } from '@/features/sync/data/remote/RemoteSyncDataSource';
import type { IServerInfoRepository } from '@/features/sync/data/ServerInfoRepository';
import type {
  ServerBackupRequestResult,
  ServerInfoSnapshot,
} from '@/features/sync/domain/serverInfo';

function formatStorageLabel(
  bytes: number | null,
  percent: number | null,
  label: string | null,
): string | null {
  if (label) return label;
  if (percent != null && Number.isFinite(percent)) return `${percent} % utilisé`;
  if (bytes != null && Number.isFinite(bytes)) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }
  return null;
}

/**
 * Server information orchestrator (read-only + backup request).
 */
export class ServerRepositoryImpl implements IServerInfoRepository {
  constructor(
    private readonly localSettings: LocalAdminSettingsDataSource,
    private readonly remote: RemoteServerDataSource,
    private readonly syncQueue: LocalSyncQueueDataSource,
  ) {}

  async getSnapshot(): Promise<Result<ServerInfoSnapshot>> {
    const bundle = await this.localSettings.getBundle();
    if (!bundle.ok) return bundle;

    const syncMeta = bundle.value.sync;
    const apiUrl = syncMeta.apiUrl;
    const simulateOffline = syncMeta.simulateOffline;

    const pending = await this.syncQueue.countPending();
    const pendingOperations = pending.ok ? pending.value : 0;

    if (simulateOffline) {
      return ok({
        online: false,
        apiVersion: APP_CONFIG.version,
        backendVersion: syncMeta.backendVersion,
        lastSyncAt: syncMeta.lastSuccessfulSyncAt,
        lastServerBackupAt: null,
        storageUsageBytes: null,
        storageUsageLabel: null,
        pendingOperations,
        apiUrl,
      });
    }

    const status = await this.remote.fetchStatus();
    const online = status.ok && status.value.online;
    const body = status.ok ? status.value.body : null;

    const backendVersion =
      body?.backendVersion ?? body?.version ?? syncMeta.backendVersion ?? null;

    const lastSyncAt =
      body?.lastSyncAt ??
      body?.lastSuccessfulSyncAt ??
      syncMeta.lastSuccessfulSyncAt ??
      null;

    const lastServerBackupAt = body?.lastServerBackupAt ?? body?.lastBackupAt ?? null;

    const storageUsageBytes =
      body?.storageUsageBytes != null ? Number(body.storageUsageBytes) : null;
    const storageUsageLabel = formatStorageLabel(
      storageUsageBytes,
      body?.storageUsagePercent != null ? Number(body.storageUsagePercent) : null,
      body?.storageUsageLabel ?? null,
    );

    return ok({
      online,
      apiVersion: body?.apiVersion ?? APP_CONFIG.version,
      backendVersion,
      lastSyncAt,
      lastServerBackupAt,
      storageUsageBytes,
      storageUsageLabel,
      pendingOperations,
      apiUrl,
    });
  }

  async requestServerBackup(): Promise<Result<ServerBackupRequestResult>> {
    const bundle = await this.localSettings.getBundle();
    if (!bundle.ok) return bundle;

    if (bundle.value.sync.simulateOffline) {
      return err(AppError.network('Backend indisponible (mode hors-ligne simulé)'));
    }

    const result = await this.remote.requestBackup();
    if (!result.ok) return result;

    return ok({
      ok: true,
      message: result.value?.message ?? 'Sauvegarde serveur demandée avec succès',
    });
  }
}
