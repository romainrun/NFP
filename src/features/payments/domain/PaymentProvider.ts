/**
 * Payment provider port.
 * UI / checkout must only call startPayment (and cancel/status helpers).
 * Concrete adapters (Mock, Stripe Terminal, Worldline, …) register via DI later.
 */
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'gift_card'
  | 'store_credit'
  | 'split';

export type PaymentRequest = {
  amountCents: number;
  currency: 'EUR';
  method: PaymentMethod;
  orderId: string;
  reference: string;
};

export type PaymentResult = {
  success: boolean;
  provider: string;
  providerReference?: string;
  message?: string;
};

export interface PaymentProvider {
  readonly id: string;
  startPayment(request: PaymentRequest): Promise<PaymentResult>;
  cancelPayment?(providerReference: string): Promise<void>;
}
