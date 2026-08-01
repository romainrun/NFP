import { resolveAppVersion, resolveDeviceId } from '@/core/compliance/deviceContext';
import { payloadIntegrityHash } from '@/core/compliance/receiptHash';

export type SyncPayloadEnvelope<T> = {
  deviceId: string;
  employeeId: string;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  localVersion: number;
  payloadHash: string;
  data: T;
};

export async function buildSyncEnvelope<T>(
  data: T,
  employeeId: string,
  localVersion = 1,
  timestamps?: { createdAt?: string; updatedAt?: string },
): Promise<SyncPayloadEnvelope<T>> {
  const now = new Date().toISOString();
  const createdAt = timestamps?.createdAt ?? now;
  const updatedAt = timestamps?.updatedAt ?? now;
  const payloadHash = await payloadIntegrityHash(data as Record<string, unknown>);

  return {
    deviceId: resolveDeviceId(),
    employeeId,
    appVersion: resolveAppVersion(),
    createdAt,
    updatedAt,
    localVersion,
    payloadHash,
    data,
  };
}
