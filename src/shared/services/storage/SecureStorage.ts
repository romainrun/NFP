import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

/**
 * Secure storage adapter (Expo Secure Store).
 * Web falls back to in-memory map — never use for production secrets on web.
 */
export class ExpoSecureStorage implements ISecureStorage {
  private readonly webFallback = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return this.webFallback.get(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      this.webFallback.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      this.webFallback.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
}
