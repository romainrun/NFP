import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { openDatabase } from '@/database/client';
import { SqliteAuthRepository } from '@/features/authentication/data/SqliteAuthRepository';
import { SqliteUserRepository } from '@/features/authentication/data/SqliteUserRepository';
import { SqliteCartRepository } from '@/features/cart/data/SqliteCartRepository';
import { SqliteCashClosingRepository } from '@/features/checkout/data/SqliteCashClosingRepository';
import { SqliteOrderRepository } from '@/features/checkout/data/SqliteOrderRepository';
import { SqliteDashboardRepository } from '@/features/dashboard/data/SqliteDashboardRepository';
import { LocalPaymentProvider } from '@/features/payments/data/LocalPaymentProvider';
import { SqliteCategoryRepository } from '@/features/products/data/SqliteCategoryRepository';
import { SqliteProductRepository } from '@/features/products/data/SqliteProductRepository';
import { SqliteNoteRepository } from '@/features/notes/data/SqliteNoteRepository';
import { SqlitePromotionRepository } from '@/features/promotions/data/SqlitePromotionRepository';
import { SqliteActivityHistoryRepository } from '@/features/settings/data/SqliteActivityHistoryRepository';
import { SqliteAdminSettingsRepository } from '@/features/settings/data/SqliteAdminSettingsRepository';
import { SqliteSettingsRepository } from '@/features/settings/data/SqliteSettingsRepository';
import { SqliteDeviceRepository } from '@/features/sync/data/SqliteDeviceRepository';
import { SqliteSyncRepository } from '@/features/sync/data/SqliteSyncRepository';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import { SqliteAuditService } from '@/shared/services/audit/AuditService';
import { ExpoSecureStorage } from '@/shared/services/storage/SecureStorage';
import { MemoryKeyValueStorage } from '@/shared/services/storage/KeyValueStorage';

/**
 * Application composition root.
 * Registers adapters once; UI resolves ports via tokens.
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
  const adminSettings = new SqliteAdminSettingsRepository(db);
  const activityHistory = new SqliteActivityHistoryRepository(db);
  const dashboard = new SqliteDashboardRepository(db);
  const categories = new SqliteCategoryRepository(db);
  const products = new SqliteProductRepository(db, audit);
  const promotions = new SqlitePromotionRepository(db);
  const carts = new SqliteCartRepository(db, products);
  const paymentProvider = new LocalPaymentProvider();
  const sync = new SqliteSyncRepository(db);
  const devices = new SqliteDeviceRepository(db);
  const notes = new SqliteNoteRepository(db);
  const cashClosing = new SqliteCashClosingRepository(db);
  const orders = new SqliteOrderRepository(db, carts, paymentProvider, audit, sync);

  container.registerInstance(TOKENS.Database, db);
  container.registerInstance(TOKENS.SecureStorage, secureStorage);
  container.registerInstance(TOKENS.KeyValueStorage, keyValueStorage);
  container.registerInstance(TOKENS.AuditService, audit);
  container.registerInstance(TOKENS.UserRepository, users);
  container.registerInstance(TOKENS.AuthRepository, auth);
  container.registerInstance(TOKENS.SettingsRepository, settings);
  container.registerInstance(TOKENS.AdminSettingsRepository, adminSettings);
  container.registerInstance(TOKENS.ActivityHistoryRepository, activityHistory);
  container.registerInstance(TOKENS.DashboardRepository, dashboard);
  container.registerInstance(TOKENS.CategoryRepository, categories);
  container.registerInstance(TOKENS.ProductRepository, products);
  container.registerInstance(TOKENS.PromotionRepository, promotions);
  container.registerInstance(TOKENS.CartRepository, carts);
  container.registerInstance(TOKENS.PaymentProvider, paymentProvider);
  container.registerInstance(TOKENS.OrderRepository, orders);
  container.registerInstance(TOKENS.CashClosingRepository, cashClosing);
  container.registerInstance(TOKENS.SyncRepository, sync);
  container.registerInstance(TOKENS.NoteRepository, notes);
  container.registerInstance(TOKENS.DeviceRepository, devices);

  const settingsResult = await settings.getSettings();
  if (settingsResult.ok) {
    useSettingsStore.getState().hydrate({
      themePreference: settingsResult.value.themePreference,
      storeName: settingsResult.value.storeName,
    });
  }
}
