import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { ListActivityInput } from '@/features/settings/data/ActivityHistoryRepository';
import type { ActivityHistoryItem } from '@/features/settings/domain/activityHistory';
import {
  mapAuditToActivity,
  VISIBLE_ACTIVITY_ACTIONS,
} from '@/features/settings/domain/activityHistory';

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_id: string | null;
  payload_json: string | null;
  created_at: string;
  display_name: string | null;
};

const CACHE_KEY = 'cache.activity_snapshot';

type ActivityCachePayload = {
  items: ActivityHistoryItem[];
  fetchedAt: string;
};

/**
 * Local cache for activity: temporary audit rows + server snapshot.
 */
export class LocalActivityDataSource {
  constructor(private readonly db: SQLiteDatabase) {}

  async listLocal(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
    try {
      const placeholders = VISIBLE_ACTIVITY_ACTIONS.map(() => '?').join(', ');
      const rows = await this.db.getAllAsync<AuditRow>(
        `SELECT a.id, a.user_id, a.action, a.entity_id, a.payload_json, a.created_at,
                u.display_name
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE a.action IN (${placeholders})
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`,
        ...VISIBLE_ACTIVITY_ACTIONS,
        input.limit,
        input.offset,
      );

      return ok(
        rows.map((row) => {
          const mapped = mapAuditToActivity(
            row.action,
            row.payload_json,
            row.display_name,
            row.entity_id,
          );
          return {
            id: row.id,
            icon: mapped.icon,
            title: mapped.title,
            subtitle: mapped.subtitle,
            createdAt: row.created_at,
            employeeName: row.display_name,
            source: 'local' as const,
          };
        }),
      );
    } catch (cause) {
      return err(AppError.database('Impossible de lire l’historique local', cause));
    }
  }

  async countLocal(): Promise<Result<number>> {
    try {
      const placeholders = VISIBLE_ACTIVITY_ACTIONS.map(() => '?').join(', ');
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM audit_logs WHERE action IN (${placeholders})`,
        ...VISIBLE_ACTIVITY_ACTIONS,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter l’historique local', cause));
    }
  }

  async getServerSnapshot(): Promise<Result<ActivityCachePayload | null>> {
    try {
      const row = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`,
        CACHE_KEY,
      );
      if (!row?.value) return ok(null);
      return ok(JSON.parse(row.value) as ActivityCachePayload);
    } catch (cause) {
      return err(AppError.database('Impossible de lire le cache d’activité', cause));
    }
  }

  async replaceServerSnapshot(items: ActivityHistoryItem[]): Promise<Result<void>> {
    try {
      const payload: ActivityCachePayload = {
        items,
        fetchedAt: new Date().toISOString(),
      };
      await this.db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
        CACHE_KEY,
        JSON.stringify(payload),
        new Date().toISOString(),
      );
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de mettre à jour le cache d’activité', cause));
    }
  }
}
