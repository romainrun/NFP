import type { Result } from '@/core/types/Result';
import type { DeviceRecord, SyncLogEntry } from '@/features/sync/domain/device';

export interface IDeviceRepository {
  getLocalDevice(): Promise<Result<DeviceRecord>>;
  updateDeviceName(name: string): Promise<Result<DeviceRecord>>;
  updateSyncState(
    syncStatus: DeviceRecord['syncStatus'],
    isOnline: boolean,
    lastSyncAt?: string | null,
  ): Promise<Result<DeviceRecord>>;
  appendSyncLog(level: SyncLogEntry['level'], message: string): Promise<Result<void>>;
  listSyncLogs(limit?: number): Promise<Result<SyncLogEntry[]>>;
}
