export type PromotionKind = 'percent' | 'fixed_amount';
export type PromotionTargetType = 'product' | 'category';

/** Unified promotion rule — product or category, percent or fixed amount. */
export type PromotionRule = {
  id: string;
  kind: PromotionKind;
  targetType: PromotionTargetType;
  productId: string | null;
  categoryId: string | null;
  /** Basis points when kind = percent (1000 = 10%). */
  discountBps: number;
  /** Fixed discount in cents when kind = fixed_amount. */
  discountCents: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

/** Legacy shape kept for cart auto-apply migration. */
export type ProductPromotionRule = {
  productId: string;
  discountBps: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function normalizeDiscountBps(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10_000, Math.max(0, Math.round(value)));
}

export function isPromotionRuleActive(rule: PromotionRule, at = new Date()): boolean {
  if (!rule.isActive) return false;
  const hasValue =
    rule.kind === 'percent'
      ? normalizeDiscountBps(rule.discountBps) > 0
      : rule.discountCents > 0;
  if (!hasValue) return false;
  const start = rule.startsAt ? new Date(`${rule.startsAt}T00:00:00`) : null;
  const end = rule.endsAt ? new Date(`${rule.endsAt}T23:59:59`) : null;
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

export function isProductPromotionRuleActive(
  rule: ProductPromotionRule,
  at = new Date(),
): boolean {
  if (!rule.isActive || normalizeDiscountBps(rule.discountBps) <= 0) return false;
  const start = rule.startsAt ? new Date(`${rule.startsAt}T00:00:00`) : null;
  const end = rule.endsAt ? new Date(`${rule.endsAt}T23:59:59`) : null;
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}
