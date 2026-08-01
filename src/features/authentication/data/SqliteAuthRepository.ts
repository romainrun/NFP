import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { verifyPin } from '@/core/security/pin';
import { err, ok, type Result } from '@/core/types/Result';
import type { IAuthRepository } from '@/features/authentication/data/AuthRepository';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';
import type {
  AuthSession,
  Employee,
  PinLoginInput,
  UserRole,
} from '@/features/authentication/domain/types';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import type { ISecureStorage } from '@/shared/services/storage/SecureStorage';

type AuthUserRow = {
  id: string;
  employee_code: string;
  display_name: string;
  role: UserRole;
  is_active: number;
  pin_salt: string;
  pin_hash: string;
};

/**
 * Offline-first auth repository backed by SQLite + Secure Store.
 * JWT-shaped session token is local until a backend exists.
 */
export class SqliteAuthRepository implements IAuthRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly users: IUserRepository,
    private readonly secureStorage: ISecureStorage,
    private readonly audit: IAuditService,
  ) {}

  async listActiveEmployees(): Promise<Result<Employee[]>> {
    return this.users.listActive();
  }

  async loginWithPin(input: PinLoginInput): Promise<Result<AuthSession>> {
    const code = input.employeeCode.trim().toUpperCase();

    const row = await this.db.getFirstAsync<AuthUserRow>(
      `SELECT id, employee_code, display_name, role, is_active, pin_salt, pin_hash
       FROM users WHERE employee_code = ?`,
      code,
    );

    if (!row || row.is_active !== 1) {
      await this.audit.log({
        action: 'login_failed',
        payload: { employeeCode: code, reason: 'unknown_or_inactive' },
      });
      return err(AppError.unauthorized('Code employé ou PIN invalide'));
    }

    const valid = await verifyPin(input.pin, row.pin_salt, row.pin_hash);
    if (!valid) {
      await this.audit.log({
        userId: row.id,
        action: 'login_failed',
        payload: { employeeCode: code, reason: 'bad_pin' },
      });
      return err(AppError.unauthorized('Code employé ou PIN invalide'));
    }

    const authenticatedAt = new Date();
    const expiresAt = new Date(authenticatedAt.getTime() + APP_CONFIG.idleLogoutMs);
    const token = Crypto.randomUUID();

    await this.audit.log({
      userId: row.id,
      action: 'login',
      entityType: 'user',
      entityId: row.id,
    });

    await this.users.recordLogin(row.id);

    const employee = await this.users.getById(row.id);
    if (!employee.ok) return err(employee.error);

    const session: AuthSession = {
      token,
      employee: employee.value,
      authenticatedAt: authenticatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.secureStorage.setItem(
      APP_CONFIG.secureStorageKeys.sessionToken,
      JSON.stringify(session),
    );

    return ok(session);
  }

  async logout(session: AuthSession): Promise<Result<void>> {
    await this.secureStorage.deleteItem(APP_CONFIG.secureStorageKeys.sessionToken);
    await this.audit.log({
      userId: session.employee.id,
      action: 'logout',
      entityType: 'user',
      entityId: session.employee.id,
    });
    return ok(undefined);
  }
}
