import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { withWriteTransaction } from '@/database/transaction';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'sale'
  | 'refund'
  | 'void'
  | 'discount'
  | 'inventory_change'
  | 'product_create'
  | 'product_update'
  | 'product_deactivate'
  | 'category_change'
  | 'sync'
  | 'error'
  | 'config_change';

export type AuditEntryInput = {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

export interface IAuditService {
  log(entry: AuditEntryInput): Promise<void>;
}

function resolveDeviceId(): string {
  return `${Platform.OS}-${Constants.sessionId ?? 'device'}`;
}

export class SqliteAuditService implements IAuditService {
  constructor(private readonly db: SQLiteDatabase) {}

  async log(entry: AuditEntryInput): Promise<void> {
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await withWriteTransaction(this.db, async (txn) => {
      await txn.runAsync(
        `INSERT INTO audit_logs (
          id, user_id, action, entity_type, entity_id, payload_json,
          device_id, app_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        entry.userId ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.payload ? JSON.stringify(entry.payload) : null,
        resolveDeviceId(),
        APP_CONFIG.version,
        createdAt,
      );
    });
  }
}
