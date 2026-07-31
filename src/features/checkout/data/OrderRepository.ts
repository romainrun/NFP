import type { Result } from '@/core/types/Result';
import type {
  CompleteSaleInput,
  CompleteSaleResult,
  Order,
} from '@/features/checkout/domain/types';
import type {
  SalesHistoryQuery,
  SalesHistorySnapshot,
} from '@/features/checkout/domain/salesHistory';

export interface IOrderRepository {
  getById(orderId: string): Promise<Result<Order>>;
  completeSale(input: CompleteSaleInput): Promise<Result<CompleteSaleResult>>;
  getSalesHistory(query: SalesHistoryQuery): Promise<Result<SalesHistorySnapshot>>;
}
