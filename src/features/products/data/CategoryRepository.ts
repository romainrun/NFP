import type { Result } from '@/core/types/Result';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/products/domain/types';

export interface ICategoryRepository {
  list(includeInactive?: boolean): Promise<Result<Category[]>>;
  getById(id: string): Promise<Result<Category>>;
  create(input: CreateCategoryInput): Promise<Result<Category>>;
  update(input: UpdateCategoryInput): Promise<Result<Category>>;
  deactivate(id: string): Promise<Result<void>>;
}
