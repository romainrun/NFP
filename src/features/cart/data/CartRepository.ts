import type { Result } from '@/core/types/Result';
import type { Cart } from '@/features/cart/domain/types';

export type AddProductOptions = {
  /** Manager/admin override when stock is insufficient. */
  bypassStockCheck?: boolean;
};

export interface ICartRepository {
  getOrCreateForUser(userId: string): Promise<Result<Cart>>;
  getById(cartId: string): Promise<Result<Cart>>;
  addProduct(
    userId: string,
    productId: string,
    quantity?: number,
    options?: AddProductOptions,
  ): Promise<Result<Cart>>;
  addByBarcode(
    userId: string,
    barcode: string,
    quantity?: number,
    options?: AddProductOptions,
  ): Promise<Result<Cart>>;
  addBySku(
    userId: string,
    sku: string,
    quantity?: number,
    options?: AddProductOptions,
  ): Promise<Result<Cart>>;
  setLineQuantity(lineId: string, quantity: number): Promise<Result<Cart>>;
  removeLine(lineId: string): Promise<Result<Cart>>;
  setLineDiscountBps(lineId: string, discountBps: number): Promise<Result<Cart>>;
  setGlobalDiscountBps(cartId: string, discountBps: number): Promise<Result<Cart>>;
  clear(cartId: string): Promise<Result<Cart>>;
}
