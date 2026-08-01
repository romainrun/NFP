import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { buildSyncEnvelope } from '@/core/compliance/syncPayload';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import { SyncEntityType, SyncOperation } from '@/core/sync/SyncOperation';
import type { ICashClosingRepository } from '@/features/checkout/data/CashClosingRepository';
import type {
  CashClosingRecord,
  SaveCashClosingInput,
} from '@/features/checkout/domain/cashClosing';
import type { PaymentBreakdown } from '@/features/checkout/domain/salesHistory';
import type { SqliteComplianceRepository } from '@/features/compliance/data/SqliteComplianceRepository';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { IAuditService } from '@/shared/services/audit/AuditService';

type Row = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  opening_cash_cents: number;
  counted_cash_cents: number;
  expected_cash_cents: number;
  gap_cents: number;
  total_cents: number;
  order_count: number;
  payment_breakdown_json: string;
  notes: string | null;
  created_at: string;
};

function mapRow(row: Row): CashClosingRecord {
  let paymentBreakdown: PaymentBreakdown[] = [];
  try {
    const parsed = JSON.parse(row.payment_breakdown_json) as PaymentBreakdown[];
    if (Array.isArray(parsed)) paymentBreakdown = parsed;
  } catch {
    paymentBreakdown = [];
  }
  return {
    id: row.id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    openingCashCents: row.opening_cash_cents,
    countedCashCents: row.counted_cash_cents,
    expectedCashCents: row.expected_cash_cents,
    gapCents: row.gap_cents,
    totalCents: row.total_cents,
    orderCount: row.order_count,
    paymentBreakdown,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export class SqliteCashClosingRepository implements ICashClosingRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly audit?: IAuditService,
    private readonly sync?: ISyncRepository,
    private readonly compliance?: SqliteComplianceRepository,
  ) {}

  async save(input: SaveCashClosingInput): Promise<Result<CashClosingRecord>> {
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO cash_closings (
            id, user_id, period_start, period_end,
            opening_cash_cents, counted_cash_cents, expected_cash_cents, gap_cents,
            total_cents, order_count, payment_breakdown_json, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          input.userId,
          input.periodStart,
          input.periodEnd,
          input.openingCashCents,
          input.countedCashCents,
          input.expectedCashCents,
          input.gapCents,
          input.totalCents,
          input.orderCount,
          JSON.stringify(input.paymentBreakdown),
          input.notes?.trim() || null,
          createdAt,
        );
      });
      const row = await this.db.getFirstAsync<Row>(
        `SELECT * FROM cash_closings WHERE id = ?`,
        id,
      );
      if (!row) return err(AppError.database('Clôture introuvable après enregistrement'));
      const record = mapRow(row);

      if (this.audit) {
        await this.audit.log({
          userId: input.userId,
          action: 'cash_closing',
          entityType: 'cash_closing',
          entityId: id,
          newValue: {
            gapCents: record.gapCents,
            totalCents: record.totalCents,
            orderCount: record.orderCount,
          },
        });
      }

      if (this.compliance) {
        await this.compliance.saveSnapshot('cash_closing', id, { record }, input.userId);
      }

      if (this.sync) {
        const envelope = await buildSyncEnvelope(record, input.userId, 1, {
          createdAt,
          updatedAt: createdAt,
        });
        await this.sync.enqueue({
          entityType: SyncEntityType.CASH_CLOSING,
          entityId: id,
          operation: SyncOperation.CASH_CLOSING_CREATE,
          payload: envelope as unknown as Record<string, unknown>,
        });
      }

      return ok(record);
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer la clôture', cause));
    }
  }

  async getLatestForDay(userId: string, dayIso: string): Promise<Result<CashClosingRecord | null>> {
    try {
      const dayPrefix = dayIso.slice(0, 10);
      const row = await this.db.getFirstAsync<Row>(
        `SELECT * FROM cash_closings
         WHERE user_id = ? AND period_start LIKE ?
         ORDER BY created_at DESC LIMIT 1`,
        userId,
        `${dayPrefix}%`,
      );
      return ok(row ? mapRow(row) : null);
    } catch (cause) {
      return err(AppError.database('Impossible de charger la clôture', cause));
    }
  }
}
