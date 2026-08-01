import type { Result } from '@/core/types/Result';
import type { ActivityHistoryItem } from '@/features/settings/domain/activityHistory';

export type ListActivityInput = {
  limit: number;
  offset: number;
};

export interface IActivityHistoryRepository {
  list(input: ListActivityInput): Promise<Result<ActivityHistoryItem[]>>;
  count(): Promise<Result<number>>;
}
