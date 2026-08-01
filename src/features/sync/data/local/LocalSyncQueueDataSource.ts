import type { SQLiteDatabase } from 'expo-sqlite';
import { SqliteSyncRepository } from '@/features/sync/data/SqliteSyncRepository';

/**
 * Local SQLite data source for the generic offline sync queue.
 */
export class LocalSyncQueueDataSource extends SqliteSyncRepository {
  constructor(db: SQLiteDatabase) {
    super(db);
  }
}
