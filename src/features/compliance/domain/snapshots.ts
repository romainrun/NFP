export type SnapshotType =
  | 'sale'
  | 'cash_closing'
  | 'inventory_adjustment'
  | 'daily_summary';

export type DailySnapshotStatus = 'OPEN' | 'CLOSED' | 'SYNCED';

export type ComplianceSnapshot = {
  id: string;
  snapshotType: SnapshotType;
  entityId: string;
  payloadJson: string;
  payloadHash: string;
  deviceId: string;
  employeeId: string | null;
  appVersion: string;
  createdAt: string;
  synced: boolean;
};

export type DailySnapshot = {
  id: string;
  businessDate: string;
  status: DailySnapshotStatus;
  openingCashCents: number | null;
  closingCashCents: number | null;
  ordersCount: number;
  salesAmountCents: number;
  vatTotalsJson: string;
  paymentBreakdownJson: string;
  employeeIdsJson: string;
  deviceId: string;
  appVersion: string;
  snapshotHash: string;
  payloadJson: string;
  createdAt: string;
  closedAt: string | null;
};
