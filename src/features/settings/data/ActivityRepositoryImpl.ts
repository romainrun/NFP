import { ok, type Result } from '@/core/types/Result';
import type {
  IActivityHistoryRepository,
  ListActivityInput,
} from '@/features/settings/data/ActivityHistoryRepository';
import type { LocalActivityDataSource } from '@/features/settings/data/local/LocalActivityDataSource';
import type { RemoteActivityDataSource } from '@/features/settings/data/remote/RemoteActivityDataSource';
import type { LocalAdminSettingsDataSource } from '@/features/settings/data/local/LocalAdminSettingsDataSource';
import type { RemoteSyncDataSource } from '@/features/sync/data/remote/RemoteSyncDataSource';
import type { ActivityHistoryItem } from '@/features/settings/domain/activityHistory';

/**
 * Activity history orchestrator. Server owns audit trail; local events are temporary.
 */
export class ActivityRepositoryImpl implements IActivityHistoryRepository {
  constructor(
    private readonly local: LocalActivityDataSource,
    private readonly remote: RemoteActivityDataSource,
    private readonly settingsLocal: LocalAdminSettingsDataSource,
    private readonly syncRemote: RemoteSyncDataSource,
  ) {}

  async list(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
    const online = await this.isBackendReachable();
    const snapshot = await this.local.getServerSnapshot();

    if (online && snapshot.ok && snapshot.value && snapshot.value.items.length > 0) {
      const items = snapshot.value.items.slice(input.offset, input.offset + input.limit);
      const localPending = await this.listLocalPending(input);
      if (localPending.ok && localPending.value.length > 0) {
        return ok(this.mergeItems(localPending.value, items));
      }
      return ok(items);
    }

    return this.local.listLocal(input);
  }

  async count(): Promise<Result<number>> {
    const online = await this.isBackendReachable();
    const snapshot = await this.local.getServerSnapshot();

    if (online && snapshot.ok && snapshot.value) {
      const localCount = await this.local.countLocal();
      return ok(snapshot.value.items.length + (localCount.ok ? localCount.value : 0));
    }

    return this.local.countLocal();
  }

  async refreshFromServer(): Promise<Result<void>> {
    if (!(await this.isBackendReachable())) return ok(undefined);

    const remote = await this.remote.fetchAll(100);
    if (remote.ok && remote.value.length > 0) {
      await this.local.replaceServerSnapshot(remote.value);
      return ok(undefined);
    }

    const versions = await this.settingsLocal.getSyncVersions();
    if (!versions.ok) return ok(undefined);

    const pull = await this.syncRemote.pull(versions.value);
    if (!pull.ok) return ok(undefined);

    const logs = pull.value.auditLogs ?? [];
    if (logs.length > 0) {
      const items = this.remote.mapAuditLogs(logs);
      await this.local.replaceServerSnapshot(items);
    }

    return ok(undefined);
  }

  private async isBackendReachable(): Promise<boolean> {
    if (await this.settingsLocal.isSimulateOffline()) return false;
    const health = await this.syncRemote.health();
    return health.ok && health.value.ok;
  }

  private async listLocalPending(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>> {
    const local = await this.local.listLocal({ limit: input.limit, offset: 0 });
    if (!local.ok) return local;
    const snapshot = await this.local.getServerSnapshot();
    const serverIds = new Set(
      snapshot.ok && snapshot.value ? snapshot.value.items.map((i) => i.id) : [],
    );
    const pending = local.value.filter((item) => !serverIds.has(item.id));
    return ok(pending.slice(0, input.limit));
  }

  private mergeItems(local: ActivityHistoryItem[], server: ActivityHistoryItem[]): ActivityHistoryItem[] {
    const seen = new Set(server.map((i) => i.id));
    const merged = [...local.filter((i) => !seen.has(i.id)), ...server];
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
