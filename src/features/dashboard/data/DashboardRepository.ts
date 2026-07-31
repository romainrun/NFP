import type { Result } from '@/core/types/Result';
import type { DashboardSnapshot } from '@/features/dashboard/domain/types';

export interface IDashboardRepository {
  getSnapshot(): Promise<Result<DashboardSnapshot>>;
}
