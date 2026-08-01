import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateToV5(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS compliance_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      snapshot_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      device_id TEXT NOT NULL,
      employee_id TEXT,
      app_version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_type ON compliance_snapshots(snapshot_type);
    CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_synced ON compliance_snapshots(synced);

    CREATE TABLE IF NOT EXISTS daily_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      business_date TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      opening_cash_cents INTEGER,
      closing_cash_cents INTEGER,
      orders_count INTEGER NOT NULL DEFAULT 0,
      sales_amount_cents INTEGER NOT NULL DEFAULT 0,
      vat_totals_json TEXT NOT NULL DEFAULT '[]',
      payment_breakdown_json TEXT NOT NULL DEFAULT '[]',
      employee_ids_json TEXT NOT NULL DEFAULT '[]',
      device_id TEXT NOT NULL,
      app_version TEXT NOT NULL,
      snapshot_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TRIGGER IF NOT EXISTS orders_no_delete
    BEFORE DELETE ON orders
    BEGIN SELECT RAISE(ABORT, 'Orders are immutable — cannot delete'); END;

    CREATE TRIGGER IF NOT EXISTS order_lines_no_delete
    BEFORE DELETE ON order_lines
    BEGIN SELECT RAISE(ABORT, 'Order lines are immutable'); END;

    CREATE TRIGGER IF NOT EXISTS payments_no_delete
    BEFORE DELETE ON payments
    BEGIN SELECT RAISE(ABORT, 'Payments are immutable'); END;

    CREATE TRIGGER IF NOT EXISTS orders_immutable_monetary
    BEFORE UPDATE ON orders
    WHEN (
      OLD.receipt_number != NEW.receipt_number OR
      OLD.user_id != NEW.user_id OR
      OLD.subtotal_cents != NEW.subtotal_cents OR
      OLD.discount_cents != NEW.discount_cents OR
      OLD.vat_cents != NEW.vat_cents OR
      OLD.total_cents != NEW.total_cents OR
      OLD.previous_hash IS NOT NEW.previous_hash OR
      OLD.receipt_hash != NEW.receipt_hash OR
      OLD.created_at != NEW.created_at OR
      OLD.device_id != NEW.device_id OR
      OLD.app_version != NEW.app_version
    )
    BEGIN SELECT RAISE(ABORT, 'Order monetary/hash fields are immutable'); END;

    CREATE TRIGGER IF NOT EXISTS cash_closings_no_update
    BEFORE UPDATE ON cash_closings
    BEGIN SELECT RAISE(ABORT, 'Cash closings are immutable after validation'); END;

    CREATE TRIGGER IF NOT EXISTS cash_closings_no_delete
    BEFORE DELETE ON cash_closings
    BEGIN SELECT RAISE(ABORT, 'Cash closings cannot be deleted'); END;

    CREATE TRIGGER IF NOT EXISTS audit_logs_append_only
    BEFORE UPDATE ON audit_logs
    BEGIN SELECT RAISE(ABORT, 'Audit logs are append-only'); END;

    CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    BEGIN SELECT RAISE(ABORT, 'Audit logs cannot be deleted'); END;

    CREATE TRIGGER IF NOT EXISTS compliance_snapshots_no_update
    BEFORE UPDATE ON compliance_snapshots
    BEGIN SELECT RAISE(ABORT, 'Compliance snapshots are immutable'); END;

    CREATE TRIGGER IF NOT EXISTS compliance_snapshots_no_delete
    BEFORE DELETE ON compliance_snapshots
    BEGIN SELECT RAISE(ABORT, 'Compliance snapshots cannot be deleted'); END;
  `);

  await db.runAsync(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
    5,
    new Date().toISOString(),
  );
}
