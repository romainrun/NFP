import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import {
  normalizeDiscountBps,
  type ProductPromotionRule,
} from '@/features/promotions/domain/types';

const SETTINGS_KEY = 'promotions.product_rules';

function parseRules(raw: string | null | undefined): ProductPromotionRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProductPromotionRule[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((rule) => typeof rule.productId === 'string' && rule.productId)
      .map((rule) => ({
        productId: rule.productId,
        discountBps: normalizeDiscountBps(Number(rule.discountBps)),
        isActive: Boolean(rule.isActive),
        startsAt: rule.startsAt ?? null,
        endsAt: rule.endsAt ?? null,
      }));
  } catch {
    return [];
  }
}

export class SqlitePromotionRepository implements IPromotionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listRules(): Promise<Result<ProductPromotionRule[]>> {
    try {
      const row = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`,
        SETTINGS_KEY,
      );
      return ok(parseRules(row?.value));
    } catch (cause) {
      return err(AppError.database('Impossible de charger les promotions', cause));
    }
  }

  async setRule(rule: ProductPromotionRule): Promise<Result<ProductPromotionRule[]>> {
    const current = await this.listRules();
    if (!current.ok) return current;

    const normalized: ProductPromotionRule = {
      productId: rule.productId,
      discountBps: normalizeDiscountBps(rule.discountBps),
      isActive: rule.isActive && normalizeDiscountBps(rule.discountBps) > 0,
      startsAt: rule.startsAt ?? null,
      endsAt: rule.endsAt ?? null,
    };
    const next = [
      ...current.value.filter((item) => item.productId !== normalized.productId),
      normalized,
    ];
    return this.save(next);
  }

  async removeRule(productId: string): Promise<Result<ProductPromotionRule[]>> {
    const current = await this.listRules();
    if (!current.ok) return current;
    return this.save(current.value.filter((rule) => rule.productId !== productId));
  }

  private async save(rules: ProductPromotionRule[]): Promise<Result<ProductPromotionRule[]>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          SETTINGS_KEY,
          JSON.stringify(rules),
          new Date().toISOString(),
        );
      });
      return ok(rules);
    } catch (cause) {
      return err(AppError.database('Impossible d’enregistrer les promotions', cause));
    }
  }
}
