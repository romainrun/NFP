import { ok, type Result } from '@/core/types/Result';

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'merge';

/**
 * Conflict resolution layer. Default: server wins.
 * Custom strategies can be registered per entity type when needed.
 */
export class ConflictResolver {
  private readonly strategies = new Map<string, ConflictStrategy>();

  constructor(private readonly defaultStrategy: ConflictStrategy = 'server-wins') {}

  register(entityType: string, strategy: ConflictStrategy): void {
    this.strategies.set(entityType, strategy);
  }

  resolve<TServer, TClient>(
    entityType: string,
    serverValue: TServer,
    clientValue: TClient,
  ): TServer | TClient {
    const strategy = this.strategies.get(entityType) ?? this.defaultStrategy;
    switch (strategy) {
      case 'client-wins':
        return clientValue;
      case 'merge':
        return { ...serverValue, ...clientValue } as TServer | TClient;
      case 'server-wins':
      default:
        return serverValue;
    }
  }

  /** Apply server value when server wins (used after pull). */
  applyServerResult<T>(entityType: string, serverValue: T, localValue: T): Result<T> {
    const resolved = this.resolve(entityType, serverValue, localValue);
    return ok(resolved);
  }
}

export const defaultConflictResolver = new ConflictResolver('server-wins');
