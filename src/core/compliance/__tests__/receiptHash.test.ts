import { buildReceiptHashPayload } from '@/core/compliance/receiptHash';

describe('receiptHash payload', () => {
  const input = {
    receiptNumber: 1,
    previousHash: null,
    employeeId: 'user-1',
    deviceId: 'ios-device',
    appVersion: '0.1.0',
    createdAt: '2026-08-01T10:00:00.000Z',
    subtotalCents: 1000,
    discountCents: 0,
    vatCents: 50,
    totalCents: 1000,
    notes: null,
    customerId: null,
    lines: [
      {
        id: 'line-1',
        orderId: 'order-1',
        productId: 'prod-1',
        productName: 'Test',
        quantity: 1,
        unitPriceCents: 1000,
        discountCents: 0,
        vatRate: 5.5,
        vatCents: 50,
        lineTotalCents: 1000,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        orderId: 'order-1',
        method: 'cash' as const,
        amountCents: 1000,
        provider: 'local',
        providerReference: 'CASH-1',
        status: 'captured' as const,
        createdAt: '2026-08-01T10:00:00.000Z',
      },
    ],
  };

  it('builds deterministic JSON payload', () => {
    const p1 = buildReceiptHashPayload(input);
    const p2 = buildReceiptHashPayload(input);
    expect(p1).toBe(p2);
    expect(p1).toContain('"receiptNumber":1');
    expect(p1).toContain('"employeeId":"user-1"');
  });
});
