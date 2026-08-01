import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type {
  IActivityHistoryRepository,
  ListActivityInput,
} from '@/features/settings/data/ActivityHistoryRepository';
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

export class SqliteActivityHistoryRepository implements IActivityHistoryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
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
          };
        }),
      );
    } catch (cause) {
      return err(AppError.database('Impossible de lire l’historique', cause));
    }
  }

  async count(): Promise<Result<number>> {
    try {
      const placeholders = VISIBLE_ACTIVITY_ACTIONS.map(() => '?').join(', ');
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM audit_logs WHERE action IN (${placeholders})`,
        ...VISIBLE_ACTIVITY_ACTIONS,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter l’historique', cause));
    }
  }
}
