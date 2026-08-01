import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';
import type { SyncVersions } from '@/core/sync/SyncVersions';

export type SyncPushEvent = {
  localId: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SyncPushResultItem = {
  localId: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  serverId?: string;
  message?: string;
};

export type SyncPushResponse = {
  results: SyncPushResultItem[];
};

export type SyncPullRequest = SyncVersions;

export type SyncPullResponse = {
  serverTime: string;
  settingsVersion?: number;
  productsVersion?: number;
  inventoryVersion?: number;
  employeesVersion?: number;
  promotionsVersion?: number;
  activityVersion?: number;
  catalogVersion?: number;
  products?: unknown[];
  categories?: unknown[];
  promotions?: unknown[];
  employees?: unknown[];
  settings?: Partial<AdminSettingsBundle> | Record<string, unknown>;
  auditLogs?: SyncAuditLogDto[];
  deletedProductIds?: string[];
  deletedCategoryIds?: string[];
};

export type SyncAuditLogDto = {
  id: string;
  action: string;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  employeeName?: string | null;
};

export type SyncStatusResponse = {
  catalogVersion?: number;
  backendVersion?: string;
  apiVersion?: string;
};

export type ServerStatusResponse = {
  online?: boolean;
  apiVersion?: string;
  backendVersion?: string;
  version?: string;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastServerBackupAt?: string | null;
  lastBackupAt?: string | null;
  storageUsageBytes?: number | null;
  storageUsagePercent?: number | null;
  storageUsageLabel?: string | null;
};

export type BackupRequestResponse = {
  message?: string;
};
