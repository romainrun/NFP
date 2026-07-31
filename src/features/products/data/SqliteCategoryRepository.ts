import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/products/domain/types';

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  color: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    color: row.color,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(includeInactive = false): Promise<Result<Category[]>> {
    try {
      const rows = await this.db.getAllAsync<CategoryRow>(
        includeInactive
          ? `SELECT * FROM categories ORDER BY sort_order ASC, name ASC`
          : `SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`,
      );
      return ok(rows.map(mapCategory));
    } catch (cause) {
      return err(AppError.database('Impossible de charger les catégories', cause));
    }
  }

  async getById(id: string): Promise<Result<Category>> {
    try {
      const row = await this.db.getFirstAsync<CategoryRow>(
        `SELECT * FROM categories WHERE id = ?`,
        id,
      );
      if (!row) return err(AppError.notFound('Catégorie introuvable'));
      return ok(mapCategory(row));
    } catch (cause) {
      return err(AppError.database('Impossible de charger la catégorie', cause));
    }
  }

  async create(input: CreateCategoryInput): Promise<Result<Category>> {
    const name = input.name.trim();
    if (!name) return err(AppError.validation('Le nom de catégorie est requis'));

    try {
      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const sortOrder = input.sortOrder ?? 0;
      const color = input.color?.trim() || null;

      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO categories (
            id, name, sort_order, color, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
          id,
          name,
          sortOrder,
          color,
          now,
          now,
        );
      });

      return this.getById(id);
    } catch (cause) {
      return err(AppError.database('Impossible de créer la catégorie', cause));
    }
  }

  async update(input: UpdateCategoryInput): Promise<Result<Category>> {
    const name = input.name.trim();
    if (!name) return err(AppError.validation('Le nom de catégorie est requis'));

    try {
      const existing = await this.getById(input.id);
      if (!existing.ok) return existing;

      const now = new Date().toISOString();
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE categories
           SET name = ?, color = ?, sort_order = ?, is_active = ?, updated_at = ?
           WHERE id = ?`,
          name,
          input.color === undefined
            ? existing.value.color
            : input.color?.trim() || null,
          input.sortOrder ?? existing.value.sortOrder,
          input.isActive === undefined
            ? existing.value.isActive
              ? 1
              : 0
            : input.isActive
              ? 1
              : 0,
          now,
          input.id,
        );
      });

      return this.getById(input.id);
    } catch (cause) {
      return err(AppError.database('Impossible de modifier la catégorie', cause));
    }
  }

  async deactivate(id: string): Promise<Result<void>> {
    try {
      const existing = await this.getById(id);
      if (!existing.ok) return err(existing.error);

      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?`,
          new Date().toISOString(),
          id,
        );
      });

      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de désactiver la catégorie', cause));
    }
  }
}
