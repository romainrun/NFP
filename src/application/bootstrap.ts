import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { openDatabase } from '@/database/client';
import { SqliteAuthRepository } from '@/features/authentication/data/SqliteAuthRepository';
import { SqliteUserRepository } from '@/features/authentication/data/SqliteUserRepository';
import { SqliteCartRepository } from '@/features/cart/data/SqliteCartRepository';
import { SqliteOrderRepository } from '@/features/checkout/data/SqliteOrderRepository';
import { MockDashboardRepository } from '@/features/dashboard/data/MockDashboardRepository';
import { LocalPaymentProvider } from '@/features/payments/data/LocalPaymentProvider';
import { SqliteCategoryRepository } from '@/features/products/data/SqliteCategoryRepository';
import { SqliteProductRepository } from '@/features/products/data/SqliteProductRepository';
import { SqliteSettingsRepository } from '@/features/settings/data/SqliteSettingsRepository';
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
  const dashboard = new MockDashboardRepository();
  const categories = new SqliteCategoryRepository(db);
  const products = new SqliteProductRepository(db, audit);
  const carts = new SqliteCartRepository(db, products);
  const paymentProvider = new LocalPaymentProvider();
  const orders = new SqliteOrderRepository(db, carts, paymentProvider, audit);

  container.registerInstance(TOKENS.Database, db);
  container.registerInstance(TOKENS.SecureStorage, secureStorage);
  container.registerInstance(TOKENS.KeyValueStorage, keyValueStorage);
  container.registerInstance(TOKENS.AuditService, audit);
  container.registerInstance(TOKENS.UserRepository, users);
  container.registerInstance(TOKENS.AuthRepository, auth);
  container.registerInstance(TOKENS.SettingsRepository, settings);
  container.registerInstance(TOKENS.DashboardRepository, dashboard);
  container.registerInstance(TOKENS.CategoryRepository, categories);
  container.registerInstance(TOKENS.ProductRepository, products);
  container.registerInstance(TOKENS.CartRepository, carts);
  container.registerInstance(TOKENS.PaymentProvider, paymentProvider);
  container.registerInstance(TOKENS.OrderRepository, orders);

  const settingsResult = await settings.getSettings();
  if (settingsResult.ok) {
    useSettingsStore.getState().hydrate({
      themePreference: settingsResult.value.themePreference,
      storeName: settingsResult.value.storeName,
    });
  }
}
