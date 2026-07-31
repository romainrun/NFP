import type { Result } from '@/core/types/Result';
import type {
  AdjustStockInput,
  CreateProductInput,
  Product,
  ProductListFilter,
  UpdateProductInput,
} from '@/features/products/domain/types';

export type ProductSalesStats = {
  quantitySold: number;
  revenueCents: number;
  ticketCount: number;
  lastSoldAt: string | null;
};

export interface IProductRepository {
  list(filter?: ProductListFilter): Promise<Result<Product[]>>;
  /** Active products ordered by lifetime quantity sold (then name). */
  listTopSelling(limit?: number): Promise<Result<Product[]>>;
  getById(id: string): Promise<Result<Product>>;
  getSalesStats(productId: string): Promise<Result<ProductSalesStats>>;
  getBySku(sku: string): Promise<Result<Product>>;
  getByBarcode(barcode: string): Promise<Result<Product>>;
  create(input: CreateProductInput, actorUserId?: string): Promise<Result<Product>>;
  update(input: UpdateProductInput, actorUserId?: string): Promise<Result<Product>>;
  deactivate(id: string, actorUserId?: string): Promise<Result<void>>;
  setFlags(
    id: string,
    flags: { isFavorite?: boolean; isQuick?: boolean },
    actorUserId?: string,
  ): Promise<Result<Product>>;
  adjustStock(input: AdjustStockInput): Promise<Result<Product>>;
}
