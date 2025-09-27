import { BaseStorage, StorageInterface, StorageConfig, StorageStats } from './StorageInterface';
import { StorageError, StorageConnectionError, StorageTimeoutError } from '../errors/StorageError';
import { createClient, RedisClientType, RedisClientOptions } from 'redis';

export class RedisStorage extends BaseStorage implements StorageInterface {
  private client: RedisClientType;
  protected override connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: StorageConfig) {
    super(config);
    this.client = this.createRedisClient();
    this.connect();
  }

  private createRedisClient(): RedisClientType {
    const redisConfig: RedisClientOptions = {
      socket: {
        connectTimeout: this.config.timeout,
        reconnectStrategy: (retries) => {
          if (retries > this.config.retries) {
            return new Error('Max retries exceeded');
          }
          return Math.min(retries * this.config.retryDelay, 1000);
        },
      },
    };

    // Add connection details if provided
    if (this.config.custom?.host) {
    }
    if (this.config.custom?.port) {
    }
    if (this.config.custom?.password) {
      redisConfig.password = this.config.custom.password;
    }
    if (this.config.custom?.db) {
      redisConfig.database = this.config.custom.db;
    }

    return createClient(redisConfig) as RedisClientType;
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    try {
      this.client.on('error', (error) => {
        this.updateErrorStats('connection', error);
        this.connected = false;
        this.stats.connected = false;
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.stats.connected = true;
      });

      this.client.on('reconnecting', () => {
        this.connected = false;
        this.stats.connected = false;
      });

      await this.client.connect();
      this.connected = true;
      this.stats.connected = true;
    } catch (error) {
      this.updateErrorStats('connection', error as Error);
      this.connected = false;
      this.stats.connected = false;
      throw new StorageConnectionError(
        `Failed to connect to Redis: ${error}`,
        'redis',
        this.config.custom?.host,
        this.config.custom?.port,
        error as Error
      );
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private async executeCommand<T>(
    command: () => Promise<T>,
    operation: keyof StorageStats['operations']
  ): Promise<T> {
    if (!this.connected) {
      await this.connect();
    }

    this.updateStats(operation);

    try {
      return await this.withTimeout(command, this.config.timeout);
    } catch (error) {
      if (error instanceof StorageTimeoutError) {
        this.updateErrorStats('timeout', error);
      } else {
        this.updateErrorStats('other', error as Error);
      }
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    this.validateKey(key);

    const command = async () => {
      const value = await this.client.get(this.getKey(key));
      if (value === null) {
        this.stats.missRate++;
        return null;
      }

      this.stats.hitRate++;
      return this.deserialize(value);
    };

    return this.executeCommand(command, 'get');
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }

    const command = async () => {
      const serializedValue = this.serialize(value);
      const redisKey = this.getKey(key);

      if (ttl) {
        await this.client.setEx(redisKey, ttl, serializedValue);
      } else {
        await this.client.set(redisKey, serializedValue);
      }
    };

    return this.executeCommand(command, 'set');
  }

  async del(key: string): Promise<void> {
    this.validateKey(key);

    const command = async () => {
      await this.client.del(this.getKey(key));
    };

    return this.executeCommand(command, 'del');
  }

  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    const command = async () => {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    };

    return this.executeCommand(command, 'get');
  }

  async incr(key: string, ttl?: number): Promise<number> {
    this.validateKey(key);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }

    const command = async () => {
      const redisKey = this.getKey(key);
      const result = await this.client.incr(redisKey);

      // Set TTL if provided and this is the first increment
      if (ttl && result === 1) {
        await this.client.expire(redisKey, ttl);
      }

      return result;
    };

    return this.executeCommand(command, 'incr');
  }

  async expire(key: string, ttl: number): Promise<void> {
    this.validateKey(key);
    if (ttl !== undefined) {
      this.validateTTL(ttl);
    }

    const command = async () => {
      const result = await this.client.expire(this.getKey(key), ttl);
      if (result === null || result === undefined) {
        throw new StorageError('Key not found or could not set expiration', 'expire');
      }
    };

    return this.executeCommand(command, 'expire');
  }

  async keys(pattern: string): Promise<string[]> {
    const command = async () => {
      const redisPattern = this.getKey(pattern);
      const keys = await this.client.keys(redisPattern);
      
      // Remove the prefix from the returned keys
      return keys.map(key => key.replace(this.config.keyPrefix, ''));
    };

    return this.executeCommand(command, 'keys');
  }

  async flush(): Promise<void> {
    const command = async () => {
      if (this.config.keyPrefix) {
        // Only flush keys with our prefix
        const keys = await this.client.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        // Flush all keys (use with caution!)
        await this.client.flushDb();
      }
    };

    return this.executeCommand(command, 'flush');
  }

  async mget(keys: string[]): Promise<any[]> {
    const command = async () => {
      const redisKeys = keys.map(key => this.getKey(key));
      const values = await this.client.mGet(redisKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.missRate++;
          return null;
        }
        this.stats.hitRate++;
        return this.deserialize(value);
      });
    };

    return this.executeCommand(command, 'get');
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    const command = async () => {
      const redisKeyValuePairs: string[] = [];
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        redisKeyValuePairs.push(this.getKey(key));
        redisKeyValuePairs.push(this.serialize(value));
      }

      await this.client.mSet(redisKeyValuePairs);

      // Set TTL for all keys if provided
      if (ttl) {
        const pipeline = this.client.multi();
        for (const key of Object.keys(keyValuePairs)) {
          pipeline.expire(this.getKey(key), ttl);
        }
        await pipeline.exec();
      }
    };

    return this.executeCommand(command, 'set');
  }

  async mdel(keys: string[]): Promise<number> {
    const command = async () => {
      const redisKeys = keys.map(key => this.getKey(key));
      return await this.client.del(redisKeys);
    };

    return this.executeCommand(command, 'del');
  }

  async ttl(key: string): Promise<number> {
    this.validateKey(key);

    const command = async () => {
      return await this.client.ttl(this.getKey(key));
    };

    return this.executeCommand(command, 'get');
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }
      
      // Ping to check if connection is alive
      await this.client.ping();
      return true;
    } catch (error) {
      this.connected = false;
      this.stats.connected = false;
      return false;
    }
  }

  async getStats(): Promise<StorageStats> {
    const now = Date.now();
    // const totalOperations = Object.values(this.stats.operations).reduce((sum, count) => sum + count, 0); // Unused
    const totalHits = this.stats.hitRate;
    const totalMisses = this.stats.missRate;
    const totalRequests = totalHits + totalMisses;

    let totalKeys = 0;
    let memoryUsage = 0;

    try {
      if (this.connected) {
        // Get total keys (only those with our prefix)
        if (this.config.keyPrefix) {
          const keys = await this.client.keys(`${this.config.keyPrefix}*`);
          totalKeys = keys.length;
        } else {
          totalKeys = await this.client.dbSize();
        }

        // Get memory usage
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          memoryUsage = parseInt(memoryMatch[1]!, 10);
        }
      }
    } catch (error) {
      // Ignore errors when getting stats
    }

    return {
      ...this.stats,
      connected: this.connected,
      totalKeys,
      memoryUsage,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      uptime: now - this.startTime.getTime(),
    };
  }

  async close(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
      }
    } catch (error) {
      // Ignore errors when closing
    } finally {
      this.connected = false;
      this.stats.connected = false;
    }
  }

  // Additional Redis-specific methods
  async ping(): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.client.ping();
  }

  async info(section?: string): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.client.info(section);
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.connected) {
      await this.connect();
    }

    return this.client;
  }

  // Pipeline operations for better performance
  async pipeline(operations: Array<{ operation: string; key: string; value?: any; ttl?: number }>): Promise<any[]> {
    if (!this.connected) {
      await this.connect();
    }

    const pipeline = this.client.multi();

    for (const op of operations) {
      const redisKey = this.getKey(op.key);

      switch (op.operation) {
        case 'get':
          pipeline.get(redisKey);
          break;
        case 'set':
          if (op.ttl) {
            pipeline.setEx(redisKey, op.ttl, this.serialize(op.value));
          } else {
            pipeline.set(redisKey, this.serialize(op.value));
          }
          break;
        case 'del':
          pipeline.del(redisKey);
          break;
        case 'incr':
          pipeline.incr(redisKey);
          break;
        case 'expire':
          pipeline.expire(redisKey, op.ttl!);
          break;
        default:
          throw new StorageError(`Unknown pipeline operation: ${op.operation}`, 'pipeline');
      }
    }

    const results = await pipeline.exec();
    return results || [];
  }

  // Pub/Sub functionality
  async publish(channel: string, message: any): Promise<number> {
    if (!this.connected) {
      await this.connect();
    }

    return await this.client.publish(channel, this.serialize(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    await this.client.subscribe(channel, (message) => {
      try {
        callback(this.deserialize(message));
      } catch (error) {
        // Ignore deserialization errors
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    await this.client.unsubscribe(channel);
  }

  // Ban management methods
  async getBan(ip: string): Promise<any> {
    const key = this.getKey(`ban:${ip}`);
    const banData = await this.get(key);
    return banData ? JSON.parse(banData) : null;
  }

  async setBan(ip: string, banRecord: any): Promise<void> {
    const key = this.getKey(`ban:${ip}`);
    const banData = JSON.stringify(banRecord);
    if (banRecord.expiresAt) {
      const ttl = Math.ceil((new Date(banRecord.expiresAt).getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.set(key, banData, ttl);
      }
    } else {
      await this.set(key, banData);
    }
  }

  async removeBan(ip: string): Promise<void> {
    const key = this.getKey(`ban:${ip}`);
    await this.del(key);
  }

  async getAllBans(limit: number = 100, offset: number = 0): Promise<any[]> {
    const pattern = this.getKey('ban:*');
    const keys = await this.keys(pattern);
    const banKeys = keys.slice(offset, offset + limit);
    const bans = await this.mget(banKeys);
    return bans.filter(ban => ban !== null).map(ban => JSON.parse(ban));
  }

  async getBansByReason(reason: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const allBans = await this.getAllBans(Infinity, 0);
    const filteredBans = allBans.filter(ban => ban.reason === reason);
    return filteredBans.slice(offset, offset + limit);
  }

  async getAllKeys(): Promise<string[]> {
    const pattern = this.config.keyPrefix ? `${this.config.keyPrefix}*` : '*';
    const keys = await this.client.keys(pattern);
    return keys.map(key => key.replace(this.config.keyPrefix, ''));
  }

  async delete(key: string): Promise<void> {
    return this.del(key);
  }
}
