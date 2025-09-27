// Core exports
export { RateLimiter } from './core/RateLimiter';
export { IPManager } from './core/IPManager';
export { RuleEngine } from './core/RuleEngine';
export { BanManager } from './core/BanManager';

// Storage exports
export { StorageInterface } from './storage/StorageInterface';
export { RedisStorage } from './storage/RedisStorage';
export { DatabaseStorage } from './storage/DatabaseStorage';
export { MemoryStorage } from './storage/MemoryStorage';

// Middleware exports
export { RateLimitMiddleware } from './middleware/RateLimitMiddleware';
export { IPBanMiddleware } from './middleware/IPBanMiddleware';
export { WhitelistMiddleware } from './middleware/WhitelistMiddleware';
export { BlacklistMiddleware } from './middleware/BlacklistMiddleware';

// Analytics exports
export { AnalyticsCollector } from './analytics/AnalyticsCollector';
export { ReportGenerator } from './analytics/ReportGenerator';
export { MetricsCalculator } from './analytics/MetricsCalculator';
export { DashboardAPI } from './analytics/DashboardAPI';

// Notification exports
export { NotificationManager } from './notifications/NotificationManager';
export { SlackNotifier } from './notifications/SlackNotifier';
export { EmailNotifier } from './notifications/EmailNotifier';
export { WebhookNotifier } from './notifications/WebhookNotifier';

// Utility exports
export { IPUtils } from './utils/IPUtils';
export { TimeUtils } from './utils/TimeUtils';
export { ValidationUtils } from './utils/ValidationUtils';
export { CryptoUtils } from './utils/CryptoUtils';

// Type exports - specific exports to avoid conflicts
export type {
  RateLimitRule,
  RateLimitConfig,
  RequestInfo,
  RateLimitHeaders,
  EscalationConfig,
  WhitelistConfig,
  BlacklistConfig,
  IPInfo,
  GeolocationData
} from './types/RateLimitTypes';

export type {
  BanReason,
  BanRecord,
  BanConfig,
  BanEscalationRule
} from './types/BanTypes';

export type {
  AnalyticsConfig,
  MetricData,
  ReportData,
  DashboardConfig,
  MetricsConfig,
  ExportConfig
} from './types/AnalyticsTypes';

export type {
  AdvancedRateLimiterConfig
} from './types/ConfigTypes';

// Error exports
export { RateLimitQuotaExceededError } from './errors/RateLimitError';
export { BanError } from './errors/BanError';
export { StorageError, StorageKeyNotFoundError } from './errors/StorageError';
export { ValidationError } from './errors/ValidationError';

// Main RateLimiter class (default export)
import { RateLimiter } from './core/RateLimiter';
export default RateLimiter;
