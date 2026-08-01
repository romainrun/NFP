import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_CONFIG } from '@/core/config/appConfig';

export function resolveDeviceId(): string {
  return `${Platform.OS}-${Constants.sessionId ?? 'device'}`;
}

export function resolveAppVersion(): string {
  return APP_CONFIG.version;
}

export type TraceabilityMeta = {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deviceId: string;
  appVersion: string;
};

export function createTraceability(employeeId: string): TraceabilityMeta {
  const now = new Date().toISOString();
  return {
    createdBy: employeeId,
    createdAt: now,
    deviceId: resolveDeviceId(),
    appVersion: resolveAppVersion(),
  };
}
