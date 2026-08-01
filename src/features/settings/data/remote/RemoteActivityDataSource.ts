import type { ApiClient } from '@/core/http/ApiClient';
import { ok, type Result } from '@/core/types/Result';
import type { ActivityHistoryItem } from '@/features/settings/domain/activityHistory';
import { mapAuditToActivity } from '@/features/settings/domain/activityHistory';
import type { SyncAuditLogDto } from '@/features/sync/domain/syncApi';

type AuditLogsResponse = {
  items?: SyncAuditLogDto[];
  logs?: SyncAuditLogDto[];
};

/**
 * Fetches authoritative audit history from the backend.
 */
export class RemoteActivityDataSource {
  constructor(private readonly client: ApiClient) {}

  async fetchPage(limit: number, offset: number): Promise<Result<ActivityHistoryItem[]>> {
    const paths = [`/audit/logs?limit=${limit}&offset=${offset}`, `/activity?limit=${limit}&offset=${offset}`];

    for (const path of paths) {
      const result = await this.client.get<AuditLogsResponse>(path);
      if (!result.ok) continue;
      const raw = result.value?.items ?? result.value?.logs ?? [];
      return ok(raw.map((row) => this.mapDto(row)));
    }

    return ok([]);
  }

  async fetchAll(limit = 100): Promise<Result<ActivityHistoryItem[]>> {
    return this.fetchPage(limit, 0);
  }

  mapAuditLogs(logs: SyncAuditLogDto[]): ActivityHistoryItem[] {
    return logs.map((row) => this.mapDto(row));
  }

  private mapDto(row: SyncAuditLogDto): ActivityHistoryItem {
    const payloadJson = row.payload != null ? JSON.stringify(row.payload) : null;
    const mapped = mapAuditToActivity(
      row.action,
      payloadJson,
      row.employeeName ?? null,
      row.entityId ?? null,
    );
    return {
      id: row.id,
      icon: mapped.icon,
      title: mapped.title,
      subtitle: mapped.subtitle,
      createdAt: row.createdAt,
      employeeName: row.employeeName ?? null,
      source: 'server',
    };
  }
}
