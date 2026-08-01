import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { resolveAppVersion, resolveDeviceId } from '@/core/compliance/deviceContext';
import { payloadIntegrityHash } from '@/core/compliance/receiptHash';
import { err, ok, type Result } from '@/core/types/Result';
import type {
  ComplianceSnapshot,
  DailySnapshot,
  DailySnapshotStatus,
  SnapshotType,
} from '@/features/compliance/domain/snapshots';

type SnapshotRow = {
  id: string;
  snapshot_type: string;
  entity_id: string;
  payload_json: string;
  payload_hash: string;
  device_id: string;
  employee_id: string | null;
  app_version: string;
  created_at: string;
  synced: number;
};

type DailyRow = {
  id: string;
  business_date: string;
  status: string;
  opening_cash_cents: number | null;
  closing_cash_cents: number | null;
  orders_count: number;
  sales_amount_cents: number;
  vat_totals_json: string;
  payment_breakdown_json: string;
  employee_ids_json: string;
  device_id: string;
  app_version: string;
  snapshot_hash: string;
  payload_json: string;
  created_at: string;
  closed_at: string | null;
};

export class SqliteComplianceRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async saveSnapshot(
    snapshotType: SnapshotType,
    entityId: string,
    payload: Record<string, unknown>,
    employeeId: string | null,
  ): Promise<Result<ComplianceSnapshot>> {
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const payloadJson = JSON.stringify(payload);
    const payloadHash = await payloadIntegrityHash(payload);

    try {
      await this.db.runAsync(
        `INSERT INTO compliance_snapshots (
          id, snapshot_type, entity_id, payload_json, payload_hash,
          device_id, employee_id, app_version, created_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        id,
        snapshotType,
        entityId,
        payloadJson,
        payloadHash,
        resolveDeviceId(),
        employeeId,
        resolveAppVersion(),
        createdAt,
      );
      return ok({
        id,
        snapshotType,
        entityId,
        payloadJson,
        payloadHash,
        deviceId: resolveDeviceId(),
        employeeId,
        appVersion: resolveAppVersion(),
        createdAt,
        synced: false,
      });
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer le snapshot', cause));
    }
  }

  async countPendingSnapshots(): Promise<Result<number>> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM compliance_snapshots WHERE synced = 0`,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter les snapshots', cause));
    }
  }

  async countAllSnapshots(): Promise<Result<number>> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM compliance_snapshots`,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter les archives', cause));
    }
  }

  async upsertDailyOpen(
    businessDate: string,
    employeeIds: string[],
    openingCashCents: number | null,
  ): Promise<Result<DailySnapshot>> {
    const existing = await this.getDaily(businessDate);
    if (existing.ok && existing.value) {
      return ok(existing.value);
    }

    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const payload = {
      businessDate,
      status: 'OPEN',
      openingCashCents,
      employeeIds,
    };
    const payloadJson = JSON.stringify(payload);
    const snapshotHash = await payloadIntegrityHash(payload);

    try {
      await this.db.runAsync(
        `INSERT INTO daily_snapshots (
          id, business_date, status, opening_cash_cents, closing_cash_cents,
          orders_count, sales_amount_cents, vat_totals_json, payment_breakdown_json,
          employee_ids_json, device_id, app_version, snapshot_hash, payload_json,
          created_at, closed_at
        ) VALUES (?, ?, 'OPEN', ?, NULL, 0, 0, '[]', '[]', ?, ?, ?, ?, ?, ?, NULL)`,
        id,
        businessDate,
        openingCashCents,
        JSON.stringify(employeeIds),
        resolveDeviceId(),
        resolveAppVersion(),
        snapshotHash,
        payloadJson,
        createdAt,
      );
      const created = await this.getDaily(businessDate);
      if (!created.ok) return created;
      if (!created.value) {
        return err(AppError.database('Snapshot journalier introuvable après création'));
      }
      return ok(created.value);
    } catch (cause) {
      return err(AppError.database('Impossible de créer le snapshot journalier', cause));
    }
  }

  async closeDaily(
    businessDate: string,
    input: {
      closingCashCents: number | null;
      ordersCount: number;
      salesAmountCents: number;
      vatTotals: unknown[];
      paymentBreakdown: unknown[];
      employeeIds: string[];
    },
  ): Promise<Result<DailySnapshot>> {
    const row = await this.db.getFirstAsync<DailyRow>(
      `SELECT * FROM daily_snapshots WHERE business_date = ?`,
      businessDate,
    );
    if (!row) {
      return err(AppError.notFound('Snapshot journalier introuvable'));
    }
    if (row.status !== 'OPEN') {
      return err(AppError.validation('Journée déjà clôturée'));
    }

    const closedAt = new Date().toISOString();
    const payload = {
      businessDate,
      status: 'CLOSED',
      openingCashCents: row.opening_cash_cents,
      closingCashCents: input.closingCashCents,
      ordersCount: input.ordersCount,
      salesAmountCents: input.salesAmountCents,
      vatTotals: input.vatTotals,
      paymentBreakdown: input.paymentBreakdown,
      employeeIds: input.employeeIds,
      closedAt,
    };
    const payloadJson = JSON.stringify(payload);
    const snapshotHash = await payloadIntegrityHash(payload);

    try {
      await this.db.runAsync(
        `UPDATE daily_snapshots SET
          status = 'CLOSED',
          closing_cash_cents = ?,
          orders_count = ?,
          sales_amount_cents = ?,
          vat_totals_json = ?,
          payment_breakdown_json = ?,
          employee_ids_json = ?,
          snapshot_hash = ?,
          payload_json = ?,
          closed_at = ?
        WHERE business_date = ?`,
        input.closingCashCents,
        input.ordersCount,
        input.salesAmountCents,
        JSON.stringify(input.vatTotals),
        JSON.stringify(input.paymentBreakdown),
        JSON.stringify(input.employeeIds),
        snapshotHash,
        payloadJson,
        closedAt,
        businessDate,
      );

      await this.saveSnapshot('daily_summary', businessDate, payload, null);

      const updated = await this.getDaily(businessDate);
      if (!updated.ok || !updated.value) {
        return err(AppError.database('Snapshot journalier introuvable après clôture'));
      }
      return ok(updated.value);
    } catch (cause) {
      return err(AppError.database('Impossible de clôturer le snapshot journalier', cause));
    }
  }

  async getDaily(businessDate: string): Promise<Result<DailySnapshot | null>> {
    try {
      const row = await this.db.getFirstAsync<DailyRow>(
        `SELECT * FROM daily_snapshots WHERE business_date = ?`,
        businessDate,
      );
      if (!row) return ok(null);
      return ok(this.mapDaily(row));
    } catch (cause) {
      return err(AppError.database('Impossible de charger le snapshot journalier', cause));
    }
  }

  async getOpenDailyCount(): Promise<Result<number>> {
    try {
      const row = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM daily_snapshots WHERE status = 'OPEN'`,
      );
      return ok(row?.count ?? 0);
    } catch (cause) {
      return err(AppError.database('Impossible de compter les journées ouvertes', cause));
    }
  }

  private mapDaily(row: DailyRow): DailySnapshot {
    return {
      id: row.id,
      businessDate: row.business_date,
      status: row.status as DailySnapshotStatus,
      openingCashCents: row.opening_cash_cents,
      closingCashCents: row.closing_cash_cents,
      ordersCount: row.orders_count,
      salesAmountCents: row.sales_amount_cents,
      vatTotalsJson: row.vat_totals_json,
      paymentBreakdownJson: row.payment_breakdown_json,
      employeeIdsJson: row.employee_ids_json,
      deviceId: row.device_id,
      appVersion: row.app_version,
      snapshotHash: row.snapshot_hash,
      payloadJson: row.payload_json,
      createdAt: row.created_at,
      closedAt: row.closed_at,
    };
  }
}
