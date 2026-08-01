import { APP_CONFIG } from '@/core/config/appConfig';
import { ok, type Result } from '@/core/types/Result';
import type {
  IAdminSettingsRepository,
  SyncedAdminSection,
} from '@/features/settings/data/AdminSettingsRepository';
import type { SqliteAdminSettingsCacheRepository } from '@/features/settings/data/SqliteAdminSettingsCacheRepository';
import type { ISyncApiRepository } from '@/features/sync/data/SyncApiRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type {
  AdminSettingsBundle,
  DeveloperSettings,
  InventorySettings,
  PaymentsSettings,
  PosSettings,
  ReceiptSettings,
  StoreExtendedSettings,
  SyncMetaSettings,
  TaxSettings,
} from '@/features/settings/domain/adminSettings';
import { defaultSyncMetaSettings } from '@/features/settings/domain/adminSettings';

type SectionWriter<T> = (value: T) => Promise<Result<void>>;

/**
 * Administration settings facade: backend is authoritative, SQLite is offline cache.
 * Edits are cached locally and queued for automatic synchronization.
 */
export class CachedAdminSettingsRepository implements IAdminSettingsRepository {
  constructor(
    private readonly cache: SqliteAdminSettingsCacheRepository,
    private readonly syncQueue: ISyncRepository,
    private readonly syncApi: ISyncApiRepository,
  ) {}

  async getBundle(): Promise<Result<AdminSettingsBundle>> {
    return this.cache.getBundle();
  }

  async refreshFromServer(): Promise<Result<void>> {
    const bundle = await this.cache.getBundle();
    if (!bundle.ok) return bundle;

    const syncMeta = bundle.value.sync;
    if (syncMeta.simulateOffline) return ok(undefined);

    const health = await this.syncApi.health();
    if (!health.ok || !health.value.ok) return ok(undefined);

    const since = syncMeta.lastSuccessfulSyncAt;
    const pull = await this.syncApi.pull(since);
    if (!pull.ok) return ok(undefined);

    const body = pull.value;
    const settings = body.settings;

    if (settings && typeof settings === 'object') {
      const sections: Partial<Pick<AdminSettingsBundle, SyncedAdminSection>> = {};
      const synced = settings as Partial<AdminSettingsBundle>;
      if (synced.storeExtended) sections.storeExtended = synced.storeExtended;
      if (synced.pos) sections.pos = synced.pos;
      if (synced.payments) sections.payments = synced.payments;
      if (synced.taxes) sections.taxes = synced.taxes;
      if (synced.receipt) sections.receipt = synced.receipt;
      if (synced.inventory) sections.inventory = synced.inventory;

      if (Object.keys(sections).length > 0) {
        const replaced = await this.cache.replaceSyncedSections(sections);
        if (!replaced.ok) return replaced;
      }
    }

    const nextSync: SyncMetaSettings = {
      ...syncMeta,
      backendAvailable: true,
      backendVersion: body.catalogVersion != null ? String(body.catalogVersion) : syncMeta.backendVersion,
      catalogVersion: body.catalogVersion ?? syncMeta.catalogVersion,
      lastSuccessfulSyncAt: body.serverTime ?? syncMeta.lastSuccessfulSyncAt,
      newCatalogAvailable: false,
      newDataAvailable: false,
    };
    await this.cache.setSyncMeta(nextSync);

    return ok(undefined);
  }

  async setStoreExtended(value: StoreExtendedSettings): Promise<Result<void>> {
    return this.writeSyncedSection('storeExtended', value, () => this.cache.setStoreExtended(value));
  }

  async setPos(value: PosSettings): Promise<Result<void>> {
    return this.writeSyncedSection('pos', value, () => this.cache.setPos(value));
  }

  async setPayments(value: PaymentsSettings): Promise<Result<void>> {
    return this.writeSyncedSection('payments', value, () => this.cache.setPayments(value));
  }

  async setTaxes(value: TaxSettings): Promise<Result<void>> {
    return this.writeSyncedSection('taxes', value, () => this.cache.setTaxes(value));
  }

  async setReceipt(value: ReceiptSettings): Promise<Result<void>> {
    return this.writeSyncedSection('receipt', value, () => this.cache.setReceipt(value));
  }

  async setInventory(value: InventorySettings): Promise<Result<void>> {
    return this.writeSyncedSection('inventory', value, () => this.cache.setInventory(value));
  }

  async setSyncMeta(value: SyncMetaSettings): Promise<Result<void>> {
    return this.cache.setSyncMeta(value);
  }

  async setDeveloper(value: DeveloperSettings): Promise<Result<void>> {
    return this.cache.setDeveloper(value);
  }

  private async writeSyncedSection<T>(
    section: SyncedAdminSection,
    value: T,
    writeCache: SectionWriter<T>,
  ): Promise<Result<void>> {
    const cached = await writeCache(value);
    if (!cached.ok) return cached;

    await this.syncQueue.enqueue({
      entityType: 'admin_settings',
      entityId: section,
      operation: 'update',
      payload: { section, value },
    });

    const bundle = await this.cache.getBundle();
    const syncMeta = bundle.ok ? bundle.value.sync : defaultSyncMetaSettings();
    if (!syncMeta.simulateOffline) {
      void this.pushPendingSettings();
    }

    return ok(undefined);
  }

  private async pushPendingSettings(): Promise<void> {
    const pending = await this.syncQueue.listPending(50);
    if (!pending.ok) return;

    const settingsEvents = pending.value.filter((item) => item.entityType === 'admin_settings');
    if (settingsEvents.length === 0) return;

    const health = await this.syncApi.health();
    if (!health.ok || !health.value.ok) return;

    const events = settingsEvents.map((item) => ({
      localId: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      payload: JSON.parse(item.payloadJson) as Record<string, unknown>,
      createdAt: item.createdAt,
    }));

    const push = await this.syncApi.push(events);
    if (!push.ok) return;

    for (const result of push.value.results) {
      const item = settingsEvents.find((e) => e.id === result.localId);
      if (!item) continue;
      if (result.status === 'accepted' || result.status === 'duplicate') {
        await this.syncQueue.markSynced(item.id);
      } else {
        await this.syncQueue.markFailed(item.id, result.message ?? 'Rejeté par le serveur');
      }
    }
  }
}

/** Resolve API base URL from cached sync metadata. */
export async function resolveApiBaseUrl(
  cache: SqliteAdminSettingsCacheRepository,
): Promise<string> {
  const bundle = await cache.getBundle();
  if (bundle.ok && bundle.value.sync.apiUrl) {
    return bundle.value.sync.apiUrl;
  }
  return defaultSyncMetaSettings().apiUrl;
}

/** Build ApiClient config using secure session token when available. */
export function createApiClientConfig(
  cache: SqliteAdminSettingsCacheRepository,
  secureStorage?: { getItem(key: string): Promise<string | null> },
) {
  return {
    getBaseUrl: () => resolveApiBaseUrl(cache),
    getAccessToken: secureStorage
      ? () => secureStorage.getItem(APP_CONFIG.secureStorageKeys.sessionToken)
      : undefined,
  };
}
