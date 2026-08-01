import type { Result } from '@/core/types/Result';
import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';

/** Server-owned administration sections cached locally for offline use. */
export type SyncedAdminSection =
  | 'storeExtended'
  | 'pos'
  | 'payments'
  | 'taxes'
  | 'receipt'
  | 'inventory';

export const SYNCED_ADMIN_SECTIONS: SyncedAdminSection[] = [
  'storeExtended',
  'pos',
  'payments',
  'taxes',
  'receipt',
  'inventory',
];

export interface IAdminSettingsRepository {
  getBundle(): Promise<Result<AdminSettingsBundle>>;
  refreshFromServer(): Promise<Result<void>>;
  setStoreExtended(value: AdminSettingsBundle['storeExtended']): Promise<Result<void>>;
  setPos(value: AdminSettingsBundle['pos']): Promise<Result<void>>;
  setPayments(value: AdminSettingsBundle['payments']): Promise<Result<void>>;
  setTaxes(value: AdminSettingsBundle['taxes']): Promise<Result<void>>;
  setReceipt(value: AdminSettingsBundle['receipt']): Promise<Result<void>>;
  setInventory(value: AdminSettingsBundle['inventory']): Promise<Result<void>>;
  /** Client-only sync connectivity metadata — not pushed to the server. */
  setSyncMeta(value: AdminSettingsBundle['sync']): Promise<Result<void>>;
  /** Client-only developer flags — not pushed to the server. */
  setDeveloper(value: AdminSettingsBundle['developer']): Promise<Result<void>>;
}
