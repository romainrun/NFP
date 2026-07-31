import type { PaymentMethod } from '@/features/payments/domain/PaymentProvider';

/** Tender methods available at checkout (Naturally Forme). */
export const TENDER_METHODS = [
  'cash',
  'card',
  'online',
  'remote',
  'transfer',
  'amex',
] as const satisfies readonly PaymentMethod[];

export type TenderMethod = (typeof TENDER_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
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
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

/** Only cash needs a tendered amount / change. */
export function isCashMethod(method: PaymentMethod): boolean {
  return method === 'cash';
}
