/**
 * Standardized sync queue operations.
 * New entities should enqueue using these — no new sync infrastructure required.
 */
export const SyncOperation = {
  SALE_CREATE: 'SALE_CREATE',
  SALE_CANCEL: 'SALE_CANCEL',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  INVENTORY_UPDATE: 'INVENTORY_UPDATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE_UPDATE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PROMOTION_UPDATE: 'PROMOTION_UPDATE',
} as const;

export type SyncOperationType = (typeof SyncOperation)[keyof typeof SyncOperation];

export const SyncEntityType = {
  SALE: 'sale',
  PRODUCT: 'product',
  INVENTORY: 'inventory',
  EMPLOYEE: 'employee',
  SETTINGS: 'settings',
  PAYMENT: 'payment',
  PROMOTION: 'promotion',
} as const;

export type SyncEntityTypeValue = (typeof SyncEntityType)[keyof typeof SyncEntityType];
