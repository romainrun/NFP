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

export function isPromotionRuleActive(
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
