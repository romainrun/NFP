import type { PaymentBreakdown } from '@/features/checkout/domain/salesHistory';

export type CashClosingRecord = {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  openingCashCents: number;
  countedCashCents: number;
  expectedCashCents: number;
  gapCents: number;
  totalCents: number;
  orderCount: number;
  paymentBreakdown: PaymentBreakdown[];
  notes: string | null;
  createdAt: string;
};

export type SaveCashClosingInput = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  openingCashCents: number;
  countedCashCents: number;
  expectedCashCents: number;
  gapCents: number;
  totalCents: number;
  orderCount: number;
  paymentBreakdown: PaymentBreakdown[];
  notes?: string | null;
};
