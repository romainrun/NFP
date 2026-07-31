/** Standard French VAT rates used in retail POS. */
export const VAT_RATES = [0, 2.1, 5.5, 10, 20] as const;

export type VatRate = (typeof VAT_RATES)[number] | number;

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priceCents: number;
  vatRate: number;
  costCents: number | null;
  stockQuantity: number;
  isFavorite: boolean;
  isQuick: boolean;
  imageUri: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductListFilter = {
  search?: string;
  categoryId?: string | null;
  favoritesOnly?: boolean;
  quickOnly?: boolean;
  /** When true, include inactive products. Default: active only. */
  includeInactive?: boolean;
};

export type CreateCategoryInput = {
  name: string;
  color?: string | null;
  sortOrder?: number;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
  color?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateProductInput = {
  sku?: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  priceCents: number;
  vatRate: number;
  costCents?: number | null;
  stockQuantity?: number;
  isFavorite?: boolean;
  isQuick?: boolean;
  imageUri?: string | null;
};

export type UpdateProductInput = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  priceCents: number;
  vatRate: number;
  costCents?: number | null;
  isFavorite?: boolean;
  isQuick?: boolean;
  imageUri?: string | null;
  isActive?: boolean;
};

export type StockAdjustmentType = 'in' | 'out' | 'adjustment';

export type AdjustStockInput = {
  productId: string;
  userId: string;
  type: StockAdjustmentType;
  quantity: number;
  reason?: string | null;
};
