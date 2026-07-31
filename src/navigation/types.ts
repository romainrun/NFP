export type AuthStackParamList = {
  PinLogin: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  ProductList: undefined;
  ProductForm: { productId?: string };
  CategoryList: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
