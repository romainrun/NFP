import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  PinLogin: undefined;
};

/** Primary authenticated destinations (former drawer routes). */
export type MainParamList = {
  Dashboard: undefined;
  Pos: undefined;
  SalesHistory: undefined;
  CashClosing: undefined;
  Exports: undefined;
  ProductList: undefined;
  CategoryList: undefined;
  Inventory: undefined;
  Promotions: undefined;
  Members: undefined;
  Settings: undefined;
};

/** @deprecated Use MainParamList */
export type DrawerParamList = MainParamList;

export type AppStackParamList = {
  Main: NavigatorScreenParams<MainParamList> | undefined;
  Checkout: undefined;
  SaleComplete: { orderId: string; changeCents?: number };
  ProductForm: { productId?: string; initialBarcode?: string };
  AdminStore: undefined;
  AdminPos: undefined;
  AdminPayments: undefined;
  AdminTaxes: undefined;
  AdminReceipts: undefined;
  AdminInventory: undefined;
  AdminPromotions: undefined;
  AdminEmployees: undefined;
  AdminDevices: undefined;
  AdminSync: undefined;
  AdminServerBackups: undefined;
  AdminImportExport: undefined;
  AdminActivity: undefined;
  AdminDeveloper: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
