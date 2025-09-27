import { IPUtils } from './IPUtils';
import { TimeUtils } from './TimeUtils';
import { ValidationError, MultipleValidationError } from '../errors/ValidationError';

export class ValidationUtils {
  /**
   * Validate a rate limit rule
   * @param rule - Rate limit rule to validate
   * @returns Validation result
   */
  static validateRateLimitRule(rule: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule || typeof rule !== 'object') {
      errors.push('Rule must be an object');
      return { valid: false, errors };
    }

    // Validate requests
    if (typeof rule.requests !== 'number' || rule.requests <= 0) {
      errors.push('requests must be a positive number');
    }

    // Validate window
    if (typeof rule.window !== 'string' || !TimeUtils.isValidTimeWindow(rule.window)) {
      errors.push('window must be a valid time window string (e.g., "1h", "30m", "15s")');
    }

    // Validate banOnExceed (optional)
    if (rule.banOnExceed !== undefined && typeof rule.banOnExceed !== 'boolean') {
      errors.push('banOnExceed must be a boolean');
    }

    // Validate banDuration (optional)
    if (rule.banDuration !== undefined) {
      if (typeof rule.banDuration !== 'string' || !TimeUtils.isValidTimeWindow(rule.banDuration)) {
        errors.push('banDuration must be a valid time window string');
      }
    }

    // Validate warningThreshold (optional)
    if (rule.warningThreshold !== undefined) {
      if (typeof rule.warningThreshold !== 'number' || rule.warningThreshold < 0) {
        errors.push('warningThreshold must be a non-negative number');
      }
    }

    // Validate escalation (optional)
    if (rule.escalation !== undefined) {
      const escalationErrors = this.validateEscalationRule(rule.escalation);
      errors.push(...escalationErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate an escalation rule
   * @param escalation - Escalation rule to validate
   * @returns Array of validation errors
   */
  static validateEscalationRule(escalation: any): string[] {
    const errors: string[] = [];

    if (!escalation || typeof escalation !== 'object') {
      errors.push('escalation must be an object');
      return errors;
    }

    // Validate threshold
    if (typeof escalation.threshold !== 'number' || escalation.threshold <= 0) {
      errors.push('escalation.threshold must be a positive number');
    }

    // Validate multiplier
    if (typeof escalation.multiplier !== 'number' || escalation.multiplier <= 0) {
      errors.push('escalation.multiplier must be a positive number');
    }

    // Validate maxBanDuration
    if (typeof escalation.maxBanDuration !== 'string' || !TimeUtils.isValidTimeWindow(escalation.maxBanDuration)) {
      errors.push('escalation.maxBanDuration must be a valid time window string');
    }

    return errors;
  }

  /**
   * Validate an IP address
   * @param ip - IP address to validate
   * @returns Validation result
   */
  static validateIP(ip: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof ip !== 'string') {
      errors.push('IP must be a string');
      return { valid: false, errors };
    }

    if (!IPUtils.isValidIP(ip)) {
      errors.push('Invalid IP address format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a CIDR range
   * @param cidr - CIDR range to validate
   * @returns Validation result
   */
  static validateCIDR(cidr: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof cidr !== 'string') {
      errors.push('CIDR must be a string');
      return { valid: false, errors };
    }

    if (!IPUtils.isValidCIDR(cidr)) {
      errors.push('Invalid CIDR format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a time window string
   * @param timeWindow - Time window to validate
   * @returns Validation result
   */
  static validateTimeWindow(timeWindow: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof timeWindow !== 'string') {
      errors.push('Time window must be a string');
      return { valid: false, errors };
    }

    if (!TimeUtils.isValidTimeWindow(timeWindow)) {
      errors.push('Invalid time window format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a port number
   * @param port - Port to validate
   * @returns Validation result
   */
  static validatePort(port: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof port !== 'number') {
      errors.push('Port must be a number');
      return { valid: false, errors };
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push('Port must be an integer between 1 and 65535');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a URL
   * @param url - URL to validate
   * @returns Validation result
   */
  static validateURL(url: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof url !== 'string') {
      errors.push('URL must be a string');
      return { valid: false, errors };
    }

    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate an email address
   * @param email - Email to validate
   * @returns Validation result
   */
  static validateEmail(email: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof email !== 'string') {
      errors.push('Email must be a string');
      return { valid: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a configuration object
   * @param config - Configuration to validate
   * @returns Validation result
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return { valid: false, errors };
    }

    // Validate Redis config if present
    if (config.redis) {
      const redisErrors = this.validateRedisConfig(config.redis);
      errors.push(...redisErrors);
    }

    // Validate database config if present
    if (config.database) {
      const dbErrors = this.validateDatabaseConfig(config.database);
      errors.push(...dbErrors);
    }

    // Validate rules if present
    if (config.rules) {
      const rulesErrors = this.validateRules(config.rules);
      errors.push(...rulesErrors);
    }

    // Validate ban management config if present
    if (config.banManagement) {
      const banErrors = this.validateBanManagementConfig(config.banManagement);
      errors.push(...banErrors);
    }

    // Validate analytics config if present
    if (config.analytics) {
      const analyticsErrors = this.validateAnalyticsConfig(config.analytics);
      errors.push(...analyticsErrors);
    }

    // Validate notifications config if present
    if (config.notifications) {
      const notificationErrors = this.validateNotificationConfig(config.notifications);
      errors.push(...notificationErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Redis configuration
   * @param redisConfig - Redis config to validate
   * @returns Array of validation errors
   */
  static validateRedisConfig(redisConfig: any): string[] {
    const errors: string[] = [];

    if (!redisConfig || typeof redisConfig !== 'object') {
      errors.push('Redis config must be an object');
      return errors;
    }

    // Validate host
    if (redisConfig.host !== undefined && typeof redisConfig.host !== 'string') {
      errors.push('Redis host must be a string');
    }

    // Validate port
    if (redisConfig.port !== undefined) {
      const portValidation = this.validatePort(redisConfig.port);
      if (!portValidation.valid) {
        errors.push(...portValidation.errors.map(e => `Redis ${e}`));
      }
    }

    // Validate password
    if (redisConfig.password !== undefined && typeof redisConfig.password !== 'string') {
      errors.push('Redis password must be a string');
    }

    // Validate db
    if (redisConfig.db !== undefined && (typeof redisConfig.db !== 'number' || redisConfig.db < 0)) {
      errors.push('Redis db must be a non-negative number');
    }

    // Validate keyPrefix
    if (redisConfig.keyPrefix !== undefined && typeof redisConfig.keyPrefix !== 'string') {
      errors.push('Redis keyPrefix must be a string');
    }

    // Validate defaultTTL
    if (redisConfig.defaultTTL !== undefined && (typeof redisConfig.defaultTTL !== 'number' || redisConfig.defaultTTL < 0)) {
      errors.push('Redis defaultTTL must be a non-negative number');
    }

    return errors;
  }

  /**
   * Validate database configuration
   * @param dbConfig - Database config to validate
   * @returns Array of validation errors
   */
  static validateDatabaseConfig(dbConfig: any): string[] {
    const errors: string[] = [];

    if (!dbConfig || typeof dbConfig !== 'object') {
      errors.push('Database config must be an object');
      return errors;
    }

    // Validate enabled
    if (dbConfig.enabled !== undefined && typeof dbConfig.enabled !== 'boolean') {
      errors.push('Database enabled must be a boolean');
    }

    // Validate autoCreateTables
    if (dbConfig.autoCreateTables !== undefined && typeof dbConfig.autoCreateTables !== 'boolean') {
      errors.push('Database autoCreateTables must be a boolean');
    }

    // Validate retentionDays
    if (dbConfig.retentionDays !== undefined && (typeof dbConfig.retentionDays !== 'number' || dbConfig.retentionDays < 0)) {
      errors.push('Database retentionDays must be a non-negative number');
    }

    return errors;
  }

  /**
   * Validate rules configuration
   * @param rules - Rules to validate
   * @returns Array of validation errors
   */
  static validateRules(rules: any): string[] {
    const errors: string[] = [];

    if (!rules || typeof rules !== 'object') {
      errors.push('Rules must be an object');
      return errors;
    }

    for (const [endpoint, rule] of Object.entries(rules)) {
      const ruleValidation = this.validateRateLimitRule(rule);
      if (!ruleValidation.valid) {
        errors.push(...ruleValidation.errors.map(e => `Rule for ${endpoint}: ${e}`));
      }
    }

    return errors;
  }

  /**
   * Validate ban management configuration
   * @param banConfig - Ban management config to validate
   * @returns Array of validation errors
   */
  static validateBanManagementConfig(banConfig: any): string[] {
    const errors: string[] = [];

    if (!banConfig || typeof banConfig !== 'object') {
      errors.push('Ban management config must be an object');
      return errors;
    }

    // Validate escalationEnabled
    if (banConfig.escalationEnabled !== undefined && typeof banConfig.escalationEnabled !== 'boolean') {
      errors.push('Ban management escalationEnabled must be a boolean');
    }

    // Validate maxBanDuration
    if (banConfig.maxBanDuration !== undefined) {
      const durationValidation = this.validateTimeWindow(banConfig.maxBanDuration);
      if (!durationValidation.valid) {
        errors.push(...durationValidation.errors.map(e => `Ban management ${e}`));
      }
    }

    // Validate appealProcess
    if (banConfig.appealProcess !== undefined && typeof banConfig.appealProcess !== 'boolean') {
      errors.push('Ban management appealProcess must be a boolean');
    }

    return errors;
  }

  /**
   * Validate analytics configuration
   * @param analyticsConfig - Analytics config to validate
   * @returns Array of validation errors
   */
  static validateAnalyticsConfig(analyticsConfig: any): string[] {
    const errors: string[] = [];

    if (!analyticsConfig || typeof analyticsConfig !== 'object') {
      errors.push('Analytics config must be an object');
      return errors;
    }

    // Validate enabled
    if (analyticsConfig.enabled !== undefined && typeof analyticsConfig.enabled !== 'boolean') {
      errors.push('Analytics enabled must be a boolean');
    }

    // Validate retentionDays
    if (analyticsConfig.retentionDays !== undefined && (typeof analyticsConfig.retentionDays !== 'number' || analyticsConfig.retentionDays < 0)) {
      errors.push('Analytics retentionDays must be a non-negative number');
    }

    // Validate realTimeUpdates
    if (analyticsConfig.realTimeUpdates !== undefined && typeof analyticsConfig.realTimeUpdates !== 'boolean') {
      errors.push('Analytics realTimeUpdates must be a boolean');
    }

    return errors;
  }

  /**
   * Validate notification configuration
   * @param notificationConfig - Notification config to validate
   * @returns Array of validation errors
   */
  static validateNotificationConfig(notificationConfig: any): string[] {
    const errors: string[] = [];

    if (!notificationConfig || typeof notificationConfig !== 'object') {
      errors.push('Notification config must be an object');
      return errors;
    }

    // Validate enabled
    if (notificationConfig.enabled !== undefined && typeof notificationConfig.enabled !== 'boolean') {
      errors.push('Notification enabled must be a boolean');
    }

    // Validate channels
    if (notificationConfig.channels !== undefined) {
      if (!Array.isArray(notificationConfig.channels)) {
        errors.push('Notification channels must be an array');
      } else {
        const validChannels = ['slack', 'email', 'webhook'];
        for (const channel of notificationConfig.channels) {
          if (!validChannels.includes(channel)) {
            errors.push(`Invalid notification channel: ${channel}`);
          }
        }
      }
    }

    // Validate alertThreshold
    if (notificationConfig.alertThreshold !== undefined && (typeof notificationConfig.alertThreshold !== 'number' || notificationConfig.alertThreshold < 0)) {
      errors.push('Notification alertThreshold must be a non-negative number');
    }

    return errors;
  }

  /**
   * Validate a whitelist configuration
   * @param whitelistConfig - Whitelist config to validate
   * @returns Validation result
   */
  static validateWhitelistConfig(whitelistConfig: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!whitelistConfig || typeof whitelistConfig !== 'object') {
      errors.push('Whitelist config must be an object');
      return { valid: false, errors };
    }

    // Validate enabled
    if (whitelistConfig.enabled !== undefined && typeof whitelistConfig.enabled !== 'boolean') {
      errors.push('Whitelist enabled must be a boolean');
    }

    // Validate bypassRateLimit
    if (whitelistConfig.bypassRateLimit !== undefined && typeof whitelistConfig.bypassRateLimit !== 'boolean') {
      errors.push('Whitelist bypassRateLimit must be a boolean');
    }

    // Validate IPs
    if (whitelistConfig.ips !== undefined) {
      if (!Array.isArray(whitelistConfig.ips)) {
        errors.push('Whitelist IPs must be an array');
      } else {
        for (const ip of whitelistConfig.ips) {
          const ipValidation = this.validateIP(ip);
          if (!ipValidation.valid) {
            errors.push(...ipValidation.errors.map(e => `Whitelist IP ${e}`));
          }
        }
      }
    }

    // Validate ranges
    if (whitelistConfig.ranges !== undefined) {
      if (!Array.isArray(whitelistConfig.ranges)) {
        errors.push('Whitelist ranges must be an array');
      } else {
        for (const range of whitelistConfig.ranges) {
          const cidrValidation = this.validateCIDR(range);
          if (!cidrValidation.valid) {
            errors.push(...cidrValidation.errors.map(e => `Whitelist range ${e}`));
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a blacklist configuration
   * @param blacklistConfig - Blacklist config to validate
   * @returns Validation result
   */
  static validateBlacklistConfig(blacklistConfig: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!blacklistConfig || typeof blacklistConfig !== 'object') {
      errors.push('Blacklist config must be an object');
      return { valid: false, errors };
    }

    // Validate enabled
    if (blacklistConfig.enabled !== undefined && typeof blacklistConfig.enabled !== 'boolean') {
      errors.push('Blacklist enabled must be a boolean');
    }

    // Validate immediateBlock
    if (blacklistConfig.immediateBlock !== undefined && typeof blacklistConfig.immediateBlock !== 'boolean') {
      errors.push('Blacklist immediateBlock must be a boolean');
    }

    // Validate IPs
    if (blacklistConfig.ips !== undefined) {
      if (!Array.isArray(blacklistConfig.ips)) {
        errors.push('Blacklist IPs must be an array');
      } else {
        for (const ip of blacklistConfig.ips) {
          const ipValidation = this.validateIP(ip);
          if (!ipValidation.valid) {
            errors.push(...ipValidation.errors.map(e => `Blacklist IP ${e}`));
          }
        }
      }
    }

    // Validate ranges
    if (blacklistConfig.ranges !== undefined) {
      if (!Array.isArray(blacklistConfig.ranges)) {
        errors.push('Blacklist ranges must be an array');
      } else {
        for (const range of blacklistConfig.ranges) {
          const cidrValidation = this.validateCIDR(range);
          if (!cidrValidation.valid) {
            errors.push(...cidrValidation.errors.map(e => `Blacklist range ${e}`));
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate multiple values and return combined results
   * @param validations - Array of validation functions and values
   * @returns Combined validation result
   */
  static validateMultiple(validations: Array<{ validator: (value: any) => { valid: boolean; errors: string[] }; value: any; field: string }>): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];

    for (const { validator, value, field } of validations) {
      const result = validator(value);
      if (!result.valid) {
        allErrors.push(...result.errors.map(error => `${field}: ${error}`));
      }
    }

    return { valid: allErrors.length === 0, errors: allErrors };
  }

  /**
   * Create a validation error
   * @param field - Field name
   * @param value - Field value
   * @param message - Error message
   * @returns ValidationError instance
   */
  static createValidationError(field: string, value: any, message: string): ValidationError {
    return new ValidationError(message, field, value, 'custom');
  }

  /**
   * Create multiple validation errors
   * @param errors - Array of validation errors
   * @returns MultipleValidationError instance
   */
  static createMultipleValidationErrors(errors: ValidationError[]): MultipleValidationError {
    return new MultipleValidationError('Multiple validation errors occurred', errors);
  }
}
