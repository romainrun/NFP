import type { Token } from '@/core/di/tokens';

type Factory<T> = () => T;

/**
 * Minimal DI container — register once at bootstrap, resolve in features.
 * Prefer interfaces over concrete classes at call sites.
 */
class DiContainer {
  private readonly singletons = new Map<Token, unknown>();
  private readonly factories = new Map<Token, Factory<unknown>>();

  registerSingleton<T>(token: Token, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>);
  }

  registerInstance<T>(token: Token, instance: T): void {
    this.singletons.set(token, instance);
  }

  resolve<T>(token: Token): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`DI: no registration for token "${token}"`);
    }

    const instance = factory() as T;
    this.singletons.set(token, instance);
    return instance;
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}

export const container = new DiContainer();
