/**
 * EKP Persistence Adapter Interfaces
 * Decoupled storage adapter contracts for EKP state components.
 */

export interface IPersistenceAdapter {
  read<T = any>(key: string): Promise<T | null>;
  write<T = any>(key: string, data: T): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class InMemoryPersistenceAdapter implements IPersistenceAdapter {
  private store: Map<string, any> = new Map();

  public async read<T = any>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (val === undefined) return null;
    return JSON.parse(JSON.stringify(val)) as T;
  }

  public async write<T = any>(key: string, data: T): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(data)));
  }

  public async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }
}
