export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  deltaLabel?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
};

export type TopProductStat = {
  id: string;
  name: string;
  quantitySold: number;
  revenueLabel: string;
};

export type HourlySalePoint = {
  hourLabel: string;
  amountCents: number;
};

export type DashboardSnapshot = {
  generatedAt: string;
  metrics: DashboardMetric[];
  topProducts: TopProductStat[];
  salesPerHour: HourlySalePoint[];
  inventoryAlerts: string[];
};
