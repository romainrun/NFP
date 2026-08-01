import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { parseProductsCsv } from '@/features/products/domain/productCsv';

export type ProductImportResult = {
  created: number;
  updated: number;
  skipped: boolean;
};

export async function importProductsFromCsv(userId: string): Promise<ProductImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return { created: 0, updated: 0, skipped: true };

  const asset = picked.assets[0];
  if (!asset) throw new Error('Fichier introuvable');

  const content = await FileSystem.readAsStringAsync(asset.uri);
  const rows = parseProductsCsv(content);
  const productRepo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
  const categoryRepo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
  const categories = await categoryRepo.list(false);
  if (!categories.ok) throw categories.error;

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const categoryId =
      categories.value.find(
        (category) =>
          row.categoryName &&
          category.name.trim().toLowerCase() === row.categoryName.trim().toLowerCase(),
      )?.id ?? null;

    const existing = row.sku ? await productRepo.getBySku(row.sku) : null;
    if (existing?.ok) {
      const result = await productRepo.update(
        {
          id: existing.value.id,
          sku: existing.value.sku,
          barcode: row.barcode,
          name: row.name,
          description: existing.value.description,
          categoryId,
          priceCents: row.priceCents,
          vatRate: row.vatRate,
          costCents: existing.value.costCents,
          isFavorite: existing.value.isFavorite,
          isQuick: existing.value.isQuick,
          imageUri: existing.value.imageUri,
          isActive: existing.value.isActive,
        },
        userId,
      );
      if (!result.ok) throw result.error;
      updated += 1;
    } else {
      const result = await productRepo.create(
        {
          sku: row.sku,
          barcode: row.barcode,
          name: row.name,
          categoryId,
          priceCents: row.priceCents,
          vatRate: row.vatRate,
          stockQuantity: row.stockQuantity,
        },
        userId,
      );
      if (!result.ok) throw result.error;
      created += 1;
    }
  }

  return { created, updated, skipped: false };
}
