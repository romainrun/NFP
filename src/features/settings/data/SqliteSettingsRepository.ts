import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { err, ok, type Result } from '@/core/types/Result';
import { AppError } from '@/core/errors/AppError';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type { AppSettings, ThemePreference } from '@/features/settings/domain/types';
import { withWriteTransaction } from '@/database/transaction';

const DEFAULTS: AppSettings = {
  storeName: 'NaturallyForme',
  themePreference: 'system',
  idleLogoutMinutes: APP_CONFIG.idleLogoutMs / 60_000,
};

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getSettings(): Promise<Result<AppSettings>> {
    try {
      const rows = await this.db.getAllAsync<{ key: string; value: string }>(
        `SELECT key, value FROM settings WHERE key IN (?, ?, ?)`,
        'store.name',
        'theme.preference',
        'security.idle_logout_minutes',
      );

      const map = new Map(rows.map((r) => [r.key, r.value]));
      const theme = (map.get('theme.preference') ?? DEFAULTS.themePreference) as ThemePreference;

      return ok({
        storeName: map.get('store.name') ?? DEFAULTS.storeName,
        themePreference: theme,
        idleLogoutMinutes: Number(
          map.get('security.idle_logout_minutes') ?? DEFAULTS.idleLogoutMinutes,
        ),
      });
    } catch (cause) {
      return err(AppError.database('Unable to load settings', cause));
    }
  }

  async setThemePreference(preference: ThemePreference): Promise<Result<void>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          'theme.preference',
          preference,
          new Date().toISOString(),
        );
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Unable to save theme preference', cause));
    }
  }
}
