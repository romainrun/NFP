import type { ApiClient } from '@/core/http/ApiClient';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { SyncVersions } from '@/core/sync/SyncVersions';
import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';
import type { SyncedAdminSection } from '@/features/settings/data/AdminSettingsRepository';
import type {
  BackupRequestResponse,
  ServerStatusResponse,
  SyncPullResponse,
  SyncPushEvent,
  SyncPushResponse,
  SyncStatusResponse,
} from '@/features/sync/domain/syncApi';

/**
 * Remote API for administration settings (via sync pull).
 */
export class RemoteAdminSettingsDataSource {
  extractFromPull(pull: SyncPullResponse): Partial<Pick<AdminSettingsBundle, SyncedAdminSection>> {
    const settings = pull.settings;
    if (!settings || typeof settings !== 'object') return {};

    const synced = settings as Partial<AdminSettingsBundle>;
    const sections: Partial<Pick<AdminSettingsBundle, SyncedAdminSection>> = {};
    if (synced.storeExtended) sections.storeExtended = synced.storeExtended;
    if (synced.pos) sections.pos = synced.pos;
    if (synced.payments) sections.payments = synced.payments;
    if (synced.taxes) sections.taxes = synced.taxes;
    if (synced.receipt) sections.receipt = synced.receipt;
    if (synced.inventory) sections.inventory = synced.inventory;
    return sections;
  }
}

/**
 * Remote sync API — push queue, version-based pull, health.
 */
export class RemoteSyncDataSource {
  constructor(private readonly client: ApiClient) {}

  async health(): Promise<Result<{ ok: boolean; version?: string }>> {
    const result = await this.client.get<{ version?: string }>('/health');
    if (!result.ok) return ok({ ok: false });
    return ok({ ok: true, version: result.value?.version });
  }

  async status(): Promise<Result<SyncStatusResponse>> {
    const result = await this.client.get<SyncStatusResponse>('/sync/status');
    if (!result.ok) return result;
    return ok(result.value ?? {});
  }

  async push(events: SyncPushEvent[]): Promise<Result<SyncPushResponse>> {
    const result = await this.client.post<SyncPushResponse>('/sync/push', { events });
    if (!result.ok) return result;
    return ok(result.value ?? { results: [] });
  }

  async pull(versions: SyncVersions): Promise<Result<SyncPullResponse>> {
    const result = await this.client.post<SyncPullResponse>('/sync/pull', versions);
    if (!result.ok) {
      const fallback = await this.client.get<SyncPullResponse>('/sync/pull', {
        settingsVersion: String(versions.settingsVersion),
        productsVersion: String(versions.productsVersion),
        inventoryVersion: String(versions.inventoryVersion),
        employeesVersion: String(versions.employeesVersion),
        promotionsVersion: String(versions.promotionsVersion),
        activityVersion: String(versions.activityVersion),
      });
      if (!fallback.ok) return fallback;
      return ok(fallback.value ?? { serverTime: new Date().toISOString() });
    }
    return ok(result.value ?? { serverTime: new Date().toISOString() });
  }
}

/**
 * Remote server status and backup endpoints.
 */
export class RemoteServerDataSource {
  constructor(private readonly client: ApiClient) {}

  async fetchStatus(): Promise<Result<{ online: boolean; body: ServerStatusResponse | null }>> {
    const paths = ['/server/status', '/status', '/health'];
    for (const path of paths) {
      const result = await this.client.get<ServerStatusResponse>(path);
      if (result.ok) {
        return ok({ online: true, body: result.value ?? {} });
      }
    }
    return ok({ online: false, body: null });
  }

  async requestBackup(): Promise<Result<BackupRequestResponse>> {
    const paths = ['/backup', '/server/backup'];
    let lastError: Result<BackupRequestResponse> | null = null;
    for (const path of paths) {
      const result = await this.client.post<BackupRequestResponse>(path, { source: 'nfp-mobile' });
      if (result.ok) return result;
      lastError = result;
    }
    return lastError ?? err(AppError.network('Endpoint de sauvegarde non disponible'));
  }
}
