import { ok, type Result } from '@/core/types/Result';
import { SyncEntityType, SyncOperation } from '@/core/sync/SyncOperation';
import { mergeSyncVersions } from '@/core/sync/SyncVersions';
import type {
  IAdminSettingsRepository,
  SyncedAdminSection,
} from '@/features/settings/data/AdminSettingsRepository';
import type { LocalAdminSettingsDataSource } from '@/features/settings/data/local/LocalAdminSettingsDataSource';
import type { RemoteAdminSettingsDataSource } from '@/features/sync/data/remote/RemoteSyncDataSource';
import type { RemoteSyncDataSource } from '@/features/sync/data/remote/RemoteSyncDataSource';
import type { LocalSyncQueueDataSource } from '@/features/sync/data/local/LocalSyncQueueDataSource';
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

type SectionWriter<T> = (value: T) => Promise<Result<void>>;

/**
 * Administration settings orchestrator.
 * Local cache + remote sync — UI never knows the data source.
 */
export class AdminSettingsRepositoryImpl implements IAdminSettingsRepository {
  constructor(
    private readonly local: LocalAdminSettingsDataSource,
    private readonly remote: RemoteAdminSettingsDataSource,
    private readonly syncRemote: RemoteSyncDataSource,
    private readonly syncQueue: LocalSyncQueueDataSource,
  ) {}

  async getBundle(): Promise<Result<AdminSettingsBundle>> {
    return this.local.getBundle();
  }

  async refreshFromServer(): Promise<Result<void>> {
    if (await this.local.isSimulateOffline()) return ok(undefined);

    const health = await this.syncRemote.health();
    if (!health.ok || !health.value.ok) return ok(undefined);

    const versions = await this.local.getSyncVersions();
    if (!versions.ok) return versions;

    const pull = await this.syncRemote.pull(versions.value);
    if (!pull.ok) return ok(undefined);

    const body = pull.value;
    const sections = this.remote.extractFromPull(body);

    if (Object.keys(sections).length > 0) {
      const replaced = await this.local.replaceSyncedSections(sections);
      if (!replaced.ok) return replaced;
    }

    const nextVersions = mergeSyncVersions(versions.value, {
      settingsVersion: body.settingsVersion,
      productsVersion: body.productsVersion,
      inventoryVersion: body.inventoryVersion,
      employeesVersion: body.employeesVersion,
      promotionsVersion: body.promotionsVersion,
      activityVersion: body.activityVersion,
    });
    await this.local.setSyncVersions(nextVersions);

    const bundle = await this.local.getBundle();
    if (bundle.ok) {
      const syncMeta = bundle.value.sync;
      await this.local.setSyncMeta({
        ...syncMeta,
        backendAvailable: true,
        catalogVersion: body.catalogVersion ?? syncMeta.catalogVersion,
        lastSuccessfulSyncAt: body.serverTime ?? syncMeta.lastSuccessfulSyncAt,
        newCatalogAvailable: false,
        newDataAvailable: false,
      });
    }

    return ok(undefined);
  }

  async setStoreExtended(value: StoreExtendedSettings): Promise<Result<void>> {
    return this.writeSyncedSection('storeExtended', value, (v) => this.local.setStoreExtended(v));
  }

  async setPos(value: PosSettings): Promise<Result<void>> {
    return this.writeSyncedSection('pos', value, (v) => this.local.setPos(v));
  }

  async setPayments(value: PaymentsSettings): Promise<Result<void>> {
    return this.writeSyncedSection('payments', value, (v) => this.local.setPayments(v));
  }

  async setTaxes(value: TaxSettings): Promise<Result<void>> {
    return this.writeSyncedSection('taxes', value, (v) => this.local.setTaxes(v));
  }

  async setReceipt(value: ReceiptSettings): Promise<Result<void>> {
    return this.writeSyncedSection('receipt', value, (v) => this.local.setReceipt(v));
  }

  async setInventory(value: InventorySettings): Promise<Result<void>> {
    return this.writeSyncedSection('inventory', value, (v) => this.local.setInventory(v));
  }

  async setSyncMeta(value: SyncMetaSettings): Promise<Result<void>> {
    return this.local.setSyncMeta(value);
  }

  async setDeveloper(value: DeveloperSettings): Promise<Result<void>> {
    return this.local.setDeveloper(value);
  }

  private async writeSyncedSection<T>(
    section: SyncedAdminSection,
    value: T,
    writeCache: SectionWriter<T>,
  ): Promise<Result<void>> {
    const cached = await writeCache(value);
    if (!cached.ok) return cached;

    await this.syncQueue.enqueue({
      entityType: SyncEntityType.SETTINGS,
      entityId: section,
      operation: SyncOperation.SETTINGS_UPDATE,
      payload: { section, value },
    });

    return ok(undefined);
  }
}
