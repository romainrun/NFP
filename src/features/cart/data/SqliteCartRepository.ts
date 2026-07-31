import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import type { Cart, CartLine } from '@/features/cart/domain/types';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { ProductPromotionRule } from '@/features/promotions/domain/types';
import { isPromotionRuleActive } from '@/features/promotions/domain/types';
import {
  applyDiscountBps,
  lineNetCents,
  vatFromTtc,
} from '@/shared/utils/pricing';

type CartRow = {
  id: string;
  user_id: string;
  customer_id: string | null;
  global_discount_bps: number;
  notes: string | null;
  updated_at: string;
};

type CartLineRow = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  discount_bps: number;
  vat_rate: number;
  notes: string | null;
  product_name: string;
  product_sku: string;
};

function mapLine(row: CartLineRow): CartLine {
  return {
    id: row.id,
    cartId: row.cart_id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    discountBps: row.discount_bps,
    vatRate: row.vat_rate,
    lineTotalCents: lineNetCents(row.unit_price_cents, row.quantity, row.discount_bps),
    notes: row.notes,
  };
}

function buildCart(row: CartRow, lines: CartLine[]): Cart {
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totalCents = applyDiscountBps(subtotalCents, row.global_discount_bps);
  const discountCents = subtotalCents - totalCents;
  const vatCents = lines.reduce((sum, line) => {
    const share =
      subtotalCents === 0
        ? 0
        : Math.round((line.lineTotalCents / subtotalCents) * totalCents);
    return sum + vatFromTtc(share, line.vatRate);
  }, 0);

  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    globalDiscountBps: row.global_discount_bps,
    notes: row.notes,
    updatedAt: row.updated_at,
    lines,
    subtotalCents,
    discountCents,
    vatCents,
    totalCents,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export class SqliteCartRepository implements ICartRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly products: IProductRepository,
  ) {}

  async getOrCreateForUser(userId: string): Promise<Result<Cart>> {
    try {
      const existing = await this.db.getFirstAsync<CartRow>(
        `SELECT * FROM cart WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
        userId,
      );

      if (existing) {
        return this.hydrate(existing.id);
      }

      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO cart (id, user_id, customer_id, global_discount_bps, notes, updated_at)
           VALUES (?, ?, NULL, 0, NULL, ?)`,
          id,
          userId,
          now,
        );
      });

      return this.hydrate(id);
    } catch (cause) {
      return err(AppError.database('Impossible de charger le panier', cause));
    }
  }

  async getById(cartId: string): Promise<Result<Cart>> {
    return this.hydrate(cartId);
  }

  async addProduct(
    userId: string,
    productId: string,
    quantity = 1,
  ): Promise<Result<Cart>> {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return err(AppError.validation('Quantité invalide'));
    }

    const cartResult = await this.getOrCreateForUser(userId);
    if (!cartResult.ok) return cartResult;

    const productResult = await this.products.getById(productId);
    if (!productResult.ok) return err(productResult.error);
    if (!productResult.value.isActive) {
      return err(AppError.validation('Cet article est inactif'));
    }

    try {
      const discountBps = await this.promotionDiscountBps(productId);
      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        const existing = await txn.getFirstAsync<{ id: string; quantity: number }>(
          `SELECT id, quantity FROM cart_lines
           WHERE cart_id = ? AND product_id = ? AND discount_bps = ?`,
          cartResult.value.id,
          productId,
          discountBps,
        );

        if (existing) {
          await txn.runAsync(
            `UPDATE cart_lines SET quantity = ? WHERE id = ?`,
            existing.quantity + quantity,
            existing.id,
          );
        } else {
          await txn.runAsync(
            `INSERT INTO cart_lines (
              id, cart_id, product_id, quantity, unit_price_cents,
              discount_bps, vat_rate, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
            Crypto.randomUUID(),
            cartResult.value.id,
            productId,
            quantity,
            productResult.value.priceCents,
            discountBps,
            productResult.value.vatRate,
          );
        }

        await txn.runAsync(
          `UPDATE cart SET updated_at = ? WHERE id = ?`,
          now,
          cartResult.value.id,
        );
      });

      return this.hydrate(cartResult.value.id);
    } catch (cause) {
      return err(AppError.database('Impossible d’ajouter l’article au panier', cause));
    }
  }

  private async promotionDiscountBps(productId: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      'promotions.product_rules',
    );
    if (!row?.value) return 0;
    try {
      const rules = JSON.parse(row.value) as ProductPromotionRule[];
      const rule = Array.isArray(rules)
        ? rules.find((item) => item.productId === productId && isPromotionRuleActive(item))
        : null;
      if (!rule || !Number.isFinite(rule.discountBps)) return 0;
      return Math.min(10_000, Math.max(0, Math.round(rule.discountBps)));
    } catch {
      return 0;
    }
  }

  async addByBarcode(
    userId: string,
    barcode: string,
    quantity = 1,
  ): Promise<Result<Cart>> {
    const code = barcode.trim();
    if (!code) return err(AppError.validation('Code-barres vide'));

    const product = await this.products.getByBarcode(code);
    if (!product.ok) {
      return err(AppError.notFound(`Aucun article pour le code ${code}`));
    }
    return this.addProduct(userId, product.value.id, quantity);
  }

  async addBySku(userId: string, sku: string, quantity = 1): Promise<Result<Cart>> {
    const code = sku.trim();
    if (!code) return err(AppError.validation('SKU vide'));

    const product = await this.products.getBySku(code);
    if (!product.ok) {
      return err(AppError.notFound(`Aucun article pour le SKU ${code}`));
    }
    return this.addProduct(userId, product.value.id, quantity);
  }

  async setLineQuantity(lineId: string, quantity: number): Promise<Result<Cart>> {
    if (!Number.isFinite(quantity) || quantity < 0) {
      return err(AppError.validation('Quantité invalide'));
    }

    try {
      const line = await this.db.getFirstAsync<{ cart_id: string }>(
        `SELECT cart_id FROM cart_lines WHERE id = ?`,
        lineId,
      );
      if (!line) return err(AppError.notFound('Ligne panier introuvable'));

      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        if (quantity === 0) {
          await txn.runAsync(`DELETE FROM cart_lines WHERE id = ?`, lineId);
        } else {
          await txn.runAsync(
            `UPDATE cart_lines SET quantity = ? WHERE id = ?`,
            quantity,
            lineId,
          );
        }
        await txn.runAsync(
          `UPDATE cart SET updated_at = ? WHERE id = ?`,
          now,
          line.cart_id,
        );
      });

      return this.hydrate(line.cart_id);
    } catch (cause) {
      return err(AppError.database('Impossible de modifier la quantité', cause));
    }
  }

  async removeLine(lineId: string): Promise<Result<Cart>> {
    return this.setLineQuantity(lineId, 0);
  }

  async setGlobalDiscountBps(
    cartId: string,
    discountBps: number,
  ): Promise<Result<Cart>> {
    if (!Number.isFinite(discountBps) || discountBps < 0 || discountBps > 10_000) {
      return err(AppError.validation('Remise invalide'));
    }

    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE cart SET global_discount_bps = ?, updated_at = ? WHERE id = ?`,
          Math.round(discountBps),
          new Date().toISOString(),
          cartId,
        );
      });
      return this.hydrate(cartId);
    } catch (cause) {
      return err(AppError.database('Impossible d’appliquer la remise', cause));
    }
  }

  async clear(cartId: string): Promise<Result<Cart>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(`DELETE FROM cart_lines WHERE cart_id = ?`, cartId);
        await txn.runAsync(
          `UPDATE cart SET global_discount_bps = 0, notes = NULL, updated_at = ? WHERE id = ?`,
          new Date().toISOString(),
          cartId,
        );
      });
      return this.hydrate(cartId);
    } catch (cause) {
      return err(AppError.database('Impossible de vider le panier', cause));
    }
  }

  private async hydrate(cartId: string): Promise<Result<Cart>> {
    try {
      const row = await this.db.getFirstAsync<CartRow>(
        `SELECT * FROM cart WHERE id = ?`,
        cartId,
      );
      if (!row) return err(AppError.notFound('Panier introuvable'));

      const lines = await this.db.getAllAsync<CartLineRow>(
        `SELECT
           cl.id, cl.cart_id, cl.product_id, cl.quantity, cl.unit_price_cents,
           cl.discount_bps, cl.vat_rate, cl.notes,
           p.name AS product_name, p.sku AS product_sku
         FROM cart_lines cl
         INNER JOIN products p ON p.id = cl.product_id
         WHERE cl.cart_id = ?
         ORDER BY cl.rowid ASC`,
        cartId,
      );

      return ok(buildCart(row, lines.map(mapLine)));
    } catch (cause) {
      return err(AppError.database('Impossible de charger le panier', cause));
    }
  }
}
