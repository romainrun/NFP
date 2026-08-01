import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { openDatabase } from '@/database/client';
import { ApiClient, createApiClientConfig } from '@/core/http/ApiClient';
import { SqliteAuthRepository } from '@/features/authentication/data/SqliteAuthRepository';
import { SqliteUserRepository } from '@/features/authentication/data/SqliteUserRepository';
import { SqliteCartRepository } from '@/features/cart/data/SqliteCartRepository';
import { SqliteCashClosingRepository } from '@/features/checkout/data/SqliteCashClosingRepository';
import { SqliteOrderRepository } from '@/features/checkout/data/SqliteOrderRepository';
import { SqliteDashboardRepository } from '@/features/dashboard/data/SqliteDashboardRepository';
import { LocalPaymentProvider } from '@/features/payments/data/LocalPaymentProvider';
import { ProductImportExportRepository } from '@/features/products/data/ProductImportExportRepository';
import { SqliteCategoryRepository } from '@/features/products/data/SqliteCategoryRepository';
import { SqliteProductRepository } from '@/features/products/data/SqliteProductRepository';
import { SqliteNoteRepository } from '@/features/notes/data/SqliteNoteRepository';
import { SqlitePromotionRepository } from '@/features/promotions/data/SqlitePromotionRepository';
import { ActivityRepositoryImpl } from '@/features/settings/data/ActivityRepositoryImpl';
import { AdminSettingsRepositoryImpl } from '@/features/settings/data/AdminSettingsRepositoryImpl';
import { LocalActivityDataSource } from '@/features/settings/data/local/LocalActivityDataSource';
import { LocalAdminSettingsDataSource } from '@/features/settings/data/local/LocalAdminSettingsDataSource';
import { RemoteActivityDataSource } from '@/features/settings/data/remote/RemoteActivityDataSource';
import { SqliteSettingsRepository } from '@/features/settings/data/SqliteSettingsRepository';
import { LocalSyncQueueDataSource } from '@/features/sync/data/local/LocalSyncQueueDataSource';
import {
  RemoteAdminSettingsDataSource,
  RemoteServerDataSource,
  RemoteSyncDataSource,
} from '@/features/sync/data/remote/RemoteSyncDataSource';
import { ServerRepositoryImpl } from '@/features/sync/data/ServerRepositoryImpl';
import { refreshOnStartup } from '@/features/sync/services/syncCoordinator';
import { SqliteDeviceRepository } from '@/features/sync/data/SqliteDeviceRepository';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import { SqliteAuditService } from '@/shared/services/audit/AuditService';
import { ExpoSecureStorage } from '@/shared/services/storage/SecureStorage';
import { MemoryKeyValueStorage } from '@/shared/services/storage/KeyValueStorage';

/**
 * Composition root.
 * Repository orchestrators + Local/Remote data sources. Backend is source of truth.
 */
export async function bootstrap(): Promise<void> {
  container.clear();

  const db = await openDatabase();
  const secureStorage = new ExpoSecureStorage();
  const keyValueStorage = new MemoryKeyValueStorage();
  const audit = new SqliteAuditService(db);
  const users = new SqliteUserRepository(db);
  const auth = new SqliteAuthRepository(db, users, secureStorage, audit);
  const settings = new SqliteSettingsRepository(db);

  const localAdminSettings = new LocalAdminSettingsDataSource(db);
  const localActivity = new LocalActivityDataSource(db);
  const syncQueue = new LocalSyncQueueDataSource(db);

  const apiClient = new ApiClient(
    createApiClientConfig(() => localAdminSettings.getApiUrl(), secureStorage),
  );
  const remoteSync = new RemoteSyncDataSource(apiClient);
  const remoteAdminSettings = new RemoteAdminSettingsDataSource();
  const remoteActivity = new RemoteActivityDataSource(apiClient);
  const remoteServer = new RemoteServerDataSource(apiClient);

  const adminSettings = new AdminSettingsRepositoryImpl(
    localAdminSettings,
    remoteAdminSettings,
    remoteSync,
    syncQueue,
  );
  const activityHistory = new ActivityRepositoryImpl(
    localActivity,
    remoteActivity,
    localAdminSettings,
    remoteSync,
  );
  const serverInfo = new ServerRepositoryImpl(localAdminSettings, remoteServer, syncQueue);

  const dashboard = new SqliteDashboardRepository(db);
  const categories = new SqliteCategoryRepository(db);
  const products = new SqliteProductRepository(db, audit);
  const promotions = new SqlitePromotionRepository(db);
  const importExport = new ProductImportExportRepository(products);
  const carts = new SqliteCartRepository(db, products);
  const paymentProvider = new LocalPaymentProvider();
  const devices = new SqliteDeviceRepository(db);
  const notes = new SqliteNoteRepository(db);
  const cashClosing = new SqliteCashClosingRepository(db);
  const orders = new SqliteOrderRepository(db, carts, paymentProvider, audit, syncQueue);

  container.registerInstance(TOKENS.Database, db);
  container.registerInstance(TOKENS.SecureStorage, secureStorage);
  container.registerInstance(TOKENS.KeyValueStorage, keyValueStorage);
  container.registerInstance(TOKENS.AuditService, audit);
  container.registerInstance(TOKENS.UserRepository, users);
  container.registerInstance(TOKENS.AuthRepository, auth);
  container.registerInstance(TOKENS.SettingsRepository, settings);
  container.registerInstance(TOKENS.AdminSettingsRepository, adminSettings);
  container.registerInstance(TOKENS.ActivityHistoryRepository, activityHistory);
  container.registerInstance(TOKENS.LocalAdminSettingsDataSource, localAdminSettings);
  container.registerInstance(TOKENS.DashboardRepository, dashboard);
  container.registerInstance(TOKENS.CategoryRepository, categories);
  container.registerInstance(TOKENS.ProductRepository, products);
  container.registerInstance(TOKENS.PromotionRepository, promotions);
  container.registerInstance(TOKENS.ImportExportRepository, importExport);
  container.registerInstance(TOKENS.CartRepository, carts);
  container.registerInstance(TOKENS.PaymentProvider, paymentProvider);
  container.registerInstance(TOKENS.OrderRepository, orders);
  container.registerInstance(TOKENS.CashClosingRepository, cashClosing);
  container.registerInstance(TOKENS.SyncRepository, syncQueue);
  container.registerInstance(TOKENS.RemoteSyncDataSource, remoteSync);
  container.registerInstance(TOKENS.ServerInfoRepository, serverInfo);
  container.registerInstance(TOKENS.NoteRepository, notes);
  container.registerInstance(TOKENS.DeviceRepository, devices);

  const settingsResult = await settings.getSettings();
  if (settingsResult.ok) {
    useSettingsStore.getState().hydrate({
      themePreference: settingsResult.value.themePreference,
      storeName: settingsResult.value.storeName,
    });
  }

  void refreshOnStartup();
}
