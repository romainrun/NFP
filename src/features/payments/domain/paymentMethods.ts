/** Tender methods available at checkout (Naturally Forme). */
export const TENDER_METHODS = [
  'cash',
  'card',
  'online',
  'remote',
  'transfer',
  'amex',
  'gift_card',
  'store_credit',
] as const satisfies readonly import('@/features/payments/domain/PaymentProvider').PaymentMethod[];

export type TenderMethod = (typeof TENDER_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<
  import('@/features/payments/domain/PaymentProvider').PaymentMethod,
  string
> = {
  cash: 'Espèces',
  card: 'CB',
  online: 'Ventes en ligne',
  remote: 'Ventes à distance',
  transfer: 'Virement',
  amex: 'American Express',
  gift_card: 'Carte cadeau',
  store_credit: 'Avoir',
  split: 'Paiement mixte',
};

export const PAYMENT_METHOD_ICONS: Record<TenderMethod, string> = {
  cash: 'cash',
  card: 'credit-card',
  online: 'web',
  remote: 'phone',
  transfer: 'bank',
  amex: 'credit-card-outline',
  gift_card: 'gift',
  store_credit: 'ticket-percent',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as TenderMethod] ?? method;
}

/** Only cash needs a tendered amount / change. */
export function isCashMethod(
  method: import('@/features/payments/domain/PaymentProvider').PaymentMethod,
): boolean {
  return method === 'cash';
}

/** Methods that accept partial amounts in split checkout. */
export function isPartialTenderMethod(method: TenderMethod): boolean {
  return method !== 'cash';
}
