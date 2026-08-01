import type { Result } from '@/core/types/Result';
import type { EnqueueSyncInput, SyncQueueItem } from '@/features/sync/domain/types';

export interface ISyncRepository {
  enqueue(input: EnqueueSyncInput): Promise<Result<SyncQueueItem>>;
  listPending(limit?: number): Promise<Result<SyncQueueItem[]>>;
  listFailed(limit?: number): Promise<Result<SyncQueueItem[]>>;
  listAll(limit?: number): Promise<Result<SyncQueueItem[]>>;
  countPending(): Promise<Result<number>>;
  countFailed(): Promise<Result<number>>;
  markSynced(id: string): Promise<Result<void>>;
  markFailed(id: string, error: string): Promise<Result<void>>;
  requeue(id: string): Promise<Result<void>>;
}
