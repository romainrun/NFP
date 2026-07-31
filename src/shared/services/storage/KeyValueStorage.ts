/**
 * Hot key-value storage port.
 * Production builds should bind an MMKV adapter; Phase 1 ships a memory adapter
 * so Expo Go remains usable without a custom native build.
 */
export interface IKeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  contains(key: string): boolean;
}

export class MemoryKeyValueStorage implements IKeyValueStorage {
  private readonly map = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.map.get(key);
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  contains(key: string): boolean {
    return this.map.has(key);
  }
}
