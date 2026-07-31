import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { ProductSalesStats } from '@/features/products/data/ProductRepository';
import type {
  AdjustStockInput,
  CreateProductInput,
  Product,
  ProductListFilter,
  UpdateProductInput,
} from '@/features/products/domain/types';
import type { IAuditService } from '@/shared/services/audit/AuditService';

type ProductRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  price_cents: number;
  vat_rate: number;
  cost_cents: number | null;
  stock_quantity: number;
  is_favorite: number;
  is_quick: number;
  image_uri: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const PRODUCT_SELECT = `
  SELECT
    p.id, p.sku, p.barcode, p.name, p.description, p.category_id,
    c.name AS category_name,
    p.price_cents, p.vat_rate, p.cost_cents, p.stock_quantity,
    p.is_favorite, p.is_quick, p.image_uri, p.is_active,
    p.created_at, p.updated_at
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    priceCents: row.price_cents,
    vatRate: row.vat_rate,
    costCents: row.cost_cents,
    stockQuantity: row.stock_quantity,
    isFavorite: row.is_favorite === 1,
    isQuick: row.is_quick === 1,
    imageUri: row.image_uri,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateSku(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
  const suffix = Crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${slug || 'ART'}-${suffix}`;
}

export class SqliteProductRepository implements IProductRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly audit?: IAuditService,
  ) {}

  async list(filter: ProductListFilter = {}): Promise<Result<Product[]>> {
    try {
      const clauses: string[] = [];
      const params: (string | number)[] = [];

      if (!filter.includeInactive) {
        clauses.push('p.is_active = 1');
      }

      if (filter.categoryId) {
        clauses.push('p.category_id = ?');
        params.push(filter.categoryId);
      }

      if (filter.favoritesOnly) {
        clauses.push('p.is_favorite = 1');
      }

      if (filter.quickOnly) {
        clauses.push('p.is_quick = 1');
      }

      const search = filter.search?.trim();
      if (search) {
        clauses.push(
          `(p.name LIKE ? OR p.sku LIKE ? OR IFNULL(p.barcode, '') LIKE ?)`,
        );
        const like = `%${search}%`;
        params.push(like, like, like);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = await this.db.getAllAsync<ProductRow>(
        `${PRODUCT_SELECT} ${where}
         ORDER BY p.is_favorite DESC, p.name ASC`,
        ...params,
      );

      return ok(rows.map(mapProduct));
    } catch (cause) {
      return err(AppError.database('Impossible de charger les articles', cause));
    }
  }

  async listTopSelling(limit = 24): Promise<Result<Product[]>> {
    try {
      const rows = await this.db.getAllAsync<ProductRow & { sold_qty: number }>(
        `${PRODUCT_SELECT}
         LEFT JOIN (
           SELECT ol.product_id AS pid, SUM(ol.quantity) AS sold_qty
           FROM order_lines ol
           INNER JOIN orders o ON o.id = ol.order_id AND o.status = 'completed'
           WHERE ol.product_id IS NOT NULL
           GROUP BY ol.product_id
         ) sales ON sales.pid = p.id
         WHERE p.is_active = 1
         ORDER BY COALESCE(sales.sold_qty, 0) DESC, p.is_favorite DESC, p.name ASC
         LIMIT ?`,
        limit,
      );
      return ok(rows.map(mapProduct));
    } catch (cause) {
      return err(AppError.database('Impossible de charger les plus vendus', cause));
    }
  }

  async getById(id: string): Promise<Result<Product>> {
    try {
      const row = await this.db.getFirstAsync<ProductRow>(
        `${PRODUCT_SELECT} WHERE p.id = ?`,
        id,
      );
      if (!row) return err(AppError.notFound('Article introuvable'));
      return ok(mapProduct(row));
    } catch (cause) {
      return err(AppError.database('Impossible de charger l’article', cause));
    }
  }

  async getSalesStats(productId: string): Promise<Result<ProductSalesStats>> {
    try {
      const row = await this.db.getFirstAsync<{
        quantity_sold: number | null;
        revenue_cents: number | null;
        ticket_count: number;
        last_sold_at: string | null;
      }>(
        `SELECT
           COALESCE(SUM(ol.quantity), 0) AS quantity_sold,
           COALESCE(SUM(ol.line_total_cents), 0) AS revenue_cents,
           COUNT(DISTINCT o.id) AS ticket_count,
           MAX(o.created_at) AS last_sold_at
         FROM order_lines ol
         INNER JOIN orders o ON o.id = ol.order_id
         WHERE ol.product_id = ?
           AND o.status = 'completed'`,
        productId,
      );

      return ok({
        quantitySold: row?.quantity_sold ?? 0,
        revenueCents: row?.revenue_cents ?? 0,
        ticketCount: row?.ticket_count ?? 0,
        lastSoldAt: row?.last_sold_at ?? null,
      });
    } catch (cause) {
      return err(AppError.database('Impossible de charger les statistiques produit', cause));
    }
  }

  async getBySku(sku: string): Promise<Result<Product>> {
    try {
      const row = await this.db.getFirstAsync<ProductRow>(
        `${PRODUCT_SELECT} WHERE p.sku = ?`,
        sku.trim().toUpperCase(),
      );
      if (!row) return err(AppError.notFound('Article introuvable'));
      return ok(mapProduct(row));
    } catch (cause) {
      return err(AppError.database('Impossible de charger l’article', cause));
    }
  }

  async getByBarcode(barcode: string): Promise<Result<Product>> {
    try {
      const row = await this.db.getFirstAsync<ProductRow>(
        `${PRODUCT_SELECT} WHERE p.barcode = ?`,
        barcode.trim(),
      );
      if (!row) return err(AppError.notFound('Article introuvable'));
      return ok(mapProduct(row));
    } catch (cause) {
      return err(AppError.database('Impossible de charger l’article', cause));
    }
  }

  async create(input: CreateProductInput, actorUserId?: string): Promise<Result<Product>> {
    const validation = validateProductInput(input);
    if (validation) return err(AppError.validation(validation));

    const name = input.name.trim();
    const sku = (input.sku?.trim() || generateSku(name)).toUpperCase();

    try {
      const conflict = await this.db.getFirstAsync<{ id: string }>(
        `SELECT id FROM products WHERE sku = ?`,
        sku,
      );
      if (conflict) {
        return err(AppError.validation(`Le SKU ${sku} existe déjà`));
      }

      if (input.barcode?.trim()) {
        const barcodeConflict = await this.db.getFirstAsync<{ id: string }>(
          `SELECT id FROM products WHERE barcode = ?`,
          input.barcode.trim(),
        );
        if (barcodeConflict) {
          return err(AppError.validation('Ce code-barres est déjà utilisé'));
        }
      }

      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const stock = input.stockQuantity ?? 0;

      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO products (
            id, sku, barcode, name, description, category_id,
            price_cents, vat_rate, cost_cents, stock_quantity,
            is_favorite, is_quick, image_uri, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          id,
          sku,
          input.barcode?.trim() || null,
          name,
          input.description?.trim() || null,
          input.categoryId || null,
          input.priceCents,
          input.vatRate,
          input.costCents ?? null,
          stock,
          input.isFavorite ? 1 : 0,
          input.isQuick ? 1 : 0,
          input.imageUri ?? null,
          now,
          now,
        );

        if (stock !== 0 && actorUserId) {
          await txn.runAsync(
            `INSERT INTO inventory_movements (
              id, product_id, user_id, type, quantity, reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            Crypto.randomUUID(),
            id,
            actorUserId,
            'in',
            stock,
            'Stock initial',
            now,
          );
        }
      });

      await this.audit?.log({
        userId: actorUserId,
        action: 'product_create',
        entityType: 'product',
        entityId: id,
        payload: { sku, name, priceCents: input.priceCents },
      });

      return this.getById(id);
    } catch (cause) {
      return err(AppError.database('Impossible de créer l’article', cause));
    }
  }

  async update(input: UpdateProductInput, actorUserId?: string): Promise<Result<Product>> {
    const validation = validateProductInput(input);
    if (validation) return err(AppError.validation(validation));

    const sku = input.sku.trim().toUpperCase();
    const name = input.name.trim();

    try {
      const existing = await this.getById(input.id);
      if (!existing.ok) return existing;

      const skuConflict = await this.db.getFirstAsync<{ id: string }>(
        `SELECT id FROM products WHERE sku = ? AND id != ?`,
        sku,
        input.id,
      );
      if (skuConflict) {
        return err(AppError.validation(`Le SKU ${sku} existe déjà`));
      }

      if (input.barcode?.trim()) {
        const barcodeConflict = await this.db.getFirstAsync<{ id: string }>(
          `SELECT id FROM products WHERE barcode = ? AND id != ?`,
          input.barcode.trim(),
          input.id,
        );
        if (barcodeConflict) {
          return err(AppError.validation('Ce code-barres est déjà utilisé'));
        }
      }

      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE products SET
            sku = ?, barcode = ?, name = ?, description = ?, category_id = ?,
            price_cents = ?, vat_rate = ?, cost_cents = ?,
            is_favorite = ?, is_quick = ?, image_uri = ?, is_active = ?,
            updated_at = ?
           WHERE id = ?`,
          sku,
          input.barcode?.trim() || null,
          name,
          input.description?.trim() || null,
          input.categoryId || null,
          input.priceCents,
          input.vatRate,
          input.costCents ?? null,
          (input.isFavorite ?? existing.value.isFavorite) ? 1 : 0,
          (input.isQuick ?? existing.value.isQuick) ? 1 : 0,
          input.imageUri === undefined ? existing.value.imageUri : input.imageUri,
          (input.isActive ?? existing.value.isActive) ? 1 : 0,
          now,
          input.id,
        );
      });

      await this.audit?.log({
        userId: actorUserId,
        action: 'product_update',
        entityType: 'product',
        entityId: input.id,
        payload: { sku, name, priceCents: input.priceCents },
      });

      return this.getById(input.id);
    } catch (cause) {
      return err(AppError.database('Impossible de modifier l’article', cause));
    }
  }

  async deactivate(id: string, actorUserId?: string): Promise<Result<void>> {
    try {
      const existing = await this.getById(id);
      if (!existing.ok) return err(existing.error);

      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?`,
          new Date().toISOString(),
          id,
        );
      });

      await this.audit?.log({
        userId: actorUserId,
        action: 'product_deactivate',
        entityType: 'product',
        entityId: id,
        payload: { sku: existing.value.sku, name: existing.value.name },
      });

      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de désactiver l’article', cause));
    }
  }

  async setFlags(
    id: string,
    flags: { isFavorite?: boolean; isQuick?: boolean },
    actorUserId?: string,
  ): Promise<Result<Product>> {
    try {
      const existing = await this.getById(id);
      if (!existing.ok) return existing;

      const isFavorite = flags.isFavorite ?? existing.value.isFavorite;
      const isQuick = flags.isQuick ?? existing.value.isQuick;

      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE products
           SET is_favorite = ?, is_quick = ?, updated_at = ?
           WHERE id = ?`,
          isFavorite ? 1 : 0,
          isQuick ? 1 : 0,
          new Date().toISOString(),
          id,
        );
      });

      await this.audit?.log({
        userId: actorUserId,
        action: 'product_update',
        entityType: 'product',
        entityId: id,
        payload: { isFavorite, isQuick },
      });

      return this.getById(id);
    } catch (cause) {
      return err(AppError.database('Impossible de mettre à jour les drapeaux', cause));
    }
  }

  async adjustStock(input: AdjustStockInput): Promise<Result<Product>> {
    if (!Number.isFinite(input.quantity) || input.quantity === 0) {
      return err(AppError.validation('La quantité doit être non nulle'));
    }

    try {
      const existing = await this.getById(input.productId);
      if (!existing.ok) return existing;

      let delta = input.quantity;
      if (input.type === 'out') {
        delta = -Math.abs(input.quantity);
      } else if (input.type === 'in') {
        delta = Math.abs(input.quantity);
      }

      const nextStock = existing.value.stockQuantity + delta;
      if (nextStock < 0) {
        return err(AppError.validation('Stock insuffisant pour cette sortie'));
      }

      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?`,
          nextStock,
          now,
          input.productId,
        );
        await txn.runAsync(
          `INSERT INTO inventory_movements (
            id, product_id, user_id, type, quantity, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          Crypto.randomUUID(),
          input.productId,
          input.userId,
          input.type,
          delta,
          input.reason?.trim() || null,
          now,
        );
      });

      await this.audit?.log({
        userId: input.userId,
        action: 'inventory_change',
        entityType: 'product',
        entityId: input.productId,
        payload: {
          type: input.type,
          quantity: delta,
          previousStock: existing.value.stockQuantity,
          nextStock,
          reason: input.reason,
        },
      });

      return this.getById(input.productId);
    } catch (cause) {
      return err(AppError.database('Impossible d’ajuster le stock', cause));
    }
  }
}

function validateProductInput(
  input: Pick<CreateProductInput, 'name' | 'priceCents' | 'vatRate' | 'costCents'>,
): string | null {
  if (!input.name.trim()) return 'Le nom de l’article est requis';
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    return 'Le prix doit être un montant valide';
  }
  if (!Number.isFinite(input.vatRate) || input.vatRate < 0 || input.vatRate > 100) {
    return 'Le taux de TVA est invalide';
  }
  if (
    input.costCents !== undefined &&
    input.costCents !== null &&
    (!Number.isInteger(input.costCents) || input.costCents < 0)
  ) {
    return 'Le coût d’achat doit être un montant valide';
  }
  return null;
}
