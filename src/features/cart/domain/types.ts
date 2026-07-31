export type CartLine = {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: number;
  discountBps: number;
  vatRate: number;
  /** Line total TTC after line discount. */
  lineTotalCents: number;
  notes: string | null;
};

export type Cart = {
  id: string;
  userId: string;
  customerId: string | null;
  globalDiscountBps: number;
  notes: string | null;
  updatedAt: string;
  lines: CartLine[];
  /** Sum of line totals before global discount. */
  subtotalCents: number;
  /** Global discount amount in cents. */
  discountCents: number;
  /** VAT portion of payable total. */
  vatCents: number;
  /** Amount due TTC. */
  totalCents: number;
  itemCount: number;
};

export type AddToCartInput = {
  userId: string;
  productId: string;
  quantity?: number;
};
