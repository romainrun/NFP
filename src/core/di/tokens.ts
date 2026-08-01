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
  ProductRepository: 'ProductRepository',
  CategoryRepository: 'CategoryRepository',
  PromotionRepository: 'PromotionRepository',
  CartRepository: 'CartRepository',
  OrderRepository: 'OrderRepository',
  CashClosingRepository: 'CashClosingRepository',
  SyncRepository: 'SyncRepository',
  RemoteSyncDataSource: 'RemoteSyncDataSource',
  LocalAdminSettingsDataSource: 'LocalAdminSettingsDataSource',
  NoteRepository: 'NoteRepository',
  AdminSettingsRepository: 'AdminSettingsRepository',
  ActivityHistoryRepository: 'ActivityHistoryRepository',
  DeviceRepository: 'DeviceRepository',
  ServerInfoRepository: 'ServerInfoRepository',
  ImportExportRepository: 'ImportExportRepository',
  PaymentProvider: 'PaymentProvider',
  AuditService: 'AuditService',
  SecureStorage: 'SecureStorage',
  KeyValueStorage: 'KeyValueStorage',
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
