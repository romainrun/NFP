import { chainHash, sha256 } from '@/core/security/hash';
import type { Order, OrderLine, OrderPayment } from '@/features/checkout/domain/types';

/** Deterministic receipt payload for Article 286 hash chain. */
export function buildReceiptHashPayload(input: {
  receiptNumber: number;
  previousHash: string | null;
  employeeId: string;
  deviceId: string;
  appVersion: string;
  createdAt: string;
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  notes: string | null;
  customerId: string | null;
  lines: OrderLine[];
  payments: OrderPayment[];
}): string {
  const lines = [...input.lines]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      discountCents: l.discountCents,
      vatRate: l.vatRate,
      vatCents: l.vatCents,
      lineTotalCents: l.lineTotalCents,
    }));

  const payments = [...input.payments]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      method: p.method,
      amountCents: p.amountCents,
      status: p.status,
    }));

  return JSON.stringify({
    receiptNumber: input.receiptNumber,
    previousHash: input.previousHash,
    employeeId: input.employeeId,
    deviceId: input.deviceId,
    appVersion: input.appVersion,
    createdAt: input.createdAt,
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    vatCents: input.vatCents,
    totalCents: input.totalCents,
    notes: input.notes,
    customerId: input.customerId,
    lines,
    payments,
  });
}

export async function computeReceiptHash(
  previousHash: string | null,
  payload: string,
): Promise<string> {
  return chainHash(previousHash ?? 'GENESIS', payload);
}

export async function verifyReceiptHash(order: Order): Promise<boolean> {
  const payload = buildReceiptHashPayload({
    receiptNumber: order.receiptNumber,
    previousHash: order.previousHash,
    employeeId: order.userId,
    deviceId: order.deviceId,
    appVersion: order.appVersion,
    createdAt: order.createdAt,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    vatCents: order.vatCents,
    totalCents: order.totalCents,
    notes: order.notes,
    customerId: order.customerId,
    lines: order.lines,
    payments: order.payments,
  });
  const expected = await computeReceiptHash(order.previousHash, payload);
  return expected === order.receiptHash;
}

export async function verifyHashChain(orders: Order[]): Promise<{
  valid: boolean;
  brokenAtReceiptNumber: number | null;
  message: string;
}> {
  const sorted = [...orders].sort((a, b) => a.receiptNumber - b.receiptNumber);
  let previousHash: string | null = null;

  for (const order of sorted) {
    if (order.previousHash !== previousHash) {
      return {
        valid: false,
        brokenAtReceiptNumber: order.receiptNumber,
        message: `previousHash incohérent au ticket #${order.receiptNumber}`,
      };
    }
    const hashValid = await verifyReceiptHash(order);
    if (!hashValid) {
      return {
        valid: false,
        brokenAtReceiptNumber: order.receiptNumber,
        message: `receiptHash invalide au ticket #${order.receiptNumber}`,
      };
    }
    previousHash = order.receiptHash;
  }

  return { valid: true, brokenAtReceiptNumber: null, message: 'Chaîne de hash valide' };
}

export async function payloadIntegrityHash(payload: Record<string, unknown>): Promise<string> {
  return sha256(JSON.stringify(payload));
}
