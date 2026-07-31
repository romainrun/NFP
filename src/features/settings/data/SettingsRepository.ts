import type { Result } from '@/core/types/Result';
import type { AppSettings, ThemePreference } from '@/features/settings/domain/types';

export interface ISettingsRepository {
  getSettings(): Promise<Result<AppSettings>>;
  setThemePreference(preference: ThemePreference): Promise<Result<void>>;
}
