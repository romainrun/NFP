import { sha256 } from '@/core/security/hash';
import { APP_CONFIG } from '@/core/config/appConfig';

export function isValidPinFormat(pin: string): boolean {
  const length = APP_CONFIG.pinLength;
  return new RegExp(`^\\d{${length}}$`).test(pin);
}

/**
 * Deterministic PIN verification hash.
 * Format: sha256(salt + ':' + pin). Salt is per-employee in the users table.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return sha256(`${salt}:${pin}`);
}

export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!isValidPinFormat(pin)) {
    return false;
  }
  const candidate = await hashPin(pin, salt);
  return candidate === expectedHash;
}
