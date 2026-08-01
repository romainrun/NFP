import type { AdminSettingsBundle } from '@/features/settings/domain/adminSettings';

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

export type SyncPullResponse = {
  serverTime: string;
  catalogVersion?: number;
  products?: unknown[];
  categories?: unknown[];
  promotions?: unknown[];
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
