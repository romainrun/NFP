export type AuthStackParamList = {
  PinLogin: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  Pos: undefined;
  Checkout: undefined;
  SaleComplete: { orderId: string; changeCents?: number };
  ProductList: undefined;
  ProductForm: { productId?: string };
  CategoryList: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
