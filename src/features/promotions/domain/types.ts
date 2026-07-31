export type ProductPromotionRule = {
  productId: string;
  discountBps: number;
  isActive: boolean;
};

export function normalizeDiscountBps(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10_000, Math.max(0, Math.round(value)));
}
