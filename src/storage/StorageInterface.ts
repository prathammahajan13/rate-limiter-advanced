import { StorageError, StorageTimeoutError } from '../errors/StorageError';

export interface StorageInterface {
  /**
   * Get a value from storage
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  get(key: string): Promise<any>;

  /**
   * Set a value in storage with optional TTL
   * @param key - The key to set
   * @param value - The value to store
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise that resolves when the operation completes
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Delete a key from storage
   * @param key - The key to delete
   * @returns Promise that resolves when the operation completes
   */
  del(key: string): Promise<void>;

  /**
   * Check if a key exists in storage
   * @param key - The key to check
   * @returns Promise resolving to true if key exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Increment a numeric value in storage
   * @param key - The key to increment
   * @param ttl - Time to live in seconds (optional, only set if key doesn't exist)
   * @returns Promise resolving to the new value
   */
  incr(key: string, ttl?: number): Promise<number>;

  /**
   * Set expiration time for a key
   * @param key - The key to set expiration for
   * @param ttl - Time to live in seconds
   * @returns Promise that resolves when the operation completes
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * Get all keys matching a pattern
   * @param pattern - The pattern to match (supports wildcards)
   * @returns Promise resolving to array of matching keys
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Flush all data from storage
   * @returns Promise that resolves when the operation completes
   */
  flush(): Promise<void>;

  /**
   * Get multiple values at once
   * @param keys - Array of keys to retrieve
   * @returns Promise resolving to array of values (null for missing keys)
   */
  mget(keys: string[]): Promise<any[]>;

  /**
   * Set multiple values at once
   * @param keyValuePairs - Object with key-value pairs
   * @param ttl - Time to live in seconds (optional, applied to all keys)
   * @returns Promise that resolves when the operation completes
   */
  mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void>;

  /**
   * Delete multiple keys at once
   * @param keys - Array of keys to delete
   * @returns Promise resolving to number of keys deleted
   */
  mdel(keys: string[]): Promise<number>;

  /**
   * Get the TTL (time to live) of a key
   * @param key - The key to check
   * @returns Promise resolving to TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   */
  ttl(key: string): Promise<number>;

  /**
   * Check if the storage is connected and ready
   * @returns Promise resolving to true if connected, false otherwise
   */
  isConnected(): Promise<boolean>;

  /**
   * Get storage statistics
   * @returns Promise resolving to storage statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Close the storage connection
   * @returns Promise that resolves when the connection is closed
   */
  close(): Promise<void>;

  // Ban management methods
  /**
   * Get a ban record for an IP
   * @param ip - IP address to get ban record for
   * @returns Promise resolving to ban record or null
   */
  getBan(ip: string): Promise<any>;

  /**
   * Set a ban record for an IP
   * @param ip - IP address to ban
   * @param banRecord - Ban record data
   * @returns Promise that resolves when the operation completes
   */
  setBan(ip: string, banRecord: any): Promise<void>;

  /**
   * Remove a ban record for an IP
   * @param ip - IP address to unban
   * @returns Promise that resolves when the operation completes
   */
  removeBan(ip: string): Promise<void>;

  /**
   * Get all ban records
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise resolving to array of ban records
   */
  getAllBans(limit?: number, offset?: number): Promise<any[]>;

  /**
   * Get ban records by reason
   * @param reason - Ban reason to filter by
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise resolving to array of ban records
   */
  getBansByReason(reason: string, limit?: number, offset?: number): Promise<any[]>;

  /**
   * Get all keys in storage (for debugging/analytics)
   * @returns Promise resolving to array of all keys
   */
  getAllKeys(): Promise<string[]>;

  /**
   * Delete a key from storage (alias for del)
   * @param key - The key to delete
   * @returns Promise that resolves when the operation completes
   */
  delete(key: string): Promise<void>;
}

export interface StorageStats {
  connected: boolean;
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  operations: {
    get: number;
    set: number;
    del: number;
    incr: number;
    expire: number;
    keys: number;
    flush: number;
  };
  errors: {
    connection: number;
    timeout: number;
    validation: number;
    other: number;
  };
  uptime: number;
  lastError: string | undefined;
  lastErrorTime: Date | undefined;
}

export interface StorageConfig {
  type: 'redis' | 'database' | 'memory' | 'custom';
  fallback: boolean;
  timeout: number;
  retries: number;
  retryDelay: number;
  keyPrefix: string;
  compression: boolean;
  encryption: boolean;
  custom?: any;
}

export interface StorageOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  fallback?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

export abstract class BaseStorage implements StorageInterface {
  protected config: StorageConfig;
  protected stats: StorageStats;
  protected connected: boolean = false;
  protected startTime: Date = new Date();

  constructor(config: StorageConfig) {
    this.config = config;
    this.stats = this.initializeStats();
  }

  protected initializeStats(): StorageStats {
    return {
      connected: false,
      totalKeys: 0,
      memoryUsage: 0,
      hitRate: 0,
      missRate: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
        incr: 0,
        expire: 0,
        keys: 0,
        flush: 0,
      },
      errors: {
        connection: 0,
        timeout: 0,
        validation: 0,
        other: 0,
      },
      uptime: 0,
      lastError: undefined,
      lastErrorTime: undefined,
    };
  }

  protected updateStats(operation: keyof StorageStats['operations']): void {
    this.stats.operations[operation]++;
    this.stats.uptime = Date.now() - this.startTime.getTime();
  }

  protected updateErrorStats(errorType: keyof StorageStats['errors'], error: Error): void {
    this.stats.errors[errorType]++;
    this.stats.lastError = error.message;
    this.stats.lastErrorTime = new Date();
  }

  protected async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number = this.config.timeout
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new StorageTimeoutError(
          `Operation timed out after ${timeout}ms`,
          'unknown',
          timeout
        ));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.config.retries,
    delay: number = this.config.retryDelay
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (i === retries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }

    throw lastError!;
  }

  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid key: must be a non-empty string', 'validation');
    }

    if (key.length > 1000) {
      throw new StorageError('Key too long: maximum length is 1000 characters', 'validation');
    }
  }

  protected validateValue(value: any): void {
    if (value === undefined) {
      throw new StorageError('Value cannot be undefined', 'validation');
    }
  }

  protected validateTTL(ttl: number): void {
    if (ttl !== undefined && (typeof ttl !== 'number' || ttl < 0)) {
      throw new StorageError('TTL must be a non-negative number', 'validation');
    }
  }

  protected serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new StorageError(
        `Failed to serialize value: ${error}`,
        'serialization',
        false,
        undefined,
        error as Error
      );
    }
  }

  protected deserialize(value: string): any {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new StorageError(
        `Failed to deserialize value: ${error}`,
        'deserialization',
        false,
        undefined,
        error as Error
      );
    }
  }

      // Abstract methods that must be implemented by subclasses
      abstract get(key: string): Promise<any>;
      abstract set(key: string, value: any, ttl?: number): Promise<void>;
      abstract del(key: string): Promise<void>;
      abstract exists(key: string): Promise<boolean>;
      abstract incr(key: string, ttl?: number): Promise<number>;
      abstract expire(key: string, ttl: number): Promise<void>;
      abstract keys(pattern: string): Promise<string[]>;
      abstract flush(): Promise<void>;
      abstract mget(keys: string[]): Promise<any[]>;
      abstract mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void>;
      abstract mdel(keys: string[]): Promise<number>;
      abstract ttl(key: string): Promise<number>;
      abstract isConnected(): Promise<boolean>;
      abstract getStats(): Promise<StorageStats>;
      abstract close(): Promise<void>;

      // Ban management abstract methods
      abstract getBan(ip: string): Promise<any>;
      abstract setBan(ip: string, banRecord: any): Promise<void>;
      abstract removeBan(ip: string): Promise<void>;
      abstract getAllBans(limit?: number, offset?: number): Promise<any[]>;
      abstract getBansByReason(reason: string, limit?: number, offset?: number): Promise<any[]>;

      // Additional abstract methods
      abstract getAllKeys(): Promise<string[]>;
      abstract delete(key: string): Promise<void>;
}
