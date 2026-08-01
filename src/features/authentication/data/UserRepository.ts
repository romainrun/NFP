import type { Result } from '@/core/types/Result';
import type { Employee, UserRole } from '@/features/authentication/domain/types';

export type CreateEmployeeInput = {
  employeeCode: string;
  displayName: string;
  role: UserRole;
  pin: string;
};

export type UpdateEmployeeInput = {
  id: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  userColor?: string | null;
  forcePinChange?: boolean;
};

export interface IUserRepository {
  getById(id: string): Promise<Result<Employee>>;
  getByEmployeeCode(code: string): Promise<Result<Employee>>;
  listActive(): Promise<Result<Employee[]>>;
  listAll(): Promise<Result<Employee[]>>;
  create(input: CreateEmployeeInput): Promise<Result<Employee>>;
  update(input: UpdateEmployeeInput): Promise<Result<Employee>>;
  setPin(id: string, pin: string): Promise<Result<void>>;
  touchActivity(userId: string): Promise<Result<void>>;
  recordLogin(userId: string): Promise<Result<void>>;
}
