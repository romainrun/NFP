import { ok, type Result } from '@/core/types/Result';
import type {
  IActivityHistoryRepository,
  ListActivityInput,
} from '@/features/settings/data/ActivityHistoryRepository';
import type { RemoteActivityHistoryRepository } from '@/features/settings/data/RemoteActivityHistoryRepository';
import type { SqliteActivityCacheRepository } from '@/features/settings/data/SqliteActivityCacheRepository';
import type { SqliteAdminSettingsCacheRepository } from '@/features/settings/data/SqliteAdminSettingsCacheRepository';
import type { ActivityHistoryItem } from '@/features/settings/domain/activityHistory';
import type { ISyncApiRepository } from '@/features/sync/data/SyncApiRepository';
import { mapAuditToActivity } from '@/features/settings/domain/activityHistory';
import type { SyncAuditLogDto } from '@/features/sync/domain/syncApi';

/**
 * Activity history facade: server owns the audit trail; local SQLite holds temporary events.
 */
export class CachedActivityHistoryRepository implements IActivityHistoryRepository {
  constructor(
    private readonly cache: SqliteActivityCacheRepository,
    private readonly remote: RemoteActivityHistoryRepository,
    private readonly adminCache: SqliteAdminSettingsCacheRepository,
    private readonly syncApi: ISyncApiRepository,
  ) {}

  async list(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
    const online = await this.isBackendReachable();
    const snapshot = await this.cache.getServerSnapshot();

    if (online && snapshot.ok && snapshot.value && snapshot.value.items.length > 0) {
      const items = snapshot.value.items.slice(input.offset, input.offset + input.limit);
      const localPending = await this.listLocalPending(input);
      if (localPending.ok && localPending.value.length > 0) {
        return ok(this.mergeItems(localPending.value, items));
      }
      return ok(items);
    }

    const local = await this.cache.listLocal(input);
    return local;
  }

  async count(): Promise<Result<number>> {
    const online = await this.isBackendReachable();
    const snapshot = await this.cache.getServerSnapshot();

    if (online && snapshot.ok && snapshot.value) {
      const localCount = await this.cache.countLocal();
      return ok(snapshot.value.items.length + (localCount.ok ? localCount.value : 0));
    }

    return this.cache.countLocal();
  }

  async refreshFromServer(): Promise<Result<void>> {
    if (!(await this.isBackendReachable())) {
      return ok(undefined);
    }

    const remote = await this.remote.fetchAll(100);
    if (!remote.ok) {
      const pull = await this.pullAuditFromSync();
      if (!pull.ok) return ok(undefined);
      return ok(undefined);
    }

    await this.cache.replaceServerSnapshot(remote.value);
    return ok(undefined);
  }

  private async pullAuditFromSync(): Promise<Result<void>> {
    const bundle = await this.adminCache.getBundle();
    const since = bundle.ok ? bundle.value.sync.lastSuccessfulSyncAt : null;
    const pull = await this.syncApi.pull(since);
    if (!pull.ok) return ok(undefined);

    const logs = pull.value.auditLogs ?? [];
    if (logs.length === 0) return ok(undefined);

    const items = logs.map((row) => this.mapDto(row));
    await this.cache.replaceServerSnapshot(items);
    return ok(undefined);
  }

  private async isBackendReachable(): Promise<boolean> {
    const bundle = await this.adminCache.getBundle();
    if (!bundle.ok || bundle.value.sync.simulateOffline) return false;
    const health = await this.syncApi.health();
    return health.ok && health.value.ok;
  }

  private async listLocalPending(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
    const local = await this.cache.listLocal({ limit: input.limit, offset: 0 });
    if (!local.ok) return local;
    const snapshot = await this.cache.getServerSnapshot();
    const serverIds = new Set(snapshot.ok && snapshot.value ? snapshot.value.items.map((i) => i.id) : []);
    const pending = local.value.filter((item) => !serverIds.has(item.id));
    return ok(pending.slice(0, input.limit));
  }

  private mergeItems(local: ActivityHistoryItem[], server: ActivityHistoryItem[]): ActivityHistoryItem[] {
    const seen = new Set(server.map((i) => i.id));
    const merged = [...local.filter((i) => !seen.has(i.id)), ...server];
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
