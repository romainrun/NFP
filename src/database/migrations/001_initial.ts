import type { SQLiteDatabase } from 'expo-sqlite';
import { INITIAL_SCHEMA_SQL, SCHEMA_VERSION } from '@/database/schema';

export async function migrateToV1(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(INITIAL_SCHEMA_SQL);
  await db.runAsync(
    'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
    SCHEMA_VERSION,
    new Date().toISOString(),
  );
}
