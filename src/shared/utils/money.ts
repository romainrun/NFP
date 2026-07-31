/** Convert euros (float UI) to integer cents for storage. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Convert stored cents to euros for forms/display math. */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Format cents as a French euro amount. */
export function formatMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Parse a French/decimal price string into euros number, or null if invalid. */
export function parseEurosInput(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
