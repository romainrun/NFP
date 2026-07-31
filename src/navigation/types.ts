import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  PinLogin: undefined;
};

/** Primary authenticated destinations (former drawer routes). */
export type MainParamList = {
  Dashboard: undefined;
  Pos: undefined;
  SalesHistory: undefined;
  ProductList: undefined;
  CategoryList: undefined;
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
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
