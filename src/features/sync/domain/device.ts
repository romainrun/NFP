export type DeviceRecord = {
  id: string;
  deviceName: string;
  platform: string;
  appVersion: string;
  lastSyncAt: string | null;
  syncStatus: 'never' | 'pending' | 'synced' | 'failed' | 'offline';
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SyncLogEntry = {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
};
