import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateToV4(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE users ADD COLUMN user_color TEXT;
    ALTER TABLE users ADD COLUMN last_login_at TEXT;
    ALTER TABLE users ADD COLUMN last_activity_at TEXT;
    ALTER TABLE users ADD COLUMN force_pin_change INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS device_registry (
      id TEXT PRIMARY KEY NOT NULL,
      device_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      app_version TEXT NOT NULL,
      last_sync_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'never',
      is_online INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
  `);

  await db.runAsync(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
    4,
    new Date().toISOString(),
  );
}
