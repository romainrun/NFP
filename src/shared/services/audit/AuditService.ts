import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { resolveDeviceId, resolveAppVersion } from '@/core/compliance/deviceContext';
import { withWriteTransaction } from '@/database/transaction';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'sale'
  | 'sale_voided'
  | 'refund'
  | 'void'
  | 'discount'
  | 'inventory_change'
  | 'inventory_updated'
  | 'product_create'
  | 'product_update'
  | 'product_disabled'
  | 'product_deactivate'
  | 'category_change'
  | 'user_change'
  | 'employee_updated'
  | 'promotion_modified'
  | 'settings_modified'
  | 'sync'
  | 'sync_started'
  | 'sync_finished'
  | 'sync_failed'
  | 'cash_closing'
  | 'error'
  | 'config_change';

export type ComplianceAuditPayload = {
  eventId: string;
  timestamp: string;
  employeeId: string | null;
  deviceId: string;
  appVersion: string;
  entityType: string | null;
  entityId: string | null;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export type AuditEntryInput = {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export interface IAuditService {
  log(entry: AuditEntryInput): Promise<void>;
}

export class SqliteAuditService implements IAuditService {
  constructor(private readonly db: SQLiteDatabase) {}

  async log(entry: AuditEntryInput): Promise<void> {
    const eventId = Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const deviceId = resolveDeviceId();
    const appVersion = resolveAppVersion();

    const compliancePayload: ComplianceAuditPayload = {
      eventId,
      timestamp,
      employeeId: entry.userId ?? null,
      deviceId,
      appVersion,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? entry.payload ?? null,
      metadata: entry.metadata ?? undefined,
    };

    await withWriteTransaction(this.db, async (txn) => {
      await txn.runAsync(
        `INSERT INTO audit_logs (
          id, user_id, action, entity_type, entity_id, payload_json,
          device_id, app_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        eventId,
        entry.userId ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        JSON.stringify(compliancePayload),
        deviceId,
        appVersion,
        timestamp,
      );
    });
  }
}
