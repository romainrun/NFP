import type { Result } from '@/core/types/Result';
import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';

export interface IAdminSettingsRepository {
  getBundle(): Promise<Result<AdminSettingsBundle>>;
  setStoreExtended(value: AdminSettingsBundle['storeExtended']): Promise<Result<void>>;
  setPos(value: AdminSettingsBundle['pos']): Promise<Result<void>>;
  setPayments(value: AdminSettingsBundle['payments']): Promise<Result<void>>;
  setTaxes(value: AdminSettingsBundle['taxes']): Promise<Result<void>>;
  setReceipt(value: AdminSettingsBundle['receipt']): Promise<Result<void>>;
  setInventory(value: AdminSettingsBundle['inventory']): Promise<Result<void>>;
  setSyncMeta(value: AdminSettingsBundle['sync']): Promise<Result<void>>;
  setBackup(value: AdminSettingsBundle['backup']): Promise<Result<void>>;
  setDeveloper(value: AdminSettingsBundle['developer']): Promise<Result<void>>;
}
