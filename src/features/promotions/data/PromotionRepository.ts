import type { Result } from '@/core/types/Result';
import type { ProductPromotionRule, PromotionRule } from '@/features/promotions/domain/types';

export interface IPromotionRepository {
  listPromotionRules(): Promise<Result<PromotionRule[]>>;
  setPromotionRule(rule: PromotionRule): Promise<Result<PromotionRule[]>>;
  removePromotionRule(id: string): Promise<Result<PromotionRule[]>>;
  /** Legacy product percent rules for POS auto-apply. */
  listRules(): Promise<Result<ProductPromotionRule[]>>;
  setRule(rule: ProductPromotionRule): Promise<Result<ProductPromotionRule[]>>;
  removeRule(productId: string): Promise<Result<ProductPromotionRule[]>>;
}
