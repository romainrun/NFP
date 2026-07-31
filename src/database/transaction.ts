import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';

/**
 * Runs a write unit of work inside a SQL transaction.
 * Uses exclusive transactions on native; falls back on web.
 */
export async function withWriteTransaction<T>(
  db: SQLiteDatabase,
  work: (db: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  let result!: T;

  try {
    if (Platform.OS === 'web') {
      await db.withTransactionAsync(async () => {
        result = await work(db);
      });
    } else {
      await db.withExclusiveTransactionAsync(async (txn) => {
        result = await work(txn);
      });
    }
  } catch (cause) {
    if (cause instanceof AppError) {
      throw cause;
    }
    throw AppError.database('Transaction failed', cause);
  }

  return result;
}
