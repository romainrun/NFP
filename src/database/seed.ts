import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { hashPin } from '@/core/security/pin';
import { createSalt } from '@/core/security/hash';
import { withWriteTransaction } from '@/database/transaction';

type SeedUser = {
  employeeCode: string;
  displayName: string;
  role: 'admin' | 'manager' | 'cashier';
  pin: string;
};

const DEMO_USERS: SeedUser[] = [
  { employeeCode: 'ADMIN', displayName: 'Admin NFP', role: 'admin', pin: '1234' },
  { employeeCode: 'MGR01', displayName: 'Marie Manager', role: 'manager', pin: '9012' },
  { employeeCode: 'CASH1', displayName: 'Paul Caissier', role: 'cashier', pin: '5678' },
];

/**
 * Seeds demo employees once so PIN login works offline without a backend.
 * Demo PINs are documented in README — change before production.
 */
export async function seedDemoUsers(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users',
  );

  if ((existing?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();

  await withWriteTransaction(db, async (txn) => {
    for (const user of DEMO_USERS) {
      const id = Crypto.randomUUID();
      const salt = await createSalt();
      const pinHash = await hashPin(user.pin, salt);

      await txn.runAsync(
        `INSERT INTO users (
          id, employee_code, display_name, role, pin_salt, pin_hash,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        id,
        user.employeeCode,
        user.displayName,
        user.role,
        salt,
        pinHash,
        now,
        now,
      );
    }

    await txn.runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      'store.name',
      'NaturallyForme',
      now,
    );
  });
}
