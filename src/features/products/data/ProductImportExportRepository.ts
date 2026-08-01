import { Share } from 'react-native';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type {
  IImportExportRepository,
  ProductImportResult,
} from '@/features/products/data/ImportExportRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { productsToCsv } from '@/features/products/domain/productCsv';
import { importProductsFromCsv } from '@/features/products/services/productImportService';

/**
 * Product catalogue CSV tooling. Does not export or import database backups.
 */
export class ProductImportExportRepository implements IImportExportRepository {
  constructor(private readonly products: IProductRepository) {}

  async exportProductCatalogueCsv(): Promise<Result<void>> {
    const list = await this.products.list({ includeInactive: true });
    if (!list.ok) return list;

    const csv = productsToCsv(list.value);
    await Share.share({ title: 'Export catalogue produits NFP', message: csv });
    return ok(undefined);
  }

  async importProductCatalogueCsv(userId: string): Promise<Result<ProductImportResult>> {
    try {
      const result = await importProductsFromCsv(userId);
      return ok(result);
    } catch (cause) {
      return err(AppError.database('Import catalogue impossible', cause));
    }
  }
}
