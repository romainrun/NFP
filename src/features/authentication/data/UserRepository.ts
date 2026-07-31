import type { Result } from '@/core/types/Result';
import type { Employee } from '@/features/authentication/domain/types';

export interface IUserRepository {
  getById(id: string): Promise<Result<Employee>>;
  getByEmployeeCode(code: string): Promise<Result<Employee>>;
  listActive(): Promise<Result<Employee[]>>;
}
