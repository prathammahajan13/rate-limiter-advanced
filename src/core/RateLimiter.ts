import { EventEmitter } from 'events';
import { StorageInterface, StorageConfig } from '../storage/StorageInterface';
import { RedisStorage } from '../storage/RedisStorage';
import { MemoryStorage } from '../storage/MemoryStorage';
import { DatabaseStorage } from '../storage/DatabaseStorage';
import { RateLimitConfig, RateLimitRule, RateLimitResult } from '../types/RateLimitTypes';
import { BanManager } from './BanManager';
import { IPManager } from './IPManager';
import { RuleEngine } from './RuleEngine';
import { AnalyticsCollector } from '../analytics/AnalyticsCollector';
import { NotificationManager } from '../notifications/NotificationManager';
import { ValidationUtils } from '../utils/ValidationUtils';
import { TimeUtils } from '../utils/TimeUtils';
import { IPUtils } from '../utils/IPUtils';
import { RateLimitError, RateLimitConfigurationError, RateLimitStorageError } from '../errors/RateLimitError';
import { BanError } from '../errors/BanError';
import { ValidationError } from '../errors/ValidationError';

export class RateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private storage!: StorageInterface;
  private banManager!: BanManager;
  private ipManager!: IPManager;
  private ruleEngine!: RuleEngine;
  private analyticsCollector?: AnalyticsCollector;
  private notificationManager?: NotificationManager;
  private initialized: boolean = false;

  constructor(config: RateLimitConfig) {
    super();
    this.config = this.validateAndMergeConfig(config);
    this.initialize();
  }

  private validateAndMergeConfig(config: RateLimitConfig): RateLimitConfig {
    const validation = ValidationUtils.validateConfig(config);
    if (!validation.valid) {
      throw new RateLimitConfigurationError(
        `Invalid configuration: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    // Merge with default configuration
    const defaultConfig: RateLimitConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'rate_limiter:',
        defaultTTL: 3600,
      },
      database: {
        enabled: true,
        autoCreateTables: true,
        retentionDays: 90,
      },
      rules: {},
      banManagement: {
        escalationEnabled: true,
        maxBanDuration: '30d',
        appealProcess: true,
        autoUnban: true,
        violationTracking: true,
      },
      analytics: {
        enabled: true,
        retentionDays: 365,
        realTimeUpdates: true,
      },
      notifications: {
        enabled: true,
        channels: ['slack'],
        alertThreshold: 10,
      },
      whitelist: {
        enabled: true,
        bypassRateLimit: true,
        ips: [],
        ranges: [],
        countries: [],
        isps: [],
        apiKeys: [],
      },
      blacklist: {
        enabled: true,
        immediateBlock: true,
        ips: [],
        ranges: [],
        countries: [],
        isps: [],
        threatIntelligence: false,
      },
      performance: {
        monitoring: true,
        maxResponseTime: 10,
        maxMemoryUsage: 100,
        maxCpuUsage: 80,
        optimization: true,
      },
    };

    return this.deepMerge(defaultConfig, config);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize storage
      await this.initializeStorage();

      // Initialize analytics if enabled
      if (this.config.analytics?.enabled) {
        this.analyticsCollector = new AnalyticsCollector(this.config.analytics as any, this.storage);
        // AnalyticsCollector doesn't have an init method, it's initialized in constructor
      }

      // Initialize components
      // Convert BanManagementConfig to BanConfig
      const banConfig = this.config.banManagement ? {
        enabled: true,
        defaultDuration: '1h',
        escalationEnabled: this.config.banManagement.escalationEnabled || false,
        maxDuration: this.config.banManagement.maxBanDuration || '30d',
        appealEnabled: this.config.banManagement.appealProcess || false,
        autoUnban: this.config.banManagement.autoUnban || false,
        autoUnbanAfter: '7d',
        notificationChannels: [],
        escalationRules: []
      } : {
        enabled: false,
        defaultDuration: '1h',
        escalationEnabled: false,
        maxDuration: '30d',
        appealEnabled: false,
        autoUnban: false,
        autoUnbanAfter: '7d',
        notificationChannels: [],
        escalationRules: []
      };
      
      this.banManager = new BanManager(this.storage, banConfig, this.analyticsCollector!, this.notificationManager!);
      this.ipManager = new IPManager(this.config.whitelist || { enabled: false }, this.config.blacklist || { enabled: false });
      this.ruleEngine = new RuleEngine(this.config.rules || {});

      // Initialize notifications if enabled
      if (this.config.notifications?.enabled) {
        this.notificationManager = new NotificationManager(this.config.notifications);
        await this.notificationManager.initialize();
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw new RateLimitConfigurationError(
        `Failed to initialize rate limiter: ${error}`,
        error
      );
    }
  }

  private async initializeStorage(): Promise<void> {
    // Determine storage type from config
    const storageType = this.config.storage?.type || (this.config.redis ? 'redis' : 'memory');
    
    const storageConfig: StorageConfig = {
      type: storageType,
      fallback: this.config.storage?.fallback ?? true,
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      keyPrefix: this.config.redis?.keyPrefix || 'rate_limiter:',
      compression: false,
      encryption: false,
      custom: this.config.redis,
    };

    try {
      if (storageType === 'redis' && this.config.redis) {
        this.storage = new RedisStorage(storageConfig);
        await this.storage.isConnected();
      } else if (storageType === 'database' && this.config.database) {
        this.storage = new DatabaseStorage(storageConfig);
        await this.storage.isConnected();
      } else {
        // Use memory storage
        this.storage = new MemoryStorage(storageConfig);
      }
    } catch (error) {
      if (this.config.storage?.fallback) {
        // Fallback to memory storage
        this.storage = new MemoryStorage({ ...storageConfig, type: 'memory' });
        this.emit('warning', `Storage connection failed, falling back to memory storage: ${error}`);
      } else {
        throw new RateLimitStorageError(
          `Failed to initialize storage: ${error}`,
          false,
          error as Error
        );
      }
    }
  }

  /**
   * Check if a request should be allowed based on rate limiting rules
   * @param ip - IP address of the request
   * @param endpoint - Endpoint being accessed
   * @param userAgent - User agent string (optional)
   * @param userId - User ID (optional)
   * @returns Rate limit result
   */
  async checkRateLimit(
    ip: string,
    endpoint: string,
    userAgent?: string,
    userId?: string
  ): Promise<RateLimitResult> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, endpoint);
    }

    try {
      // Validate IP address
      if (!IPUtils.isValidIP(ip)) {
        throw new ValidationError('Invalid IP address', 'ip', ip, 'format');
      }

      // Check if IP is banned
      const banInfo = await this.banManager.getBanInfo(ip);
      if (banInfo) {
        throw new BanError(
          'IP address is banned',
          ip,
          banInfo.reason,
          banInfo.expiresAt,
          banInfo.appealable,
          banInfo.appealUrl,
          banInfo.violationCount,
          banInfo.lastViolation
        );
      }

      // Check whitelist/blacklist
      const ipInfo = await this.ipManager.getIPInfo(ip, userAgent);
      if (ipInfo.isBlacklisted) {
        throw new BanError('IP address is blacklisted', ip, 'blacklisted');
      }

      // Get rate limit rule for endpoint
      const rule = this.ruleEngine.getRule(endpoint);
      const windowStart = TimeUtils.getWindowStart(TimeUtils.now(), rule.window || '1h');
      const key = this.generateKey(ip, endpoint, windowStart, userId);

      // Check current count
      const currentCount = await this.storage.incr(key, 1);
      const remaining = Math.max(0, rule.maxRequests - currentCount);
      const resetTime = TimeUtils.getWindowEnd(TimeUtils.now(), rule.window || '1h');

      const result: RateLimitResult = {
        allowed: currentCount <= rule.maxRequests,
        remaining,
        resetTime: resetTime,
        totalHits: currentCount,
        violation: currentCount > rule.maxRequests,
        banApplied: false,
      };

      // Handle rate limit violation
      if (result.violation) {
        result.retryAfter = TimeUtils.getRemainingTime(TimeUtils.now(), windowStart, rule.window || '1h');
        
        // Record violation
        await this.recordViolation(ip, endpoint, userAgent);

        // Apply ban if configured
        if (rule.banOnExceed) {
          const banDuration = rule.banDuration || this.config.banManagement?.maxBanDuration || '1h';
          await this.banManager.banIP(ip, 'rate_limit_violation', banDuration, {
            endpoint,
            userAgent,
            violationCount: currentCount,
          });
          result.banApplied = true;
          result.banDuration = TimeUtils.parseTimeWindow(banDuration);
        }

        // Send notification
        if (this.notificationManager && currentCount >= (this.config.notifications?.alertThreshold || 10)) {
          await this.notificationManager.sendRateLimitAlert({
            ip,
            endpoint,
            userAgent: userAgent || '',
            violationCount: currentCount,
            rule,
          });
        }
      }

      // Record analytics
      if (this.analyticsCollector) {
          await this.analyticsCollector.recordRequest(
            ip,
            endpoint,
            'GET', // Default method, should be passed from request
            result.allowed ? 200 : 429,
            Date.now(),
            { userAgent: userAgent || '', status: result.violation ? 'rate_limit_exceeded' : 'success' }
          );
      }

      this.emit('rateLimitCheck', { ip, endpoint, result });

      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Record a violation for analytics and ban management
   */
  private   async recordViolation(
    ip: string,
    endpoint: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Record in analytics
      if (this.analyticsCollector) {
        await this.analyticsCollector.recordViolation(ip, endpoint, userAgent || '', Date.now(), 'rate_limit_exceeded');
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(ip: string, endpoint: string, windowStart: number, userId?: string): string {
    const baseKey = `${ip}:${endpoint}:${windowStart}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }

  /**
   * Get rate limit information for an IP and endpoint
   * @param ip - IP address
   * @param endpoint - Endpoint
   * @param userId - User ID (optional)
   * @returns Rate limit information
   */
  async getRateLimitInfo(ip: string, endpoint: string, userId?: string): Promise<{
    rule: RateLimitRule;
    currentCount: number;
    remaining: number;
    resetTime: number;
    windowStart: number;
  }> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, endpoint);
    }

    const rule = this.ruleEngine.getRule(endpoint);
    const windowStart = TimeUtils.getWindowStart(TimeUtils.now(), rule.window || '1h');
    const key = this.generateKey(ip, endpoint, windowStart, userId);
    
    const currentCount = await this.storage.get(key) || 0;
    const remaining = Math.max(0, rule.maxRequests - currentCount);
    const resetTime = TimeUtils.getWindowEnd(TimeUtils.now(), rule.window || '1h');

    return {
      rule,
      currentCount,
      remaining,
      resetTime,
      windowStart,
    };
  }

  /**
   * Reset rate limit for an IP and endpoint
   * @param ip - IP address
   * @param endpoint - Endpoint
   * @param userId - User ID (optional)
   */
  async resetRateLimit(ip: string, endpoint: string, userId?: string): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, endpoint);
    }

    const rule = this.ruleEngine.getRule(endpoint);
    const windowStart = TimeUtils.getWindowStart(TimeUtils.now(), rule.window || '1h');
    const key = this.generateKey(ip, endpoint, windowStart, userId);
    
    await this.storage.del(key);
    this.emit('rateLimitReset', { ip, endpoint, userId });
  }

  /**
   * Get ban information for an IP
   * @param ip - IP address
   * @returns Ban information or null if not banned
   */
  async getBanInfo(ip: string): Promise<any> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, '');
    }

    return await this.banManager.getBanInfo(ip);
  }

  /**
   * Ban an IP address
   * @param ip - IP address to ban
   * @param reason - Reason for the ban
   * @param duration - Ban duration (optional, defaults to permanent)
   * @param metadata - Additional metadata
   */
  async banIP(ip: string, reason: string, duration?: string, metadata?: any): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, '');
    }

    await this.banManager.banIP(ip, reason as any, duration, metadata);
    this.emit('ipBanned', { ip, reason, duration, metadata });
  }

  /**
   * Unban an IP address
   * @param ip - IP address to unban
   */
  async unbanIP(ip: string): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, ip, '');
    }

    await this.banManager.unbanIP(ip);
    this.emit('ipUnbanned', { ip });
  }

  /**
   * Get analytics data
   * @param query - Analytics query
   * @returns Analytics data
   */
  async getAnalytics(query?: any): Promise<any> {
    if (!this.analyticsCollector) {
      throw new RateLimitError('Analytics not enabled', 0, 0, 0, 0, '', '');
    }

    // Use query if provided, otherwise use default 24h range
    const endTime = new Date();
    const startTime = query?.startTime ? new Date(query.startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return await this.analyticsCollector.getMetrics(startTime, endTime);
  }

  /**
   * Get storage statistics
   * @returns Storage statistics
   */
  async getStorageStats(): Promise<any> {
    if (!this.initialized) {
      throw new RateLimitError('Rate limiter not initialized', 0, 0, 0, 0, '', '');
    }

    return await this.storage.getStats();
  }

  /**
   * Get rate limiter health status
   * @returns Health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      storage: boolean;
      banManager: boolean;
      analytics: boolean;
      notifications: boolean;
    };
    uptime: number;
    version: string;
  }> {
    const startTime = Date.now();
    const components = {
      storage: false,
      banManager: false,
      analytics: false,
      notifications: false,
    };

    try {
      components.storage = await this.storage.isConnected();
      components.banManager = this.banManager !== undefined;
      components.analytics = this.analyticsCollector !== undefined;
      components.notifications = this.notificationManager !== undefined;
    } catch (error) {
      // Ignore errors for health check
    }

    const healthyComponents = Object.values(components).filter(Boolean).length;
    const totalComponents = Object.keys(components).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyComponents === totalComponents) {
      status = 'healthy';
    } else if (healthyComponents >= totalComponents / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      components,
      uptime: Date.now() - startTime,
      version: '1.0.3',
    };
  }

  /**
   * Close the rate limiter and cleanup resources
   */
  async close(): Promise<void> {
    try {
      if (this.analyticsCollector) {
        // AnalyticsCollector doesn't have a close method
      }
      
      if (this.notificationManager) {
        await this.notificationManager.close();
      }
      
      if (this.storage) {
        await this.storage.close();
      }
      
      this.initialized = false;
      this.emit('closed');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires reinitialization)
   * @param newConfig - New configuration
   */
  async updateConfig(newConfig: Partial<RateLimitConfig>): Promise<void> {
    const mergedConfig = this.deepMerge(this.config, newConfig);
    const validation = ValidationUtils.validateConfig(mergedConfig);
    
    if (!validation.valid) {
      throw new RateLimitConfigurationError(
        `Invalid configuration: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    this.config = mergedConfig;
    await this.close();
    await this.initialize();
  }

  /**
   * Get the storage instance (for advanced usage)
   * @returns Storage instance
   */
  getStorage(): StorageInterface {
    return this.storage;
  }

  /**
   * Get the ban manager instance
   * @returns Ban manager instance
   */
  getBanManager(): BanManager {
    return this.banManager;
  }

  /**
   * Get the IP manager instance
   * @returns IP manager instance
   */
  getIPManager(): IPManager {
    return this.ipManager;
  }

  /**
   * Get the rule engine instance
   * @returns Rule engine instance
   */
  getRuleEngine(): RuleEngine {
    return this.ruleEngine;
  }

  /**
   * Get the analytics collector instance
   * @returns Analytics collector instance or undefined
   */
  getAnalyticsCollector(): AnalyticsCollector | undefined {
    return this.analyticsCollector;
  }

  /**
   * Create Express middleware for rate limiting
   * @returns Express middleware function
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const ip = this.extractIP(req);
        const endpoint = req.path || req.url;
        
        const result = await this.checkRateLimit(ip, endpoint);
        
        if (result.allowed) {
          // Add rate limit headers
          res.set({
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.resetTime,
            'X-RateLimit-Total': result.totalHits
          });
          next();
        } else {
          // Rate limit exceeded
          res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests',
            retryAfter: result.retryAfter
          });
        }
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Extract IP address from request
   * @param req - Express request object
   * @returns IP address
   */
  private extractIP(req: any): string {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           '127.0.0.1';
  }

  /**
   * Get the notification manager instance
   * @returns Notification manager instance or undefined
   */
  getNotificationManager(): NotificationManager | undefined {
    return this.notificationManager;
  }
}
