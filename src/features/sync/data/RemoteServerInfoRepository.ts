import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { IServerInfoRepository } from '@/features/sync/data/ServerInfoRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type {
  ServerBackupRequestResult,
  ServerInfoSnapshot,
  ServerStatusApiResponse,
} from '@/features/sync/domain/serverInfo';

function baseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, '');
}

function formatStorageLabel(bytes: number | null, percent: number | null, label: string | null): string | null {
  if (label) return label;
  if (percent != null && Number.isFinite(percent)) return `${percent} % utilisé`;
  if (bytes != null && Number.isFinite(bytes)) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }
  return null;
}

async function fetchServerStatus(apiUrl: string): Promise<{
  online: boolean;
  body: ServerStatusApiResponse | null;
}> {
  const root = baseUrl(apiUrl);
  const endpoints = [`${root}/server/status`, `${root}/status`, `${root}/health`];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) continue;
      const body = (await response.json()) as ServerStatusApiResponse;
      return { online: true, body };
    } catch {
      continue;
    }
  }

  return { online: false, body: null };
}

/**
 * Reads server state from the backend API. The mobile app never stores business backups.
 */
export class RemoteServerInfoRepository implements IServerInfoRepository {
  constructor(
    private readonly adminSettings: IAdminSettingsRepository,
    private readonly syncRepository: ISyncRepository,
  ) {}

  async getSnapshot(): Promise<Result<ServerInfoSnapshot>> {
    const bundle = await this.adminSettings.getBundle();
    if (!bundle.ok) return bundle;

    const syncMeta = bundle.value.sync;
    const apiUrl = syncMeta.apiUrl;
    const simulateOffline = syncMeta.simulateOffline;

    const pending = await this.syncRepository.countPending();
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

    const remote = await fetchServerStatus(apiUrl);
    const body = remote.body;

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
      online: remote.online,
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
    const bundle = await this.adminSettings.getBundle();
    if (!bundle.ok) return bundle;

    const apiUrl = bundle.value.sync.apiUrl;
    if (bundle.value.sync.simulateOffline) {
      return err(AppError.network('Backend indisponible (mode hors-ligne simulé)'));
    }

    const root = baseUrl(apiUrl);
    const endpoints = [`${root}/backup`, `${root}/server/backup`];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'nfp-mobile' }),
        });
        if (response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          return ok({
            ok: true,
            message: body?.message ?? 'Sauvegarde serveur demandée avec succès',
          });
        }
        if (response.status === 404) continue;
        const text = await response.text().catch(() => '');
        return err(
          AppError.network(
            text ? `Échec de la demande (${response.status})` : `Échec de la demande (${response.status})`,
          ),
        );
      } catch (cause) {
        return err(AppError.network('Impossible de joindre le serveur', cause));
      }
    }

    return err(AppError.network('Endpoint de sauvegarde non disponible sur le serveur'));
  }
}
