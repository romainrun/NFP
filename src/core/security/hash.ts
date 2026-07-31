import * as Crypto from 'expo-crypto';

/**
 * SHA-256 hex digest. Used for PIN hashing and future receipt hash-chain.
 */
export async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/**
 * Hash chain link: H(previousHash + payload).
 * Prepared for Article 286 sequential receipt integrity.
 */
export async function chainHash(previousHash: string, payload: string): Promise<string> {
  return sha256(`${previousHash}|${payload}`);
}

export async function createSalt(bytes = 16): Promise<string> {
  const random = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
}
