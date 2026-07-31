import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { AppError } from '@/core/errors/AppError';
import { createSalt } from '@/core/security/hash';
import { hashPin, isValidPinFormat } from '@/core/security/pin';
import { err, ok, type Result } from '@/core/types/Result';
import type {
  CreateEmployeeInput,
  IUserRepository,
  UpdateEmployeeInput,
} from '@/features/authentication/data/UserRepository';
import type { Employee, UserRole } from '@/features/authentication/domain/types';
import { withWriteTransaction } from '@/database/transaction';

type UserRow = {
  id: string;
  employee_code: string;
  display_name: string;
  role: UserRole;
  is_active: number;
};

const ROLES: UserRole[] = ['admin', 'manager', 'cashier'];

function mapEmployee(row: UserRow): Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1,
  };
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
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
      normalizeCode(code),
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

  async listAll(): Promise<Result<Employee[]>> {
    const rows = await this.db.getAllAsync<UserRow>(
      `SELECT id, employee_code, display_name, role, is_active
       FROM users
       ORDER BY is_active DESC, display_name ASC`,
    );

    return ok(rows.map(mapEmployee));
  }

  async create(input: CreateEmployeeInput): Promise<Result<Employee>> {
    const employeeCode = normalizeCode(input.employeeCode);
    const displayName = input.displayName.trim();
    const pin = input.pin.trim();

    if (!employeeCode || employeeCode.length < 2) {
      return err(AppError.validation('Code collaborateur invalide'));
    }
    if (!displayName) {
      return err(AppError.validation('Le nom est requis'));
    }
    if (!ROLES.includes(input.role)) {
      return err(AppError.validation('Rôle invalide'));
    }
    if (!isValidPinFormat(pin)) {
      return err(AppError.validation('Le code PIN doit contenir 4 chiffres'));
    }

    const existing = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM users WHERE employee_code = ?`,
      employeeCode,
    );
    if (existing) {
      return err(AppError.validation('Ce code collaborateur existe déjà'));
    }

    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const salt = await createSalt();
    const pinHash = await hashPin(pin, salt);

    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `INSERT INTO users (
            id, employee_code, display_name, role, pin_salt, pin_hash,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          id,
          employeeCode,
          displayName,
          input.role,
          salt,
          pinHash,
          now,
          now,
        );
      });
      return this.getById(id);
    } catch (cause) {
      return err(AppError.database('Impossible de créer le collaborateur', cause));
    }
  }

  async update(input: UpdateEmployeeInput): Promise<Result<Employee>> {
    const displayName = input.displayName.trim();
    if (!displayName) {
      return err(AppError.validation('Le nom est requis'));
    }
    if (!ROLES.includes(input.role)) {
      return err(AppError.validation('Rôle invalide'));
    }

    const current = await this.getById(input.id);
    if (!current.ok) return current;

    if (current.value.role === 'admin' && input.role !== 'admin') {
      const admins = await this.countActiveAdmins();
      if (admins <= 1 && current.value.isActive) {
        return err(AppError.validation('Il doit rester au moins un admin actif'));
      }
    }

    if (current.value.isActive && !input.isActive && current.value.role === 'admin') {
      const admins = await this.countActiveAdmins();
      if (admins <= 1) {
        return err(AppError.validation('Impossible de désactiver le dernier admin'));
      }
    }

    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE users
           SET display_name = ?, role = ?, is_active = ?, updated_at = ?
           WHERE id = ?`,
          displayName,
          input.role,
          input.isActive ? 1 : 0,
          new Date().toISOString(),
          input.id,
        );
      });
      return this.getById(input.id);
    } catch (cause) {
      return err(AppError.database('Impossible de mettre à jour le collaborateur', cause));
    }
  }

  async setPin(id: string, pin: string): Promise<Result<void>> {
    if (!isValidPinFormat(pin.trim())) {
      return err(AppError.validation('Le code PIN doit contenir 4 chiffres'));
    }

    const current = await this.getById(id);
    if (!current.ok) return err(current.error);

    const salt = await createSalt();
    const pinHash = await hashPin(pin.trim(), salt);

    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE users SET pin_salt = ?, pin_hash = ?, updated_at = ? WHERE id = ?`,
          salt,
          pinHash,
          new Date().toISOString(),
          id,
        );
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppError.database('Impossible de mettre à jour le PIN', cause));
    }
  }

  private async countActiveAdmins(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`,
    );
    return row?.count ?? 0;
  }
}
