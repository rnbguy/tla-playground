type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};

export class BoundedTtlCache<K, V> {
  #maxEntries: number;
  #store = new Map<K, CacheEntry<V>>();

  constructor(maxEntries: number) {
    this.#maxEntries = Math.max(1, maxEntries);
  }

  get(key: K): V | null {
    const entry = this.#store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.#store.delete(key);
      return null;
    }

    this.#store.delete(key);
    this.#store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    const expiresAt = Date.now() + Math.max(1, ttlMs);

    if (this.#store.has(key)) {
      this.#store.delete(key);
    }

    this.#store.set(key, { value, expiresAt });
    this.#evictExpired();
    this.#evictOverflow();
  }

  #evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.#store) {
      if (entry.expiresAt <= now) {
        this.#store.delete(key);
      }
    }
  }

  #evictOverflow(): void {
    while (this.#store.size > this.#maxEntries) {
      const oldestKey = this.#store.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.#store.delete(oldestKey);
    }
  }
}
