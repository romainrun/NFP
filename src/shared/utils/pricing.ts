/** Basis points: 100 bps = 1%. */

export function lineGrossCents(unitPriceCents: number, quantity: number): number {
  return Math.round(unitPriceCents * quantity);
}

export function applyDiscountBps(amountCents: number, discountBps: number): number {
  if (!Number.isFinite(discountBps) || discountBps <= 0) return amountCents;
  const clamped = Math.min(10_000, Math.max(0, Math.round(discountBps)));
  return Math.round((amountCents * (10_000 - clamped)) / 10_000);
}

/** Extract VAT included in a TTC amount. */
export function vatFromTtc(ttcCents: number, vatRate: number): number {
  if (!Number.isFinite(vatRate) || vatRate <= 0 || ttcCents <= 0) return 0;
  return Math.round((ttcCents * vatRate) / (100 + vatRate));
}

export function lineNetCents(
  unitPriceCents: number,
  quantity: number,
  lineDiscountBps = 0,
): number {
  return applyDiscountBps(lineGrossCents(unitPriceCents, quantity), lineDiscountBps);
}
