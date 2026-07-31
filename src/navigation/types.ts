import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  PinLogin: undefined;
};

export type DrawerParamList = {
  Dashboard: undefined;
  Pos: undefined;
  SalesHistory: undefined;
  ProductList: undefined;
  CategoryList: undefined;
};

export type AppStackParamList = {
  Main: NavigatorScreenParams<DrawerParamList> | undefined;
  Checkout: undefined;
  SaleComplete: { orderId: string; changeCents?: number };
  ProductForm: { productId?: string };
  OrderDetail: { orderId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
