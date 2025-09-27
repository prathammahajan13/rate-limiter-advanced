import { Sequelize, DataTypes, Model, Optional, Op } from 'sequelize';
import { BaseStorage, StorageInterface, StorageConfig, StorageStats } from './StorageInterface';
import { BanRecord } from '../types/BanTypes';
import { StorageError } from '../errors/StorageError';

// Database models
interface RateLimitCounterAttributes {
  id?: number;
  key: string;
  value: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RateLimitCounterCreationAttributes extends Optional<RateLimitCounterAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class RateLimitCounter extends Model<RateLimitCounterAttributes, RateLimitCounterCreationAttributes> implements RateLimitCounterAttributes {
  public id!: number;
  public key!: string;
  public value!: number;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

interface BanRecordAttributes {
  id?: number;
  ip: string;
  reason?: string;
  expiresAt?: Date;
  createdAt?: Date;
  violations?: number;
}

interface BanRecordCreationAttributes extends Optional<BanRecordAttributes, 'id' | 'createdAt'> {}

class BanRecordModel extends Model<BanRecordAttributes, BanRecordCreationAttributes> implements BanRecordAttributes {
  public id!: number;
  public ip!: string;
  public reason?: string;
  public expiresAt?: Date;
  public readonly createdAt!: Date;
  public violations?: number;
}

interface WhitelistAttributes {
  id?: number;
  ip: string;
  createdAt?: Date;
}

interface WhitelistCreationAttributes extends Optional<WhitelistAttributes, 'id' | 'createdAt'> {}

class WhitelistModel extends Model<WhitelistAttributes, WhitelistCreationAttributes> implements WhitelistAttributes {
  public id!: number;
  public ip!: string;
  public readonly createdAt!: Date;
}

interface BlacklistAttributes {
  id?: number;
  ip: string;
  createdAt?: Date;
}

interface BlacklistCreationAttributes extends Optional<BlacklistAttributes, 'id' | 'createdAt'> {}

class BlacklistModel extends Model<BlacklistAttributes, BlacklistCreationAttributes> implements BlacklistAttributes {
  public id!: number;
  public ip!: string;
  public readonly createdAt!: Date;
}

export class DatabaseStorage extends BaseStorage implements StorageInterface {
  private sequelize: Sequelize;
  protected override connected: boolean = false;

  constructor(config: StorageConfig) {
    super(config);
    const dbConfig = config.custom || {};
    this.sequelize = new Sequelize(
      dbConfig.database || 'rate_limiter',
      dbConfig.username || 'root',
      dbConfig.password || '',
      {
        host: dbConfig.host || 'localhost',
        port: dbConfig.port || 5432,
        dialect: dbConfig.dialect || 'postgres',
        logging: dbConfig.logging || false,
        pool: dbConfig.pool || {
          max: 20,
          min: 5,
          acquire: 30000,
          idle: 10000
        }
      }
    );
  }

  async init(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      
      // Initialize models
      RateLimitCounter.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        key: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        value: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      }, {
        sequelize: this.sequelize,
        tableName: 'rate_limit_counters',
        timestamps: true
      });

      BanRecordModel.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        ip: {
          type: DataTypes.STRING(45),
          allowNull: false,
          unique: true
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        violations: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0
        }
      }, {
        sequelize: this.sequelize,
        tableName: 'ban_records',
        timestamps: true
      });

      WhitelistModel.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        ip: {
          type: DataTypes.STRING(45),
          allowNull: false,
          unique: true
        }
      }, {
        sequelize: this.sequelize,
        tableName: 'whitelist',
        timestamps: true
      });

      BlacklistModel.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        ip: {
          type: DataTypes.STRING(45),
          allowNull: false,
          unique: true
        }
      }, {
        sequelize: this.sequelize,
        tableName: 'blacklist',
        timestamps: true
      });

      // Sync database
      await this.sequelize.sync();
      this.connected = true;
    } catch (error) {
      throw new StorageError(`Failed to initialize database storage: ${error}`, 'database_init_failed');
    }
  }

  async increment(key: string, value: number, ttl?: number): Promise<number> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 3600 * 1000);
      
      const [counter, created] = await RateLimitCounter.findOrCreate({
        where: { key },
        defaults: { key, value: 0, expiresAt }
      });

      if (created) {
        counter.value = value;
      } else {
        counter.value += value;
      }

      counter.expiresAt = expiresAt;
      await counter.save();

      return counter.value;
    } catch (error) {
      throw new StorageError(`Failed to increment counter: ${error}`, 'increment_failed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const counter = await RateLimitCounter.findOne({
        where: { key }
      });

      if (!counter) {
        return null;
      }

      // Check if expired
      if (counter.expiresAt < new Date()) {
        await counter.destroy();
        return null;
      }

      return counter.value.toString();
    } catch (error) {
      throw new StorageError(`Failed to get value: ${error}`, 'get_failed');
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 3600 * 1000);
      
      await RateLimitCounter.upsert({
        key,
        value: parseInt(value, 10),
        expiresAt
      });
    } catch (error) {
      throw new StorageError(`Failed to set value: ${error}`, 'set_failed');
    }
  }


  async expire(key: string, ttl: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);
      
      await RateLimitCounter.update(
        { expiresAt },
        { where: { key } }
      );
    } catch (error) {
      throw new StorageError(`Failed to set expiration: ${error}`, 'expire_failed');
    }
  }


  async getWhitelist(): Promise<string[]> {
    try {
      const whitelist = await WhitelistModel.findAll({
        attributes: ['ip']
      });
      return whitelist.map(item => item.ip);
    } catch (error) {
      throw new StorageError(`Failed to get whitelist: ${error}`, 'get_whitelist_failed');
    }
  }

  async addWhitelist(ip: string): Promise<void> {
    try {
      await WhitelistModel.findOrCreate({
        where: { ip },
        defaults: { ip }
      });
    } catch (error) {
      throw new StorageError(`Failed to add to whitelist: ${error}`, 'add_whitelist_failed');
    }
  }

  async removeWhitelist(ip: string): Promise<void> {
    try {
      await WhitelistModel.destroy({
        where: { ip }
      });
    } catch (error) {
      throw new StorageError(`Failed to remove from whitelist: ${error}`, 'remove_whitelist_failed');
    }
  }

  async getBlacklist(): Promise<string[]> {
    try {
      const blacklist = await BlacklistModel.findAll({
        attributes: ['ip']
      });
      return blacklist.map(item => item.ip);
    } catch (error) {
      throw new StorageError(`Failed to get blacklist: ${error}`, 'get_blacklist_failed');
    }
  }

  async addBlacklist(ip: string): Promise<void> {
    try {
      await BlacklistModel.findOrCreate({
        where: { ip },
        defaults: { ip }
      });
    } catch (error) {
      throw new StorageError(`Failed to add to blacklist: ${error}`, 'add_blacklist_failed');
    }
  }

  async removeBlacklist(ip: string): Promise<void> {
    try {
      await BlacklistModel.destroy({
        where: { ip }
      });
    } catch (error) {
      throw new StorageError(`Failed to remove from blacklist: ${error}`, 'remove_blacklist_failed');
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up expired entries
      await RateLimitCounter.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });

      await BanRecordModel.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });
    } catch (error) {
      throw new StorageError(`Failed to cleanup expired entries: ${error}`, 'cleanup_failed');
    }
  }

  async close(): Promise<void> {
    try {
      if (this.connected) {
        await this.sequelize.close();
        this.connected = false;
      }
    } catch (error) {
      throw new StorageError(`Failed to close database connection: ${error}`, 'close_failed');
    }
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async del(key: string): Promise<void> {
    try {
      await RateLimitCounter.destroy({
        where: { key }
      });
    } catch (error) {
      throw new StorageError(`Failed to delete key: ${error}`, 'delete_failed');
    }
  }

  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h
      const [counter] = await RateLimitCounter.findOrCreate({
        where: { key },
        defaults: { key, value: 0, expiresAt }
      });

      const newValue = counter.value + 1;
      await counter.update({ value: newValue });

      return newValue;
    } catch (error) {
      throw new StorageError(`Failed to increment key: ${error}`, 'increment_failed');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const counter = await RateLimitCounter.findOne({
        where: { key }
      });
      return counter !== null;
    } catch (error) {
      throw new StorageError(`Failed to check if key exists: ${error}`, 'exists_failed');
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const counters = await RateLimitCounter.findAll({
        attributes: ['key'],
        where: {
          key: {
            [Op.like]: pattern.replace(/\*/g, '%')
          }
        }
      });
      return counters.map(counter => counter.key);
    } catch (error) {
      throw new StorageError(`Failed to get keys: ${error}`, 'keys_failed');
    }
  }

  async flush(): Promise<void> {
    try {
      await RateLimitCounter.destroy({
        where: {},
        truncate: true
      });
    } catch (error) {
      throw new StorageError(`Failed to flush storage: ${error}`, 'flush_failed');
    }
  }

  async mget(keys: string[]): Promise<any[]> {
    try {
      const counters = await RateLimitCounter.findAll({
        where: {
          key: {
            [Op.in]: keys
          }
        }
      });
      
      const result: any[] = [];
      for (const key of keys) {
        const counter = counters.find(c => c.key === key);
        result.push(counter ? counter.value.toString() : null);
      }
      
      return result;
    } catch (error) {
      throw new StorageError(`Failed to get multiple values: ${error}`, 'mget_failed');
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 3600 * 1000);
      
      const operations = Object.entries(keyValuePairs).map(([key, value]) => ({
        key,
        value: parseInt(value.toString(), 10),
        expiresAt
      }));

      await RateLimitCounter.bulkCreate(operations, {
        updateOnDuplicate: ['value', 'expiresAt']
      });
    } catch (error) {
      throw new StorageError(`Failed to set multiple values: ${error}`, 'mset_failed');
    }
  }

  async mdel(keys: string[]): Promise<number> {
    try {
      const result = await RateLimitCounter.destroy({
        where: {
          key: {
            [Op.in]: keys
          }
        }
      });
      return result;
    } catch (error) {
      throw new StorageError(`Failed to delete multiple keys: ${error}`, 'mdel_failed');
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const counter = await RateLimitCounter.findOne({
        where: { key }
      });
      
      if (!counter) {
        return -2; // Key doesn't exist
      }
      
      if (!counter.expiresAt) {
        return -1; // No expiration
      }
      
      const now = new Date();
      const expiresAt = new Date(counter.expiresAt);
      const ttlSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      
      return ttlSeconds > 0 ? ttlSeconds : -2; // Expired or doesn't exist
    } catch (error) {
      throw new StorageError(`Failed to get TTL: ${error}`, 'ttl_failed');
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const totalKeys = await RateLimitCounter.count();
      
      return {
        connected: this.connected,
        totalKeys,
        memoryUsage: 0, // Database doesn't provide memory usage
        hitRate: this.stats.hitRate,
        missRate: this.stats.missRate,
        operations: this.stats.operations,
        errors: this.stats.errors,
        uptime: Date.now() - this.startTime.getTime(),
        lastError: this.stats.lastError || undefined,
        lastErrorTime: this.stats.lastErrorTime || undefined
      };
    } catch (error) {
      throw new StorageError(`Failed to get stats: ${error}`, 'stats_failed');
    }
  }

  // Ban management methods
  async getBan(ip: string): Promise<any> {
    try {
      const ban = await BanRecordModel.findOne({ where: { ip } });
      return ban ? this.convertBanRecord(ban) : null;
    } catch (error) {
      throw new StorageError(`Failed to get ban record: ${error}`, 'get_ban_failed');
    }
  }

  async setBan(ip: string, banRecord: any): Promise<void> {
    try {
      await BanRecordModel.upsert({
        ip,
        reason: banRecord.reason,
        expiresAt: banRecord.expiresAt,
        violations: banRecord.violationCount || 0,
        // escalated: banRecord.escalated || false, // Field doesn't exist in model
        // appealable: banRecord.appealable || false, // Field doesn't exist in model
        // appealUrl: banRecord.appealUrl, // Field doesn't exist in model
        // metadata: banRecord.metadata, // Field doesn't exist in model
      });
    } catch (error) {
      throw new StorageError(`Failed to set ban record: ${error}`, 'set_ban_failed');
    }
  }

  async removeBan(ip: string): Promise<void> {
    try {
      await BanRecordModel.destroy({ where: { ip } });
    } catch (error) {
      throw new StorageError(`Failed to remove ban record: ${error}`, 'remove_ban_failed');
    }
  }

  async getAllBans(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const bans = await BanRecordModel.findAll({
        limit,
        offset,
        order: [['bannedAt', 'DESC']]
      });
      return bans.map(ban => this.convertBanRecord(ban));
    } catch (error) {
      throw new StorageError(`Failed to get all bans: ${error}`, 'get_all_bans_failed');
    }
  }

  async getBansByReason(reason: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const bans = await BanRecordModel.findAll({
        where: { reason },
        limit,
        offset,
        order: [['bannedAt', 'DESC']]
      });
      return bans.map(ban => this.convertBanRecord(ban));
    } catch (error) {
      throw new StorageError(`Failed to get bans by reason: ${error}`, 'get_bans_by_reason_failed');
    }
  }

  private convertBanRecord(ban: any): BanRecord {
    return {
      ip: ban.ip,
      reason: ban.reason,
      bannedAt: ban.createdAt || new Date(),
      expiresAt: ban.expiresAt,
      duration: ban.duration || '1h', // Default duration
      violationCount: ban.violations || 0,
      lastViolation: ban.updatedAt || ban.createdAt || new Date(),
      escalated: ban.escalated || false,
      appealable: ban.appealable || false,
      appealUrl: ban.appealUrl,
      metadata: ban.metadata,
      createdAt: ban.createdAt,
      updatedAt: ban.updatedAt,
    };
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const counters = await RateLimitCounter.findAll({
        attributes: ['key']
      });
      return counters.map(counter => counter.key);
    } catch (error) {
      throw new StorageError(`Failed to get all keys: ${error}`, 'get_all_keys_failed');
    }
  }

  async delete(key: string): Promise<void> {
    return this.del(key);
  }
}
