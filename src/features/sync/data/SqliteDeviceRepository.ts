import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { IDeviceRepository } from '@/features/sync/data/DeviceRepository';
import type { DeviceRecord, SyncLogEntry } from '@/features/sync/domain/device';

type DeviceRow = {
  id: string;
  device_name: string;
  platform: string;
  app_version: string;
  last_sync_at: string | null;
  sync_status: DeviceRecord['syncStatus'];
  is_online: number;
  created_at: string;
  updated_at: string;
};

function platformLabel(): string {
  return Platform.OS === 'ios'
    ? Platform.isPad
      ? 'iPad'
      : 'iPhone'
    : Platform.OS === 'android'
      ? 'Android'
      : Platform.OS;
}

function deviceId(): string {
  return `${Platform.OS}-${Constants.sessionId ?? 'device'}`;
}

function mapDevice(row: DeviceRow): DeviceRecord {
  return {
    id: row.id,
    deviceName: row.device_name,
    platform: row.platform,
    appVersion: row.app_version,
    lastSyncAt: row.last_sync_at,
    syncStatus: row.sync_status,
    isOnline: row.is_online === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteDeviceRepository implements IDeviceRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getLocalDevice(): Promise<Result<DeviceRecord>> {
    try {
      const id = deviceId();
      const existing = await this.db.getFirstAsync<DeviceRow>(
        `SELECT * FROM device_registry WHERE id = ?`,
        id,
      );
      if (existing) return ok(mapDevice(existing));

      const now = new Date().toISOString();
      await this.db.runAsync(
        `INSERT INTO device_registry (
          id, device_name, platform, app_version, last_sync_at,
          sync_status, is_online, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, 'never', 0, ?, ?)`,
        id,
        'Caisse principale',
        platformLabel(),
        APP_CONFIG.version,
        now,
        now,
      );
      const row = await this.db.getFirstAsync<DeviceRow>(
        `SELECT * FROM device_registry WHERE id = ?`,
        id,
      );
      if (!row) return err(AppError.database('Appareil introuvable'));
      return ok(mapDevice(row));
    } catch (cause) {
      return err(AppError.database('Impossible de lire l’appareil', cause));
    }
  }

  async updateDeviceName(name: string): Promise<Result<DeviceRecord>> {
    const trimmed = name.trim();
    if (!trimmed) return err(AppError.validation('Nom d’appareil requis'));
    const id = deviceId();
    const now = new Date().toISOString();
    try {
      await this.db.runAsync(
        `UPDATE device_registry SET device_name = ?, updated_at = ? WHERE id = ?`,
        trimmed,
        now,
        id,
      );
      return this.getLocalDevice();
    } catch (cause) {
      return err(AppError.database('Impossible de renommer l’appareil', cause));
    }
  }

  async updateSyncState(
    syncStatus: DeviceRecord['syncStatus'],
    isOnline: boolean,
    lastSyncAt?: string | null,
  ): Promise<Result<DeviceRecord>> {
    const id = deviceId();
    const now = new Date().toISOString();
    try {
      await this.getLocalDevice();
      await this.db.runAsync(
        `UPDATE device_registry SET sync_status = ?, is_online = ?, last_sync_at = ?, updated_at = ? WHERE id = ?`,
        syncStatus,
        isOnline ? 1 : 0,
        lastSyncAt ?? null,
        now,
        id,
      );
      return this.getLocalDevice();
    } catch (cause) {
      return err(AppError.database('Impossible de mettre à jour la sync', cause));
    }
  }

  async appendSyncLog(level: SyncLogEntry['level'], message: string): Promise<Result<void>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO sync_logs (id, level, message, created_at) VALUES (?, ?, ?, ?)`,
          Crypto.randomUUID(),
          level,
          message.slice(0, 500),
          new Date().toISOString(),
        );
        await txn.runAsync(
          `DELETE FROM sync_logs WHERE id NOT IN (
            SELECT id FROM sync_logs ORDER BY created_at DESC LIMIT 200
          )`,
        );
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer le log sync', cause));
    }
  }

  async listSyncLogs(limit = 50): Promise<Result<SyncLogEntry[]>> {
    try {
      const rows = await this.db.getAllAsync<{
        id: string;
        level: SyncLogEntry['level'];
        message: string;
        created_at: string;
      }>(
        `SELECT id, level, message, created_at FROM sync_logs ORDER BY created_at DESC LIMIT ?`,
        limit,
      );
      return ok(
        rows.map((row) => ({
          id: row.id,
          level: row.level,
          message: row.message,
          createdAt: row.created_at,
        })),
      );
    } catch (cause) {
      return err(AppError.database('Impossible de lire les logs sync', cause));
    }
  }
}
