/** Small in-memory TTL cache. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
