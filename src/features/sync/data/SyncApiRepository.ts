import type { ApiClient } from '@/core/http/ApiClient';
import { err, ok, type Result } from '@/core/types/Result';
import type {
  SyncPullResponse,
  SyncPushEvent,
  SyncPushResponse,
  SyncStatusResponse,
} from '@/features/sync/domain/syncApi';

export interface ISyncApiRepository {
  push(events: SyncPushEvent[]): Promise<Result<SyncPushResponse>>;
  pull(since: string | null): Promise<Result<SyncPullResponse>>;
  status(): Promise<Result<SyncStatusResponse>>;
  health(): Promise<Result<{ ok: boolean; version?: string }>>;
}

export class SyncApiRepository implements ISyncApiRepository {
  constructor(private readonly client: ApiClient) {}

  async push(events: SyncPushEvent[]): Promise<Result<SyncPushResponse>> {
    const result = await this.client.post<SyncPushResponse>('/sync/push', { events });
    if (!result.ok) return result;
    return ok(result.value ?? { results: [] });
  }

  async pull(since: string | null): Promise<Result<SyncPullResponse>> {
    const query = since ? { since } : undefined;
    const result = await this.client.get<SyncPullResponse>('/sync/pull', query);
    if (!result.ok) return result;
    return ok(result.value ?? { serverTime: new Date().toISOString() });
  }

  async status(): Promise<Result<SyncStatusResponse>> {
    const result = await this.client.get<SyncStatusResponse>('/sync/status');
    if (!result.ok) return result;
    return ok(result.value ?? {});
  }

  async health(): Promise<Result<{ ok: boolean; version?: string }>> {
    const result = await this.client.get<{ version?: string }>('/health');
    if (!result.ok) return ok({ ok: false });
    return ok({ ok: true, version: result.value?.version });
  }
}
