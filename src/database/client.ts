import * as SQLite from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { migrateToV1 } from '@/database/migrations/001_initial';
import { migrateToV2 } from '@/database/migrations/002_cash_closings';
import { SCHEMA_VERSION } from '@/database/schema';
import { seedDemoUsers } from '@/database/seed';
import { withWriteTransaction } from '@/database/transaction';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations',
  );
  const current = row?.version ?? 0;

  if (current < 1) {
    await withWriteTransaction(db, async (txn) => {
      await migrateToV1(txn);
    });
  }

  if (current < 2) {
    await migrateToV2(db);
  }

  if (SCHEMA_VERSION < current) {
    throw AppError.database(
      `Database schema version ${current} is newer than app schema ${SCHEMA_VERSION}`,
    );
  }
}

/**
 * Opens (and migrates) the singleton SQLite database.
 * All business writes must go through withWriteTransaction.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(APP_CONFIG.database.name);
        await db.execAsync('PRAGMA foreign_keys = ON;');
        await runMigrations(db);
        await seedDemoUsers(db);
        return db;
      } catch (cause) {
        databasePromise = null;
        throw AppError.database('Failed to open database', cause);
      }
    })();
  }

  return databasePromise;
}

export type Database = SQLite.SQLiteDatabase;
