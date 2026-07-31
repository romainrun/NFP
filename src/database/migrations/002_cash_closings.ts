import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateToV2(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cash_closings (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      opening_cash_cents INTEGER NOT NULL,
      counted_cash_cents INTEGER NOT NULL,
      expected_cash_cents INTEGER NOT NULL,
      gap_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      order_count INTEGER NOT NULL,
      payment_breakdown_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cash_closings_created_at ON cash_closings(created_at);
  `);

  await db.runAsync(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
    2,
    new Date().toISOString(),
  );
}
