import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import {
  normalizeDiscountBps,
  type ProductPromotionRule,
  type PromotionRule,
} from '@/features/promotions/domain/types';

const RULES_KEY = 'promotions.rules';
const LEGACY_KEY = 'promotions.product_rules';

function parsePromotionRules(raw: string | null | undefined): PromotionRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PromotionRule[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((rule) => rule.id && rule.targetType)
      .map((rule) => ({
        id: rule.id,
        kind: rule.kind === 'fixed_amount' ? 'fixed_amount' : 'percent',
        targetType: rule.targetType === 'category' ? 'category' : 'product',
        productId: rule.productId ?? null,
        categoryId: rule.categoryId ?? null,
        discountBps: normalizeDiscountBps(Number(rule.discountBps)),
        discountCents: Math.max(0, Math.round(Number(rule.discountCents) || 0)),
        isActive: Boolean(rule.isActive),
        startsAt: rule.startsAt ?? null,
        endsAt: rule.endsAt ?? null,
      }));
  } catch {
    return [];
  }
}

function parseLegacy(raw: string | null | undefined): ProductPromotionRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProductPromotionRule[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((rule) => rule.productId)
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

function legacyToRules(legacy: ProductPromotionRule[]): PromotionRule[] {
  return legacy.map((rule) => ({
    id: Crypto.randomUUID(),
    kind: 'percent' as const,
    targetType: 'product' as const,
    productId: rule.productId,
    categoryId: null,
    discountBps: rule.discountBps,
    discountCents: 0,
    isActive: rule.isActive,
    startsAt: rule.startsAt ?? null,
    endsAt: rule.endsAt ?? null,
  }));
}

function rulesToLegacy(rules: PromotionRule[]): ProductPromotionRule[] {
  return rules
    .filter(
      (rule) =>
        rule.targetType === 'product' &&
        rule.kind === 'percent' &&
        rule.productId &&
        normalizeDiscountBps(rule.discountBps) > 0,
    )
    .map((rule) => ({
      productId: rule.productId!,
      discountBps: rule.discountBps,
      isActive: rule.isActive,
      startsAt: rule.startsAt,
      endsAt: rule.endsAt,
    }));
}

export class SqlitePromotionRepository implements IPromotionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  private async loadRules(): Promise<Result<PromotionRule[]>> {
    try {
      const row = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`,
        RULES_KEY,
      );
      if (row?.value) return ok(parsePromotionRules(row.value));

      const legacyRow = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`,
        LEGACY_KEY,
      );
      const migrated = legacyToRules(parseLegacy(legacyRow?.value));
      if (migrated.length) await this.saveRules(migrated);
      return ok(migrated);
    } catch (cause) {
      return err(AppError.database('Impossible de charger les promotions', cause));
    }
  }

  async listPromotionRules(): Promise<Result<PromotionRule[]>> {
    return this.loadRules();
  }

  async setPromotionRule(rule: PromotionRule): Promise<Result<PromotionRule[]>> {
    const current = await this.loadRules();
    if (!current.ok) return current;
    const next = [...current.value.filter((item) => item.id !== rule.id), rule];
    return this.saveRules(next);
  }

  async removePromotionRule(id: string): Promise<Result<PromotionRule[]>> {
    const current = await this.loadRules();
    if (!current.ok) return current;
    return this.saveRules(current.value.filter((rule) => rule.id !== id));
  }

  async listRules(): Promise<Result<ProductPromotionRule[]>> {
    const rules = await this.loadRules();
    if (!rules.ok) return rules;
    return ok(rulesToLegacy(rules.value));
  }

  async setRule(rule: ProductPromotionRule): Promise<Result<ProductPromotionRule[]>> {
    const current = await this.loadRules();
    if (!current.ok) return current;
    const without = current.value.filter(
      (item) => item.targetType !== 'product' || item.productId !== rule.productId,
    );
    const promotion: PromotionRule = {
      id: Crypto.randomUUID(),
      kind: 'percent',
      targetType: 'product',
      productId: rule.productId,
      categoryId: null,
      discountBps: normalizeDiscountBps(rule.discountBps),
      discountCents: 0,
      isActive: rule.isActive,
      startsAt: rule.startsAt ?? null,
      endsAt: rule.endsAt ?? null,
    };
    const saved = await this.saveRules([...without, promotion]);
    if (!saved.ok) return saved;
    return ok(rulesToLegacy(saved.value));
  }

  async removeRule(productId: string): Promise<Result<ProductPromotionRule[]>> {
    const current = await this.loadRules();
    if (!current.ok) return current;
    const next = current.value.filter(
      (rule) => rule.targetType !== 'product' || rule.productId !== productId,
    );
    const saved = await this.saveRules(next);
    if (!saved.ok) return saved;
    return ok(rulesToLegacy(saved.value));
  }

  private async saveRules(rules: PromotionRule[]): Promise<Result<PromotionRule[]>> {
    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          RULES_KEY,
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
