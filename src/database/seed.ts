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

/** Dev-only shared PIN — change before production. */
export const DEV_PIN = '0000';

const DEMO_USERS: SeedUser[] = [
  { employeeCode: 'ADMIN', displayName: 'Admin NFP', role: 'admin', pin: DEV_PIN },
  { employeeCode: 'MGR01', displayName: 'Marie Manager', role: 'manager', pin: DEV_PIN },
  { employeeCode: 'CASH1', displayName: 'Paul Caissier', role: 'cashier', pin: DEV_PIN },
];

/**
 * Seeds demo employees once, then always refreshes their PIN hashes to DEV_PIN
 * so local/VPS databases stay aligned during development.
 */
export async function seedDemoUsers(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users',
  );

  const now = new Date().toISOString();

  if ((existing?.count ?? 0) === 0) {
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
    return;
  }

  // Keep demo PINs at 0000 even on already-seeded databases (dev convenience).
  await withWriteTransaction(db, async (txn) => {
    for (const user of DEMO_USERS) {
      const salt = await createSalt();
      const pinHash = await hashPin(user.pin, salt);
      await txn.runAsync(
        `UPDATE users
         SET pin_salt = ?, pin_hash = ?, updated_at = ?
         WHERE employee_code = ?`,
        salt,
        pinHash,
        now,
        user.employeeCode,
      );
    }
  });
}
