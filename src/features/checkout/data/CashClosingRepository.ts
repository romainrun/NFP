import type { Result } from '@/core/types/Result';
import type {
  CashClosingRecord,
  SaveCashClosingInput,
} from '@/features/checkout/domain/cashClosing';

export interface ICashClosingRepository {
  save(input: SaveCashClosingInput): Promise<Result<CashClosingRecord>>;
  getLatestForDay(userId: string, dayIso: string): Promise<Result<CashClosingRecord | null>>;
}
