import type { OrderStatus } from '@/features/checkout/domain/types';

export type OrderSummary = {
  id: string;
  receiptNumber: number;
  createdAt: string;
  totalCents: number;
  vatCents: number;
  discountCents: number;
  status: OrderStatus;
  itemCount: number;
  paymentMethods: string[];
};

export type HourlySalesBucket = {
  hour: number;
  orderCount: number;
  totalCents: number;
};

export type PaymentBreakdown = {
  method: string;
  totalCents: number;
  orderCount: number;
};

export type SalesHistoryQuery = {
  fromIso: string;
  toIso: string;
};

export type SalesHistorySnapshot = {
  fromIso: string;
  toIso: string;
  orderCount: number;
  totalCents: number;
  vatCents: number;
  discountCents: number;
  averageTicketCents: number;
  hourly: HourlySalesBucket[];
  paymentBreakdown: PaymentBreakdown[];
  orders: OrderSummary[];
};
