import { BaseStorage, StorageInterface, StorageConfig, StorageStats } from './StorageInterface';
import { StorageKeyNotFoundError } from '../errors/StorageError';

interface MemoryEntry {
  value: any;
  expiresAt: number | undefined;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class MemoryStorage extends BaseStorage implements StorageInterface {
  private data: Map<string, MemoryEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private maxSize: number;
  // private compressionEnabled: boolean; // Unused

  constructor(config: StorageConfig, maxSize: number = 10000) {
    super(config);
    this.maxSize = maxSize;
    // this.compressionEnabled = config.compression || false; // Unused
    
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    this.connected = true;
    this.stats.connected = true;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.data.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.data.delete(key);
        cleaned++;
      }
    }

    // If we're over the max size, remove least recently used entries
    if (this.data.size > this.maxSize) {
      const entries = Array.from(this.data.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toRemove = this.data.size - this.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.data.delete(entries[i]![0]);
        cleaned++;
      }
    }

    this.updateStats('del');
  }

  private getEntry(key: string): MemoryEntry | null {
    const entry = this.data.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry;
  }

  private setEntry(key: string, value: any, ttl?: number): void {
    const now = Date.now();
    const entry: MemoryEntry = {
      value,
      expiresAt: ttl ? now + (ttl * 1000) : undefined,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    this.data.set(key, entry);
  }

  async get(key: string): Promise<any> {
    this.validateKey(key);
    this.updateStats('get');

    try {
      const entry = this.getEntry(key);
      if (!entry) {
        this.stats.missRate++;
        return null;
      }

      this.stats.hitRate++;
      return entry.value;
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }

    this.updateStats('set');

    try {
      this.setEntry(key, value, ttl);
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    this.validateKey(key);
    this.updateStats('del');

    try {
      this.data.delete(key);
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    try {
      const entry = this.getEntry(key);
      return entry !== null;
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async incr(key: string, ttl?: number): Promise<number> {
    this.validateKey(key);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }
    this.updateStats('incr');

    try {
      const entry = this.getEntry(key);
      let currentValue = 0;

      if (entry) {
        currentValue = typeof entry.value === 'number' ? entry.value : 0;
      }

      const newValue = currentValue + 1;
      this.setEntry(key, newValue, ttl);

      return newValue;
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    this.validateKey(key);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }
    this.updateStats('expire');

    try {
      const entry = this.getEntry(key);
      if (!entry) {
        throw new StorageKeyNotFoundError('Key not found', key, 'expire');
      }

      entry.expiresAt = Date.now() + (ttl * 1000);
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    this.updateStats('keys');

    try {
      const regex = this.patternToRegex(pattern);
      const matchingKeys: string[] = [];

      for (const key of this.data.keys()) {
        if (regex.test(key)) {
          const entry = this.getEntry(key);
          if (entry) {
            matchingKeys.push(key);
          }
        }
      }

      return matchingKeys;
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert Redis-style pattern to regex
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${escaped}$`);
  }

  async flush(): Promise<void> {
    this.updateStats('flush');

    try {
      this.data.clear();
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async mget(keys: string[]): Promise<any[]> {
    const results: any[] = [];

    for (const key of keys) {
      try {
        const value = await this.get(key);
        results.push(value);
      } catch (error) {
        results.push(null);
      }
    }

    return results;
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    for (const [key, value] of Object.entries(keyValuePairs)) {
      await this.set(key, value, ttl);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      try {
        if (await this.exists(key)) {
          await this.del(key);
          deleted++;
        }
      } catch (error) {
        // Continue with other keys
      }
    }

    return deleted;
  }

  async ttl(key: string): Promise<number> {
    this.validateKey(key);

    try {
      const entry = this.getEntry(key);
      if (!entry) {
        return -2; // Key doesn't exist
      }

      if (!entry.expiresAt) {
        return -1; // No expiration
      }

      const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      return ttl > 0 ? ttl : -2; // Expired
    } catch (error) {
      this.updateErrorStats('other', error as Error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getStats(): Promise<StorageStats> {
    const now = Date.now();
    // const totalOperations = Object.values(this.stats.operations).reduce((sum, count) => sum + count, 0); // Unused
    const totalHits = this.stats.hitRate;
    const totalMisses = this.stats.missRate;
    const totalRequests = totalHits + totalMisses;

    return {
      ...this.stats,
      connected: this.connected,
      totalKeys: this.data.size,
      memoryUsage: this.calculateMemoryUsage(),
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      uptime: now - this.startTime.getTime(),
    };
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.data.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }

    return totalSize;
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.connected = false;
    this.stats.connected = false;
    this.data.clear();
  }

  // Additional utility methods for memory storage
  getSize(): number {
    return this.data.size;
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    
    // If current size exceeds new max, clean up
    if (this.data.size > maxSize) {
      this.cleanup();
    }
  }

  getMemoryUsage(): number {
    return this.calculateMemoryUsage();
  }

  getHitRate(): number {
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    return totalRequests > 0 ? this.stats.hitRate / totalRequests : 0;
  }

  getMissRate(): number {
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    return totalRequests > 0 ? this.stats.missRate / totalRequests : 0;
  }

  // Force cleanup of expired entries
  forceCleanup(): number {
    const beforeSize = this.data.size;
    this.cleanup();
    return beforeSize - this.data.size;
  }


  // Get entry details (for debugging)
  getEntryDetails(key: string): MemoryEntry | null {
    return this.data.get(key) || null;
  }

  // Ban management methods
  async getBan(ip: string): Promise<any> {
    const key = `ban:${ip}`;
    const entry = this.data.get(key);
    if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
      if (entry) {
        this.data.delete(key); // Remove expired entry
      }
      return null;
    }
    return entry.value;
  }

  async setBan(ip: string, banRecord: any): Promise<void> {
    const key = `ban:${ip}`;
    const expiresAt = banRecord.expiresAt ? new Date(banRecord.expiresAt).getTime() : undefined;
    const now = Date.now();

    const entry: MemoryEntry = {
      value: banRecord,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
    };
    this.data.set(key, entry);
  }

  async removeBan(ip: string): Promise<void> {
    const key = `ban:${ip}`;
    this.data.delete(key);
  }

  async getAllBans(limit: number = 100, offset: number = 0): Promise<any[]> {
    const banKeys = Array.from(this.data.keys()).filter(key => key.startsWith('ban:'));
    const paginatedKeys = banKeys.slice(offset, offset + limit);
    const bans: any[] = [];
    
    for (const key of paginatedKeys) {
      const entry = this.data.get(key);
      if (entry && (!entry.expiresAt || entry.expiresAt > Date.now())) {
        bans.push(entry.value);
      }
    }
    
    return bans;
  }

  async getBansByReason(reason: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const allBans = await this.getAllBans(Infinity, 0);
    const filteredBans = allBans.filter(ban => ban.reason === reason);
    return filteredBans.slice(offset, offset + limit);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async delete(key: string): Promise<void> {
    return this.del(key);
  }
}
