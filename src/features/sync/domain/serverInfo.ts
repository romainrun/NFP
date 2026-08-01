/** Server-side status returned by the NFP backend API. */
export type ServerInfoSnapshot = {
  online: boolean;
  apiVersion: string | null;
  backendVersion: string | null;
  lastSyncAt: string | null;
  lastServerBackupAt: string | null;
  storageUsageBytes: number | null;
  storageUsageLabel: string | null;
  pendingOperations: number;
  apiUrl: string;
};

export type ServerBackupRequestResult = {
  ok: boolean;
  message: string;
};

/** Expected JSON from GET /server/status (or /status). */
export type ServerStatusApiResponse = {
  online?: boolean;
  apiVersion?: string;
  backendVersion?: string;
  version?: string;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastBackupAt?: string | null;
  lastServerBackupAt?: string | null;
  storageUsageBytes?: number | null;
  storageUsagePercent?: number | null;
  storageUsageLabel?: string | null;
};
