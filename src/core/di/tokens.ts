/**
 * Injection tokens for the DI container.
 * String tokens avoid decorator metadata and stay explicit.
 */
export const TOKENS = {
  Database: 'Database',
  AuthRepository: 'AuthRepository',
  UserRepository: 'UserRepository',
  DashboardRepository: 'DashboardRepository',
  SettingsRepository: 'SettingsRepository',
  AuditService: 'AuditService',
  SecureStorage: 'SecureStorage',
  KeyValueStorage: 'KeyValueStorage',
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
