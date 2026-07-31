import type { Result } from '@/core/types/Result';
import type { ProductPromotionRule } from '@/features/promotions/domain/types';

export interface IPromotionRepository {
  listRules(): Promise<Result<ProductPromotionRule[]>>;
  setRule(rule: ProductPromotionRule): Promise<Result<ProductPromotionRule[]>>;
  removeRule(productId: string): Promise<Result<ProductPromotionRule[]>>;
}
