import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { Employee, UserRole } from '@/features/authentication/domain/types';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';

type UserRow = {
  id: string;
  employee_code: string;
  display_name: string;
  role: UserRole;
  is_active: number;
};

function mapEmployee(row: UserRow): Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1,
  };
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getById(id: string): Promise<Result<Employee>> {
    const row = await this.db.getFirstAsync<UserRow>(
      `SELECT id, employee_code, display_name, role, is_active
       FROM users WHERE id = ?`,
      id,
    );

    if (!row) {
      return err(AppError.notFound('Employee not found'));
    }

    return ok(mapEmployee(row));
  }

  async getByEmployeeCode(code: string): Promise<Result<Employee>> {
    const row = await this.db.getFirstAsync<UserRow>(
      `SELECT id, employee_code, display_name, role, is_active
       FROM users WHERE employee_code = ?`,
      code.trim().toUpperCase(),
    );

    if (!row) {
      return err(AppError.notFound('Employee not found'));
    }

    return ok(mapEmployee(row));
  }

  async listActive(): Promise<Result<Employee[]>> {
    const rows = await this.db.getAllAsync<UserRow>(
      `SELECT id, employee_code, display_name, role, is_active
       FROM users WHERE is_active = 1
       ORDER BY display_name ASC`,
    );

    return ok(rows.map(mapEmployee));
  }
}
