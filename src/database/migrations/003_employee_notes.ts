import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateToV3(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS employee_notes (
      id TEXT PRIMARY KEY NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      recipient_id TEXT REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_employee_notes_created_at ON employee_notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_employee_notes_recipient ON employee_notes(recipient_id);
  `);

  await db.runAsync(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
    3,
    new Date().toISOString(),
  );
}
