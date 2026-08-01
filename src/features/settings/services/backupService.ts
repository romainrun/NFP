import * as FileSystem from 'expo-file-system/legacy';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type { IAuditService } from '@/shared/services/audit/AuditService';

export const BACKUP_VERSION = 1;

export type LocalBackupPayload = {
  version: number;
  exportedAt: string;
  storeName: string;
  shopInfo: unknown;
  categories: unknown[];
  products: unknown[];
};

export type BackupResult = {
  path: string;
  exportedAt: string;
};

export async function createLocalBackup(userId?: string): Promise<BackupResult> {
  const productsRepo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
  const categoriesRepo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
  const settingsRepo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
  const adminRepo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
  const audit = container.resolve<IAuditService>(TOKENS.AuditService);

  const products = await productsRepo.list({ includeInactive: true });
  const categories = await categoriesRepo.list(true);
  const settings = await settingsRepo.getSettings();
  if (!products.ok) throw products.error;
  if (!categories.ok) throw categories.error;
  if (!settings.ok) throw settings.error;

  const exportedAt = new Date().toISOString();
  const payload: LocalBackupPayload = {
    version: BACKUP_VERSION,
    exportedAt,
    storeName: settings.value.storeName,
    shopInfo: settings.value.shopInfo,
    categories: categories.value,
    products: products.value,
  };

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  const dir = `${baseDir}backups`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const fileName = `nfp-backup-${exportedAt.replace(/[:.]/g, '-')}.json`;
  const path = `${dir}/${fileName}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));

  const bundle = await adminRepo.getBundle();
  if (bundle.ok) {
    await adminRepo.setBackup({
      lastBackupAt: exportedAt,
      lastBackupPath: path,
    });
  }

  await audit.log({
    userId,
    action: 'config_change',
    entityType: 'backup',
    payload: { section: 'Sauvegarde', op: 'create' },
  });

  return { path, exportedAt };
}

export async function restoreLocalBackup(
  raw: string,
  userId?: string,
): Promise<{ productsRestored: number; categoriesRestored: number }> {
  const payload = JSON.parse(raw) as LocalBackupPayload;
  if (!payload.products || !Array.isArray(payload.products)) {
    throw new Error('Fichier de sauvegarde invalide');
  }

  const productsRepo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
  const categoriesRepo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
  const audit = container.resolve<IAuditService>(TOKENS.AuditService);

  let categoriesRestored = 0;
  const categoryIdByName = new Map<string, string>();

  if (Array.isArray(payload.categories)) {
    for (const cat of payload.categories as Array<{ id?: string; name?: string }>) {
      if (!cat.name) continue;
      const existing = await categoriesRepo.list(true);
      const match = existing.ok
        ? existing.value.find((c) => c.name.toLowerCase() === cat.name!.toLowerCase())
        : null;
      if (match) {
        categoryIdByName.set(cat.name.toLowerCase(), match.id);
      }
    }
    categoriesRestored = categoryIdByName.size;
  }

  let productsRestored = 0;
  for (const item of payload.products as Array<Record<string, unknown>>) {
    const sku = String(item.sku ?? '');
    const name = String(item.name ?? '');
    if (!sku || !name) continue;

    const existing = await productsRepo.getBySku(sku);
    const categoryId =
      item.categoryId
        ? String(item.categoryId)
        : null;

    if (existing.ok) {
      await productsRepo.update(
        {
          id: existing.value.id,
          sku,
          barcode: item.barcode ? String(item.barcode) : null,
          name,
          description: existing.value.description,
          categoryId,
          priceCents: Number(item.priceCents) || existing.value.priceCents,
          vatRate: Number(item.vatRate) || existing.value.vatRate,
          costCents: Number(item.costCents) || existing.value.costCents,
          isFavorite: Boolean(item.isFavorite),
          isQuick: Boolean(item.isQuick),
          imageUri: item.imageUri ? String(item.imageUri) : null,
          isActive: item.isActive !== false,
        },
        userId ?? 'system',
      );
    } else if (userId) {
      await productsRepo.create(
        {
          sku,
          barcode: item.barcode ? String(item.barcode) : null,
          name,
          categoryId,
          priceCents: Number(item.priceCents) || 0,
          vatRate: Number(item.vatRate) || 5.5,
          stockQuantity: Number(item.stockQuantity) || 0,
        },
        userId,
      );
    }
    productsRestored += 1;
  }

  await audit.log({
    userId,
    action: 'config_change',
    entityType: 'backup',
    payload: { section: 'Sauvegarde', op: 'restore', productsRestored },
  });

  return { productsRestored, categoriesRestored };
}
