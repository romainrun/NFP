import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { err, ok, type Result } from '@/core/types/Result';
import { AppError } from '@/core/errors/AppError';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type {
  AppSettings,
  DashboardWidgetId,
  DashboardWidgetSetting,
  DayOpeningHours,
  ShopInfo,
  StoreOpeningHours,
  ThemePreference,
  Weekday,
} from '@/features/settings/domain/types';
import {
  defaultDashboardWidgets,
  defaultOpeningHours,
  defaultShopInfo,
} from '@/features/settings/domain/types';
import { withWriteTransaction } from '@/database/transaction';

const DEFAULTS: AppSettings = {
  storeName: 'NaturallyForme',
  themePreference: 'system',
  idleLogoutMinutes: APP_CONFIG.idleLogoutMs / 60_000,
  openingHours: defaultOpeningHours(),
  dashboardWidgets: defaultDashboardWidgets(),
  shopInfo: defaultShopInfo(),
};

const DASHBOARD_WIDGET_IDS = defaultDashboardWidgets().map((widget) => widget.id);

function parseOpeningHours(raw: string | undefined): StoreOpeningHours {
  if (!raw) return defaultOpeningHours();
  try {
    const parsed = JSON.parse(raw) as DayOpeningHours[];
    if (!Array.isArray(parsed) || parsed.length !== 7) {
      return defaultOpeningHours();
    }
    return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => {
      const day = parsed.find((item) => item.weekday === weekday);
      if (!day) {
        return defaultOpeningHours().find((d) => d.weekday === weekday)!;
      }
      return {
        weekday,
        isClosed: Boolean(day.isClosed),
        openHour: clamp(Number(day.openHour), 0, 23),
        closeHour: clamp(Number(day.closeHour), 1, 24),
      };
    });
  } catch {
    return defaultOpeningHours();
  }
}

function parseDashboardWidgets(raw: string | undefined): DashboardWidgetSetting[] {
  const defaults = defaultDashboardWidgets();
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as DashboardWidgetSetting[];
    if (!Array.isArray(parsed)) return defaults;
    const enabledById = new Map<DashboardWidgetId, boolean>();
    for (const widget of parsed) {
      if (DASHBOARD_WIDGET_IDS.includes(widget.id)) {
        enabledById.set(widget.id, Boolean(widget.isEnabled));
      }
    }
    return defaults.map((widget) => ({
      ...widget,
      isEnabled: enabledById.get(widget.id) ?? widget.isEnabled,
    }));
  } catch {
    return defaults;
  }
}

function parseShopInfo(raw: string | undefined): ShopInfo {
  if (!raw) return defaultShopInfo();
  try {
    const parsed = JSON.parse(raw) as Partial<ShopInfo>;
    return {
      address: String(parsed.address ?? ''),
      phone: String(parsed.phone ?? ''),
      siret: String(parsed.siret ?? ''),
    };
  } catch {
    return defaultShopInfo();
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getSettings(): Promise<Result<AppSettings>> {
    try {
      const rows = await this.db.getAllAsync<{ key: string; value: string }>(
        `SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?)`,
        'store.name',
        'theme.preference',
        'security.idle_logout_minutes',
        'store.opening_hours',
        'dashboard.widgets',
        'store.shop_info',
      );

      const map = new Map(rows.map((r) => [r.key, r.value]));
      const theme = (map.get('theme.preference') ??
        DEFAULTS.themePreference) as ThemePreference;

      return ok({
        storeName: map.get('store.name') ?? DEFAULTS.storeName,
        themePreference: theme,
        idleLogoutMinutes: Number(
          map.get('security.idle_logout_minutes') ?? DEFAULTS.idleLogoutMinutes,
        ),
        openingHours: parseOpeningHours(map.get('store.opening_hours')),
        dashboardWidgets: parseDashboardWidgets(map.get('dashboard.widgets')),
        shopInfo: parseShopInfo(map.get('store.shop_info')),
      });
    } catch (cause) {
      return err(AppError.database('Unable to load settings', cause));
    }
  }

  async setThemePreference(preference: ThemePreference): Promise<Result<void>> {
    return this.upsert('theme.preference', preference, 'Unable to save theme preference');
  }

  async setStoreName(name: string): Promise<Result<void>> {
    const trimmed = name.trim();
    if (!trimmed) {
      return err(AppError.validation('Le nom du magasin est requis'));
    }
    return this.upsert('store.name', trimmed, 'Unable to save store name');
  }

  async setOpeningHours(hours: StoreOpeningHours): Promise<Result<void>> {
    if (!Array.isArray(hours) || hours.length !== 7) {
      return err(AppError.validation('Horaires incomplets'));
    }
    for (const day of hours) {
      if (!day.isClosed && day.closeHour <= day.openHour) {
        return err(
          AppError.validation(
            'L’heure de fermeture doit être après l’ouverture',
          ),
        );
      }
    }
    return this.upsert(
      'store.opening_hours',
      JSON.stringify(hours),
      'Unable to save opening hours',
    );
  }

  async setDashboardWidgets(
    widgets: DashboardWidgetSetting[],
  ): Promise<Result<void>> {
    const defaults = defaultDashboardWidgets();
    if (!Array.isArray(widgets)) {
      return err(AppError.validation('Widgets incomplets'));
    }
    const enabledById = new Map<DashboardWidgetId, boolean>();
    for (const widget of widgets) {
      if (DASHBOARD_WIDGET_IDS.includes(widget.id)) {
        enabledById.set(widget.id, Boolean(widget.isEnabled));
      }
    }
    const normalized = defaults.map((widget) => ({
      ...widget,
      isEnabled: enabledById.get(widget.id) ?? widget.isEnabled,
    }));

    return this.upsert(
      'dashboard.widgets',
      JSON.stringify(normalized),
      'Unable to save dashboard widgets',
    );
  }

  async setShopInfo(info: ShopInfo): Promise<Result<void>> {
    return this.upsert(
      'store.shop_info',
      JSON.stringify({
        address: info.address.trim(),
        phone: info.phone.trim(),
        siret: info.siret.trim(),
      }),
      'Unable to save shop info',
    );
  }

  private async upsert(
    key: string,
    value: string,
    errorMessage: string,
  ): Promise<Result<void>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          key,
          value,
          new Date().toISOString(),
        );
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database(errorMessage, cause));
    }
  }
}
