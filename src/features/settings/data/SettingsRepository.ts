import type { Result } from '@/core/types/Result';
import type {
  AppSettings,
  DashboardWidgetSetting,
  ShopInfo,
  StoreOpeningHours,
  ThemePreference,
} from '@/features/settings/domain/types';

export interface ISettingsRepository {
  getSettings(): Promise<Result<AppSettings>>;
  setThemePreference(preference: ThemePreference): Promise<Result<void>>;
  setOpeningHours(hours: StoreOpeningHours): Promise<Result<void>>;
  setDashboardWidgets(widgets: DashboardWidgetSetting[]): Promise<Result<void>>;
  setShopInfo(info: ShopInfo): Promise<Result<void>>;
  setStoreName(name: string): Promise<Result<void>>;
}
