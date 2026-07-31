import type { PaymentMethod } from '@/features/payments/domain/PaymentProvider';

export type OrderStatus = 'completed' | 'voided';

export type OrderLine = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  vatRate: number;
  vatCents: number;
  lineTotalCents: number;
};

export type OrderPayment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amountCents: number;
  provider: string | null;
  providerReference: string | null;
  status: 'captured' | 'failed' | 'pending';
  createdAt: string;
};

export type Order = {
  id: string;
  receiptNumber: number;
  userId: string;
  customerId: string | null;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  notes: string | null;
  previousHash: string | null;
  receiptHash: string;
  createdAt: string;
  deviceId: string;
  appVersion: string;
  lines: OrderLine[];
  payments: OrderPayment[];
};

export type SalePaymentInput = {
  method: Extract<PaymentMethod, 'cash' | 'card'>;
  amountCents: number;
  /** Cash tendered (for change calculation). Defaults to amountCents. */
  tenderedCents?: number;
};

export type CompleteSaleInput = {
  cartId: string;
  userId: string;
  payments: SalePaymentInput[];
  notes?: string | null;
};

export type CompleteSaleResult = {
  order: Order;
  changeCents: number;
};
