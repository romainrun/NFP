import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { hashPin } from '@/core/security/pin';
import { createSalt } from '@/core/security/hash';
import { withWriteTransaction } from '@/database/transaction';

type SeedUser = {
  employeeCode: string;
  displayName: string;
  role: 'admin' | 'manager' | 'cashier';
  pin: string;
};

/** Dev-only shared PIN — change before production. */
export const DEV_PIN = '0000';

const DEMO_USERS: SeedUser[] = [
  { employeeCode: 'MANU', displayName: 'Manuella', role: 'admin', pin: DEV_PIN },
  { employeeCode: 'ROMAIN', displayName: 'Romain', role: 'admin', pin: DEV_PIN },
  { employeeCode: 'MEDDY', displayName: 'Meddy', role: 'manager', pin: DEV_PIN },
];

/** Legacy demo accounts deactivated once the new team is seeded. */
const LEGACY_DEMO_CODES = ['ADMIN', 'MGR01', 'CASH1'] as const;

type SeedCategory = {
  key: string;
  name: string;
  color: string;
  sortOrder: number;
};

type SeedProduct = {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryKey: string;
  priceCents: number;
  vatRate: number;
  costCents?: number;
  stockQuantity: number;
  isFavorite?: boolean;
  isQuick?: boolean;
};

const SEED_CATEGORIES: SeedCategory[] = [
  { key: 'boissons', name: 'Boissons', color: '#0F766E', sortOrder: 1 },
  { key: 'epicerie', name: 'Épicerie', color: '#B45309', sortOrder: 2 },
  { key: 'frais', name: 'Frais', color: '#0369A1', sortOrder: 3 },
  { key: 'hygiene', name: 'Hygiène', color: '#7C3AED', sortOrder: 4 },
];

const SEED_PRODUCTS: SeedProduct[] = [
  {
    sku: 'EAU-50CL',
    barcode: '3000000000001',
    name: 'Eau minérale 50cl',
    categoryKey: 'boissons',
    priceCents: 120,
    vatRate: 5.5,
    costCents: 40,
    stockQuantity: 48,
    isFavorite: true,
    isQuick: true,
  },
  {
    sku: 'JUS-ORANGE',
    barcode: '3000000000002',
    name: 'Jus d’orange 1L',
    categoryKey: 'boissons',
    priceCents: 290,
    vatRate: 5.5,
    costCents: 150,
    stockQuantity: 24,
    isFavorite: true,
  },
  {
    sku: 'CAFE-250',
    name: 'Café moulu 250g',
    categoryKey: 'epicerie',
    priceCents: 549,
    vatRate: 5.5,
    costCents: 280,
    stockQuantity: 18,
    isQuick: true,
  },
  {
    sku: 'PASTA-500',
    name: 'Pâtes bio 500g',
    categoryKey: 'epicerie',
    priceCents: 219,
    vatRate: 5.5,
    costCents: 95,
    stockQuantity: 36,
  },
  {
    sku: 'YAOURT-NATURE',
    name: 'Yaourt nature x4',
    categoryKey: 'frais',
    priceCents: 249,
    vatRate: 5.5,
    costCents: 120,
    stockQuantity: 20,
    isFavorite: true,
  },
  {
    sku: 'LAIT-1L',
    barcode: '3000000000006',
    name: 'Lait demi-écrémé 1L',
    categoryKey: 'frais',
    priceCents: 129,
    vatRate: 5.5,
    costCents: 70,
    stockQuantity: 30,
    isQuick: true,
  },
  {
    sku: 'SAVON-MAIN',
    name: 'Savon mains 300ml',
    categoryKey: 'hygiene',
    priceCents: 399,
    vatRate: 20,
    costCents: 180,
    stockQuantity: 15,
  },
  {
    sku: 'SHAMP-400',
    name: 'Shampoing doux 400ml',
    categoryKey: 'hygiene',
    priceCents: 699,
    vatRate: 20,
    costCents: 320,
    stockQuantity: 12,
  },
];

/**
 * Upserts demo employees, deactivates legacy accounts, and seeds a starter catalog.
 * PIN hashes are always refreshed to DEV_PIN so local/VPS databases stay aligned.
 */
export async function seedDemoUsers(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  await withWriteTransaction(db, async (txn) => {
    for (const user of DEMO_USERS) {
      const salt = await createSalt();
      const pinHash = await hashPin(user.pin, salt);
      const existing = await txn.getFirstAsync<{ id: string }>(
        `SELECT id FROM users WHERE employee_code = ?`,
        user.employeeCode,
      );

      if (existing) {
        await txn.runAsync(
          `UPDATE users
           SET display_name = ?, role = ?, pin_salt = ?, pin_hash = ?,
               is_active = 1, updated_at = ?
           WHERE employee_code = ?`,
          user.displayName,
          user.role,
          salt,
          pinHash,
          now,
          user.employeeCode,
        );
      } else {
        await txn.runAsync(
          `INSERT INTO users (
            id, employee_code, display_name, role, pin_salt, pin_hash,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          Crypto.randomUUID(),
          user.employeeCode,
          user.displayName,
          user.role,
          salt,
          pinHash,
          now,
          now,
        );
      }
    }

    for (const code of LEGACY_DEMO_CODES) {
      await txn.runAsync(
        `UPDATE users SET is_active = 0, updated_at = ? WHERE employee_code = ?`,
        now,
        code,
      );
    }

    await txn.runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      'store.name',
      'NaturallyForme',
      now,
    );
  });

  await seedCatalogIfEmpty(db);
}

async function seedCatalogIfEmpty(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products',
  );
  if ((existing?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  const categoryIds = new Map<string, string>();

  await withWriteTransaction(db, async (txn) => {
    for (const category of SEED_CATEGORIES) {
      const id = Crypto.randomUUID();
      categoryIds.set(category.key, id);
      await txn.runAsync(
        `INSERT INTO categories (
          id, name, sort_order, color, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        id,
        category.name,
        category.sortOrder,
        category.color,
        now,
        now,
      );
    }

    for (const product of SEED_PRODUCTS) {
      const categoryId = categoryIds.get(product.categoryKey) ?? null;
      await txn.runAsync(
        `INSERT INTO products (
          id, sku, barcode, name, description, category_id,
          price_cents, vat_rate, cost_cents, stock_quantity,
          is_favorite, is_quick, image_uri, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`,
        Crypto.randomUUID(),
        product.sku,
        product.barcode ?? null,
        product.name,
        product.description ?? null,
        categoryId,
        product.priceCents,
        product.vatRate,
        product.costCents ?? null,
        product.stockQuantity,
        product.isFavorite ? 1 : 0,
        product.isQuick ? 1 : 0,
        now,
        now,
      );
    }
  });
}
