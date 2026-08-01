import { APP_CONFIG } from '@/core/config/appConfig';
import type { PaymentMethod } from '@/features/payments/domain/PaymentProvider';
import { VAT_RATES } from '@/features/products/domain/types';

export type StoreExtendedSettings = {
  logoUri: string | null;
  email: string;
  website: string;
  vatNumber: string;
  currency: string;
  timezone: string;
  language: string;
  latitude: string;
  longitude: string;
  receiptFooterText: string;
  returnPolicy: string;
};

export type PosSettings = {
  posName: string;
  deviceName: string;
  startingReceiptNumber: number;
  autoPrintReceipt: boolean;
  confirmBeforeClearCart: boolean;
  confirmBeforeVoidSale: boolean;
  autoLockMinutes: number;
};

export type PaymentMethodConfig = {
  method: PaymentMethod;
  enabled: boolean;
  sortOrder: number;
};

export type PaymentsSettings = {
  methods: PaymentMethodConfig[];
  defaultMethod: PaymentMethod;
  maxCashCents: number;
  enableSplitPayment: boolean;
};

export type VatRateConfig = {
  id: string;
  label: string;
  rate: number;
  isActive: boolean;
};

export type TaxSettings = {
  rates: VatRateConfig[];
  defaultRateId: string;
};

export type ReceiptSettings = {
  logoUri: string | null;
  headerText: string;
  footerText: string;
  showLogoOnReceipt: boolean;
  qrCodeEnabled: boolean;
  numberingEnabled: boolean;
};

/** Small-store inventory options — thresholds kept as internal defaults only. */
export type InventorySettings = {
  allowNegativeStock: boolean;
  warnBeforeOutOfStock: boolean;
};

export type SyncMetaSettings = {
  apiUrl: string;
  backendVersion: string | null;
  catalogVersion: number;
  lastSuccessfulSyncAt: string | null;
  backendAvailable: boolean;
  newCatalogAvailable: boolean;
  newDataAvailable: boolean;
  simulateOffline: boolean;
};

export type BackupSettings = {
  lastBackupAt: string | null;
  lastBackupPath: string | null;
};

export type DeveloperSettings = {
  enabled: boolean;
};

export type AdminSettingsBundle = {
  storeExtended: StoreExtendedSettings;
  pos: PosSettings;
  payments: PaymentsSettings;
  taxes: TaxSettings;
  receipt: ReceiptSettings;
  inventory: InventorySettings;
  sync: SyncMetaSettings;
  backup: BackupSettings;
  developer: DeveloperSettings;
};

/** Internal defaults for dashboard stock alerts (not exposed in admin UI). */
export const INTERNAL_LOW_STOCK_THRESHOLD = 5;
export const INTERNAL_CRITICAL_STOCK_THRESHOLD = 2;

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  'cash',
  'card',
  'online',
  'remote',
  'transfer',
  'amex',
  'gift_card',
  'store_credit',
];

export function defaultStoreExtended(): StoreExtendedSettings {
  return {
    logoUri: null,
    email: '',
    website: 'https://nf.tikilote.re/',
    vatNumber: '',
    currency: 'EUR',
    timezone: 'Indian/Reunion',
    language: 'fr',
    latitude: '',
    longitude: '',
    receiptFooterText: 'Merci pour votre confiance — Naturally Forme',
    returnPolicy: '',
  };
}

export function defaultPosSettings(): PosSettings {
  return {
    posName: 'Caisse Naturally Forme',
    deviceName: 'Caisse principale',
    startingReceiptNumber: 1,
    autoPrintReceipt: false,
    confirmBeforeClearCart: true,
    confirmBeforeVoidSale: true,
    autoLockMinutes: APP_CONFIG.idleLogoutMs / 60_000,
  };
}

export function defaultPaymentsSettings(): PaymentsSettings {
  return {
    methods: PAYMENT_METHOD_ORDER.map((method, index) => ({
      method,
      enabled: method !== 'amex',
      sortOrder: index,
    })),
    defaultMethod: 'cash',
    maxCashCents: 500_000,
    enableSplitPayment: true,
  };
}

export function defaultTaxSettings(): TaxSettings {
  const rates: VatRateConfig[] = VAT_RATES.map((rate) => ({
    id: `vat-${rate}`,
    label: `${rate} %`,
    rate,
    isActive: true,
  }));
  return {
    rates,
    defaultRateId: rates.find((r) => r.rate === 5.5)?.id ?? rates[0]?.id ?? 'vat-5.5',
  };
}

export function defaultReceiptSettings(): ReceiptSettings {
  return {
    logoUri: null,
    headerText: 'Naturally Forme',
    footerText: 'Merci pour votre visite',
    showLogoOnReceipt: true,
    qrCodeEnabled: false,
    numberingEnabled: true,
  };
}

export function defaultInventorySettings(): InventorySettings {
  return {
    allowNegativeStock: false,
    warnBeforeOutOfStock: true,
  };
}

export function defaultSyncMetaSettings(): SyncMetaSettings {
  return {
    apiUrl: 'https://api.nf.tikilote.re/v1',
    backendVersion: null,
    catalogVersion: 1,
    lastSuccessfulSyncAt: null,
    backendAvailable: false,
    newCatalogAvailable: false,
    newDataAvailable: false,
    simulateOffline: false,
  };
}

export function defaultBackupSettings(): BackupSettings {
  return {
    lastBackupAt: null,
    lastBackupPath: null,
  };
}

export function defaultDeveloperSettings(): DeveloperSettings {
  return { enabled: false };
}

export function defaultAdminSettingsBundle(): AdminSettingsBundle {
  return {
    storeExtended: defaultStoreExtended(),
    pos: defaultPosSettings(),
    payments: defaultPaymentsSettings(),
    taxes: defaultTaxSettings(),
    receipt: defaultReceiptSettings(),
    inventory: defaultInventorySettings(),
    sync: defaultSyncMetaSettings(),
    backup: defaultBackupSettings(),
    developer: defaultDeveloperSettings(),
  };
}
