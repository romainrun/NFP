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
  { key: 'proteines', name: 'Protéines', color: '#C9A457', sortOrder: 1 },
  { key: 'glucides', name: 'Glucides & Masse', color: '#B88E3A', sortOrder: 2 },
  { key: 'performance', name: 'Performance', color: '#3A86FF', sortOrder: 3 },
  { key: 'sante', name: 'Santé & Bien-être', color: '#3CB371', sortOrder: 4 },
];

const SEED_PRODUCTS: SeedProduct[] = [
  {
    sku: 'ASN-RICE-CREAM',
    barcode: '3770000001001',
    name: 'RICE CREAM',
    description: 'Crème de riz pour prise de poids et performance.',
    categoryKey: 'glucides',
    priceCents: 2490,
    vatRate: 5.5,
    costCents: 1320,
    stockQuantity: 18,
    isFavorite: true,
    isQuick: true,
  },
  {
    sku: 'ASN-3CARBS',
    barcode: '3770000001002',
    name: '3CARBS : Carbohydrates Complex',
    description: 'Complexe de glucides pour performance et prise de masse.',
    categoryKey: 'glucides',
    priceCents: 3290,
    vatRate: 5.5,
    costCents: 1780,
    stockQuantity: 14,
    isFavorite: true,
  },
  {
    sku: 'ASN-ARMAGEDDON-100',
    barcode: '3770000001003',
    name: 'ARMAGEDDON 100',
    description: 'Formule performance pour entraînements intensifs.',
    categoryKey: 'performance',
    priceCents: 3990,
    vatRate: 5.5,
    costCents: 2150,
    stockQuantity: 10,
    isQuick: true,
  },
  {
    sku: 'ASN-MASSIVE-MEGA',
    barcode: '3770000001004',
    name: 'MASSIVE MEGA DOSE',
    description: 'Gainer haute calorie pour prise de poids.',
    categoryKey: 'glucides',
    priceCents: 4490,
    vatRate: 5.5,
    costCents: 2480,
    stockQuantity: 9,
  },
  {
    sku: 'ASN-FLEXI-JOINT',
    barcode: '3770000001005',
    name: 'FLEXI JOINT SUPPORT',
    description: 'Support articulaire pour sportifs.',
    categoryKey: 'sante',
    priceCents: 2690,
    vatRate: 5.5,
    costCents: 1420,
    stockQuantity: 16,
    isFavorite: true,
  },
  {
    sku: 'ASN-TRI-OMEGA',
    barcode: '3770000001006',
    name: 'TRI OMEGA',
    description: 'Complexe oméga pour bien-être quotidien.',
    categoryKey: 'sante',
    priceCents: 1990,
    vatRate: 5.5,
    costCents: 980,
    stockQuantity: 22,
    isQuick: true,
  },
  {
    sku: 'ASN-ACIDE-FOLIQUE',
    barcode: '3770000001007',
    name: 'ACIDE FOLIQUE',
    description: 'Complément alimentaire acide folique.',
    categoryKey: 'sante',
    priceCents: 1290,
    vatRate: 5.5,
    costCents: 520,
    stockQuantity: 28,
  },
  {
    sku: 'ASN-ALA',
    barcode: '3770000001008',
    name: 'ACIDE ALPHA LIPOIQUE',
    description: 'Complément acide alpha lipoïque.',
    categoryKey: 'sante',
    priceCents: 1790,
    vatRate: 5.5,
    costCents: 860,
    stockQuantity: 20,
  },
  {
    sku: 'ASN-ISOBOLIC',
    barcode: '3770000001009',
    name: 'Isobolic',
    description: 'Protéine en poudre premium.',
    categoryKey: 'proteines',
    priceCents: 5990,
    vatRate: 5.5,
    costCents: 3350,
    stockQuantity: 12,
    isFavorite: true,
  },
  {
    sku: 'ASN-AMINO-WHEY',
    barcode: '3770000001010',
    name: 'AMINO WHEY',
    description: 'Whey enrichie en acides aminés.',
    categoryKey: 'proteines',
    priceCents: 5490,
    vatRate: 5.5,
    costCents: 3080,
    stockQuantity: 15,
    isQuick: true,
  },
  {
    sku: 'ASN-VEGGIE-GREENS',
    barcode: '3770000001011',
    name: 'RAW VEGGIE AND GREENS 100% VEGAN',
    description: 'Protéines végétales et greens 100% vegan.',
    categoryKey: 'proteines',
    priceCents: 4990,
    vatRate: 5.5,
    costCents: 2780,
    stockQuantity: 11,
  },
  {
    sku: 'ASN-CASEINE-NATIVE',
    barcode: '3770000001012',
    name: 'CASEINE NATIVE',
    description: 'Caséine native pour diffusion lente.',
    categoryKey: 'proteines',
    priceCents: 5290,
    vatRate: 5.5,
    costCents: 2920,
    stockQuantity: 13,
  },
  {
    sku: 'ASN-WHEY-ZERO-LACTOSE',
    barcode: '3770000001013',
    name: 'PROTEINE WHEY ZERO LACTOSE 100% NATIVE',
    description: 'Whey native sans lactose.',
    categoryKey: 'proteines',
    priceCents: 5790,
    vatRate: 5.5,
    costCents: 3180,
    stockQuantity: 10,
  },
  {
    sku: 'ASN-ANABOLIC-WHEY',
    barcode: '3770000001014',
    name: 'ANABOLIC WHEY COMPLEX : Tri protéines',
    description: 'Complexe tri-protéines pour récupération et performance.',
    categoryKey: 'proteines',
    priceCents: 5690,
    vatRate: 5.5,
    costCents: 3120,
    stockQuantity: 12,
  },
];

const LEGACY_SEED_SKUS = [
  'EAU-50CL',
  'JUS-ORANGE',
  'CAFE-250',
  'PASTA-500',
  'YAOURT-NATURE',
  'LAIT-1L',
  'SAVON-MAIN',
  'SHAMP-400',
] as const;

const LEGACY_SEED_CATEGORIES = ['Boissons', 'Épicerie', 'Frais', 'Hygiène'] as const;

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

  await seedCatalog(db);
}

async function seedCatalog(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  const categoryIds = new Map<string, string>();

  await withWriteTransaction(db, async (txn) => {
    for (const sku of LEGACY_SEED_SKUS) {
      await txn.runAsync(
        `UPDATE products SET is_active = 0, updated_at = ? WHERE sku = ?`,
        now,
        sku,
      );
    }

    for (const name of LEGACY_SEED_CATEGORIES) {
      await txn.runAsync(
        `UPDATE categories SET is_active = 0, updated_at = ? WHERE name = ?`,
        now,
        name,
      );
    }

    for (const category of SEED_CATEGORIES) {
      const existing = await txn.getFirstAsync<{ id: string }>(
        `SELECT id FROM categories WHERE name = ?`,
        category.name,
      );
      const id = existing?.id ?? Crypto.randomUUID();
      categoryIds.set(category.key, id);
      if (existing) {
        await txn.runAsync(
          `UPDATE categories
           SET sort_order = ?, color = ?, is_active = 1, updated_at = ?
           WHERE id = ?`,
          category.sortOrder,
          category.color,
          now,
          id,
        );
      } else {
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
    }

    for (const product of SEED_PRODUCTS) {
      const categoryId = categoryIds.get(product.categoryKey) ?? null;
      const existing = await txn.getFirstAsync<{ id: string }>(
        `SELECT id FROM products WHERE sku = ?`,
        product.sku,
      );
      if (existing) {
        await txn.runAsync(
          `UPDATE products SET
            barcode = ?, name = ?, description = ?, category_id = ?,
            price_cents = ?, vat_rate = ?, cost_cents = ?,
            is_favorite = ?, is_quick = ?, is_active = 1, updated_at = ?
           WHERE id = ?`,
          product.barcode ?? null,
          product.name,
          product.description ?? null,
          categoryId,
          product.priceCents,
          product.vatRate,
          product.costCents ?? null,
          product.isFavorite ? 1 : 0,
          product.isQuick ? 1 : 0,
          now,
          existing.id,
        );
      } else {
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
    }
  });
}
