import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { verifyHashChain } from '@/core/compliance/receiptHash';
import type { Order } from '@/features/checkout/domain/types';
import { SCHEMA_VERSION } from '@/database/schema';

export type ComplianceReport = {
  hashChainValid: boolean;
  hashChainMessage: string;
  orphanReceipts: number[];
  missingReceiptNumbers: number[];
  duplicateReceiptNumbers: number[];
  auditEntryCount: number;
  invalidAuditEntries: number;
  pendingSnapshots: number;
  archiveSnapshotCount: number;
  openDailySnapshots: number;
  schemaVersion: number;
};

export class ComplianceValidationService {
  constructor(private readonly db: SQLiteDatabase) {}

  async runFullReport(): Promise<Result<ComplianceReport>> {
    try {
      const orders = await this.loadAllOrders();
      const chain = await verifyHashChain(orders);

      const receiptNumbers = orders.map((o) => o.receiptNumber).sort((a, b) => a - b);
      const duplicateReceiptNumbers = receiptNumbers.filter(
        (n, i) => i > 0 && receiptNumbers[i - 1] === n,
      );
      const missingReceiptNumbers = this.findMissingReceiptNumbers(receiptNumbers);
      const orphanReceipts = orders.length === 0
        ? []
        : orders
            .filter((o, i, arr) => {
              if (i === 0) return o.previousHash !== null;
              return o.previousHash !== arr[i - 1]!.receiptHash;
            })
            .map((o) => o.receiptNumber);

      const auditRow = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM audit_logs`,
      );
      const invalidAudit = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM audit_logs WHERE payload_json IS NULL OR payload_json = ''`,
      );
      const pendingSnapshots = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM compliance_snapshots WHERE synced = 0`,
      );
      const archiveCount = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM compliance_snapshots`,
      );
      const openDaily = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM daily_snapshots WHERE status = 'OPEN'`,
      );

      return ok({
        hashChainValid: chain.valid,
        hashChainMessage: chain.message,
        orphanReceipts,
        missingReceiptNumbers,
        duplicateReceiptNumbers,
        auditEntryCount: auditRow?.count ?? 0,
        invalidAuditEntries: invalidAudit?.count ?? 0,
        pendingSnapshots: pendingSnapshots?.count ?? 0,
        archiveSnapshotCount: archiveCount?.count ?? 0,
        openDailySnapshots: openDaily?.count ?? 0,
        schemaVersion: SCHEMA_VERSION,
      });
    } catch (cause) {
      return err(AppError.database('Validation compliance échouée', cause));
    }
  }

  private async loadAllOrders(): Promise<Order[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      receipt_number: number;
      user_id: string;
      customer_id: string | null;
      status: 'completed' | 'voided';
      subtotal_cents: number;
      discount_cents: number;
      vat_cents: number;
      total_cents: number;
      notes: string | null;
      previous_hash: string | null;
      receipt_hash: string;
      created_at: string;
      device_id: string;
      app_version: string;
    }>(`SELECT * FROM orders ORDER BY receipt_number ASC`);

    const orders: Order[] = [];
    for (const row of rows) {
      const lines = await this.db.getAllAsync<{
        id: string;
        order_id: string;
        product_id: string | null;
        product_name: string;
        quantity: number;
        unit_price_cents: number;
        discount_cents: number;
        vat_rate: number;
        vat_cents: number;
        line_total_cents: number;
      }>(`SELECT * FROM order_lines WHERE order_id = ?`, row.id);

      const payments = await this.db.getAllAsync<{
        id: string;
        order_id: string;
        method: Order['payments'][0]['method'];
        amount_cents: number;
        provider: string | null;
        provider_reference: string | null;
        status: Order['payments'][0]['status'];
        created_at: string;
      }>(`SELECT * FROM payments WHERE order_id = ?`, row.id);

      orders.push({
        id: row.id,
        receiptNumber: row.receipt_number,
        userId: row.user_id,
        customerId: row.customer_id,
        status: row.status,
        subtotalCents: row.subtotal_cents,
        discountCents: row.discount_cents,
        vatCents: row.vat_cents,
        totalCents: row.total_cents,
        notes: row.notes,
        previousHash: row.previous_hash,
        receiptHash: row.receipt_hash,
        createdAt: row.created_at,
        deviceId: row.device_id,
        appVersion: row.app_version,
        lines: lines.map((l) => ({
          id: l.id,
          orderId: l.order_id,
          productId: l.product_id,
          productName: l.product_name,
          quantity: l.quantity,
          unitPriceCents: l.unit_price_cents,
          discountCents: l.discount_cents,
          vatRate: l.vat_rate,
          vatCents: l.vat_cents,
          lineTotalCents: l.line_total_cents,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          orderId: p.order_id,
          method: p.method,
          amountCents: p.amount_cents,
          provider: p.provider,
          providerReference: p.provider_reference,
          status: p.status,
          createdAt: p.created_at,
        })),
      });
    }
    return orders;
  }

  private findMissingReceiptNumbers(sorted: number[]): number[] {
    if (sorted.length === 0) return [];
    const missing: number[] = [];
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    const set = new Set(sorted);
    for (let n = min; n <= max; n += 1) {
      if (!set.has(n)) missing.push(n);
    }
    return missing;
  }
}
