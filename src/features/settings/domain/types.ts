export type ThemePreference = 'system' | 'light' | 'dark';

export type DashboardWidgetId =
  | 'revenue_today'
  | 'revenue_week'
  | 'avg_basket'
  | 'tickets_today'
  | 'sales_chart'
  | 'top_products'
  | 'stock_alerts';

export type DashboardWidgetSetting = {
  id: DashboardWidgetId;
  isEnabled: boolean;
};

export type ShopInfo = {
  address: string;
  phone: string;
  siret: string;
};

/** Monday = 0 … Sunday = 6 (French retail week). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DayOpeningHours = {
  weekday: Weekday;
  isClosed: boolean;
  /** Opening time as decimal hour (9.5 = 09:30). */
  openHour: number;
  /** Closing time as decimal hour (19.5 = 19:30, 24 = midnight). */
  closeHour: number;
};

export type StoreOpeningHours = DayOpeningHours[];

export type AppSettings = {
  storeName: string;
  themePreference: ThemePreference;
  idleLogoutMinutes: number;
  openingHours: StoreOpeningHours;
  dashboardWidgets: DashboardWidgetSetting[];
  shopInfo: ShopInfo;
};

export function defaultShopInfo(): ShopInfo {
  return { address: '', phone: '', siret: '' };
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  revenue_today: 'CA du jour',
  revenue_week: 'CA semaine',
  avg_basket: 'Panier moyen',
  tickets_today: 'Tickets du jour',
  sales_chart: 'Graphique par heure',
  top_products: 'Top produits',
  stock_alerts: 'Alertes stock',
};

export function defaultDashboardWidgets(): DashboardWidgetSetting[] {
  return (
    [
      'revenue_today',
      'revenue_week',
      'avg_basket',
      'tickets_today',
      'sales_chart',
      'top_products',
      'stock_alerts',
    ] as DashboardWidgetId[]
  ).map((id) => ({ id, isEnabled: true }));
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

export function defaultOpeningHours(): StoreOpeningHours {
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({
    weekday,
    isClosed: weekday === 6,
    openHour: 9,
    closeHour: 19,
  }));
}

export function formatHourRange(day: DayOpeningHours): string {
  if (day.isClosed) return 'Fermé';
  return `${formatOpeningHour(day.openHour)} → ${formatOpeningHour(day.closeHour)}`;
}

export function formatOpeningHour(value: number): string {
  if (value >= 24) return '00h00';
  let hour = Math.floor(value);
  let minutes = Math.round((value - hour) * 60);
  if (minutes >= 60) {
    hour += 1;
    minutes = 0;
  }
  return `${String(hour).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}
