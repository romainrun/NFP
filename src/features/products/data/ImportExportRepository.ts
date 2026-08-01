import type { Result } from '@/core/types/Result';

export type ProductImportResult = {
  created: number;
  updated: number;
  skipped?: boolean;
};

/**
 * Catalogue CSV import/export — business tooling, not database backup.
 */
export interface IImportExportRepository {
  exportProductCatalogueCsv(): Promise<Result<void>>;
  importProductCatalogueCsv(userId: string): Promise<Result<ProductImportResult>>;
}
