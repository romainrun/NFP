import type { Result } from '@/core/types/Result';
import type {
  CompleteSaleInput,
  CompleteSaleResult,
  Order,
} from '@/features/checkout/domain/types';

export interface IOrderRepository {
  getById(orderId: string): Promise<Result<Order>>;
  completeSale(input: CompleteSaleInput): Promise<Result<CompleteSaleResult>>;
}
