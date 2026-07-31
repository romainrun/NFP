import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { EnqueueSyncInput, SyncQueueItem } from '@/features/sync/domain/types';

type Row = {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  attempts: number;
  last_error: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): SyncQueueItem {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadJson: row.payload_json,
    attempts: row.attempts,
    lastError: row.last_error,
    status: row.status as SyncQueueItem['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteSyncRepository implements ISyncRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async enqueue(input: EnqueueSyncInput): Promise<Result<SyncQueueItem>> {
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await this.db.runAsync(
        `INSERT INTO sync_queue (
          id, entity_type, entity_id, operation, payload_json,
          attempts, last_error, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, NULL, 'pending', ?, ?)`,
        id,
        input.entityType,
        input.entityId,
        input.operation,
        JSON.stringify(input.payload),
        now,
        now,
      );
      const row = await this.db.getFirstAsync<Row>(`SELECT * FROM sync_queue WHERE id = ?`, id);
      if (!row) return err(AppError.database('Événement sync introuvable'));
      return ok(mapRow(row));
    } catch (cause) {
      return err(AppError.database('Impossible d’ajouter à la file sync', cause));
    }
  }

  async listPending(limit = 50): Promise<Result<SyncQueueItem[]>> {
    try {
      const rows = await this.db.getAllAsync<Row>(
        `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
        limit,
      );
      return ok(rows.map(mapRow));
    } catch (cause) {
      return err(AppError.database('Impossible de lire la file sync', cause));
    }
  }

  async countPending(): Promise<Result<number>> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter la file sync', cause));
    }
  }

  async markSynced(id: string): Promise<Result<void>> {
    try {
      await this.db.runAsync(
        `UPDATE sync_queue SET status = 'synced', updated_at = ? WHERE id = ?`,
        new Date().toISOString(),
        id,
      );
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de marquer sync', cause));
    }
  }
}
