import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import {
  defaultAdminSettingsBundle,
  type AdminSettingsBundle,
  type BackupSettings,
  type DeveloperSettings,
  type InventorySettings,
  type PaymentsSettings,
  type PosSettings,
  type ReceiptSettings,
  type StoreExtendedSettings,
  type SyncMetaSettings,
  type TaxSettings,
} from '@/features/settings/domain/adminSettings';

const KEYS = {
  storeExtended: 'admin.store_extended',
  pos: 'admin.pos',
  payments: 'admin.payments',
  taxes: 'admin.taxes',
  receipt: 'admin.receipt',
  inventory: 'admin.inventory',
  sync: 'admin.sync_meta',
  backup: 'admin.backup',
  developer: 'admin.developer',
} as const;

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function normalizeInventory(raw: InventorySettings & Record<string, unknown>): InventorySettings {
  return {
    allowNegativeStock: Boolean(raw.allowNegativeStock),
    warnBeforeOutOfStock: raw.warnBeforeOutOfStock !== false,
  };
}

function normalizeReceipt(raw: ReceiptSettings & Record<string, unknown>): ReceiptSettings {
  const defaults = defaultAdminSettingsBundle().receipt;
  return {
    logoUri: (raw.logoUri as string | null | undefined) ?? defaults.logoUri,
    headerText: String(raw.headerText ?? defaults.headerText),
    footerText: String(raw.footerText ?? defaults.footerText),
    showLogoOnReceipt: raw.showLogoOnReceipt !== false,
    qrCodeEnabled: Boolean(raw.qrCodeEnabled),
    numberingEnabled: raw.numberingEnabled !== false,
  };
}

export class SqliteAdminSettingsRepository implements IAdminSettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getBundle(): Promise<Result<AdminSettingsBundle>> {
    try {
      const rows = await this.db.getAllAsync<{ key: string; value: string }>(
        `SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        KEYS.storeExtended,
        KEYS.pos,
        KEYS.payments,
        KEYS.taxes,
        KEYS.receipt,
        KEYS.inventory,
        KEYS.sync,
        KEYS.backup,
        KEYS.developer,
      );
      const map = new Map(rows.map((r) => [r.key, r.value]));
      const defaults = defaultAdminSettingsBundle();
      const inventoryRaw = parseJson(
        map.get(KEYS.inventory),
        defaults.inventory,
      ) as InventorySettings & Record<string, unknown>;
      const receiptRaw = parseJson(
        map.get(KEYS.receipt),
        defaults.receipt,
      ) as ReceiptSettings & Record<string, unknown>;

      return ok({
        storeExtended: parseJson(map.get(KEYS.storeExtended), defaults.storeExtended),
        pos: parseJson(map.get(KEYS.pos), defaults.pos),
        payments: parseJson(map.get(KEYS.payments), defaults.payments),
        taxes: parseJson(map.get(KEYS.taxes), defaults.taxes),
        receipt: normalizeReceipt(receiptRaw),
        inventory: normalizeInventory(inventoryRaw),
        sync: parseJson(map.get(KEYS.sync), defaults.sync),
        backup: parseJson(map.get(KEYS.backup), defaults.backup),
        developer: parseJson(map.get(KEYS.developer), defaults.developer),
      });
    } catch (cause) {
      return err(AppError.database('Impossible de charger les paramètres admin', cause));
    }
  }

  async setStoreExtended(value: StoreExtendedSettings): Promise<Result<void>> {
    return this.upsert(KEYS.storeExtended, value);
  }

  async setPos(value: PosSettings): Promise<Result<void>> {
    return this.upsert(KEYS.pos, value);
  }

  async setPayments(value: PaymentsSettings): Promise<Result<void>> {
    return this.upsert(KEYS.payments, value);
  }

  async setTaxes(value: TaxSettings): Promise<Result<void>> {
    return this.upsert(KEYS.taxes, value);
  }

  async setReceipt(value: ReceiptSettings): Promise<Result<void>> {
    return this.upsert(KEYS.receipt, value);
  }

  async setInventory(value: InventorySettings): Promise<Result<void>> {
    return this.upsert(KEYS.inventory, value);
  }

  async setSyncMeta(value: SyncMetaSettings): Promise<Result<void>> {
    return this.upsert(KEYS.sync, value);
  }

  async setBackup(value: BackupSettings): Promise<Result<void>> {
    return this.upsert(KEYS.backup, value);
  }

  async setDeveloper(value: DeveloperSettings): Promise<Result<void>> {
    return this.upsert(KEYS.developer, value);
  }

  private async upsert(key: string, value: unknown): Promise<Result<void>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          key,
          JSON.stringify(value),
          new Date().toISOString(),
        );
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer les paramètres', cause));
    }
  }
}
