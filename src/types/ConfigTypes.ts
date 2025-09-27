export interface RateLimiterConfig {
  // Core Configuration
  redis?: RedisConfig;
  database?: DatabaseConfig;
  storage?: StorageConfig;
  
  // Rate Limiting Rules
  rules?: Record<string, RateLimitRule>;
  defaultRule?: RateLimitRule;
  
  // Ban Management
  banManagement?: BanManagementConfig;
  
  // Analytics
  analytics?: AnalyticsConfig;
  
  // Notifications
  notifications?: NotificationConfig;
  
  // Security
  whitelist?: WhitelistConfig;
  blacklist?: BlacklistConfig;
  
  // Performance
  performance?: PerformanceConfig;
  
  // Logging
  logging?: LoggingConfig;
  
  // Environment
  environment?: EnvironmentConfig;
}

export interface RedisConfig {
  // Connection
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  
  // Cluster
  cluster?: boolean;
  nodes?: Array<{ host: string; port: number }>;
  
  // Options
  keyPrefix?: string;
  defaultTTL?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  enableReadyCheck?: boolean;
  
  // Security
  tls?: TLSConfig;
  auth?: AuthConfig;
}

export interface TLSConfig {
  enabled: boolean;
  cert?: string;
  key?: string;
  ca?: string;
  rejectUnauthorized?: boolean;
}

export interface AuthConfig {
  username?: string;
  password?: string;
}

export interface DatabaseConfig {
  enabled: boolean;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mariadb';
  
  // Connection
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  
  // Options
  autoCreateTables: boolean;
  retentionDays: number;
  backupEnabled: boolean;
  backupInterval: string;
  backupRetention: number;
  
  // Pool
  pool?: {
    min: number;
    max: number;
    idle: number;
    acquire: number;
    evict: number;
  };
  
  // Logging
  logging: boolean;
  benchmark: boolean;
  
  // Security
  ssl?: SSLConfig;
  timezone?: string;
  charset?: string;
  collate?: string;
}

export interface SSLConfig {
  enabled: boolean;
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface StorageConfig {
  type: 'redis' | 'database' | 'memory' | 'custom';
  fallback: boolean;
  custom?: any;
  
  // Memory Storage
  memory?: {
    maxSize: number;
    cleanupInterval: number;
    ttl: number;
  };
  
  // Custom Storage
  customStorage?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    del: (key: string) => Promise<void>;
    exists: (key: string) => Promise<boolean>;
    incr: (key: string, ttl?: number) => Promise<number>;
    expire: (key: string, ttl: number) => Promise<void>;
    keys: (pattern: string) => Promise<string[]>;
    flush: () => Promise<void>;
  };
}

export interface RateLimitRule {
  requests: number;
  window: string;
  banOnExceed?: boolean;
  banDuration?: string;
  warningThreshold?: number;
  escalation?: EscalationRule;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: string;
  onLimitReached?: string;
  customHeaders?: Record<string, string>;
}

export interface EscalationRule {
  threshold: number;
  multiplier: number;
  maxBanDuration: string;
  conditions?: EscalationCondition[];
}

export interface EscalationCondition {
  type: 'time_window' | 'violation_frequency' | 'endpoint_pattern' | 'geographic' | 'user_agent';
  value: any;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in' | 'not_in';
}

export interface BanManagementConfig {
  enabled: boolean;
  escalationEnabled: boolean;
  maxBanDuration: string;
  appealProcess: boolean;
  autoUnban: boolean;
  violationTracking: boolean;
  
  // Escalation
  escalationRules: BanEscalationRule[];
  
  // Appeals
  appeals?: {
    enabled: boolean;
    autoApprove: boolean;
    reviewRequired: boolean;
    timeLimit: string;
    notificationChannels: string[];
  };
  
  // Cleanup
  cleanup?: {
    enabled: boolean;
    interval: string;
    retentionDays: number;
    batchSize: number;
  };
}

export interface BanEscalationRule {
  level: number;
  violationThreshold: number;
  banDuration: string;
  multiplier?: number;
  maxDuration?: string;
  conditions?: EscalationCondition[];
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  realTimeUpdates: boolean;
  
  // Dashboard
  dashboard?: {
    enabled: boolean;
    port: number;
    host: string;
    authentication: boolean;
    apiKey?: string;
    cors?: CorsConfig;
    rateLimit?: DashboardRateLimit;
  };
  
  // Metrics
  metrics?: {
    requestRate: boolean;
    violationFrequency: boolean;
    banEffectiveness: boolean;
    geographicDistribution: boolean;
    endpointPopularity: boolean;
    peakUsageTimes: boolean;
    userAgentAnalysis: boolean;
    responseTimeAnalysis: boolean;
    errorRateAnalysis: boolean;
    customMetrics: CustomMetric[];
  };
  
  // Export
  export?: {
    formats: ExportFormat[];
    schedules: ExportSchedule[];
    destinations: ExportDestination[];
  };
  
  // Performance
  performance?: {
    batchSize: number;
    flushInterval: number;
    compression: boolean;
    indexing: boolean;
  };
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  credentials: boolean;
  methods: string[];
  headers: string[];
}

export interface DashboardRateLimit {
  enabled: boolean;
  requests: number;
  window: string;
  skipSuccessfulRequests: boolean;
}

export interface CustomMetric {
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
  aggregation?: AggregationConfig;
}

export interface AggregationConfig {
  method: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  window: string;
  percentile?: number;
}

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf' | 'xml';

export interface ExportSchedule {
  name: string;
  cron: string;
  format: ExportFormat;
  filters: ExportFilters;
  destination: string;
  enabled: boolean;
}

export interface ExportDestination {
  name: string;
  type: 'email' | 'webhook' | 's3' | 'ftp' | 'local';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ExportFilters {
  dateRange?: DateRange;
  metrics?: string[];
  dimensions?: string[];
  aggregations?: AggregationConfig[];
  customFilters?: Record<string, any>;
}

export interface DateRange {
  start: Date;
  end: Date;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  alertThreshold: number;
  
  // Slack
  slack?: {
    webhook?: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    messageTypes?: SlackMessageTypes;
    retryAttempts?: number;
    timeout?: number;
  };
  
  // Email
  email?: {
    smtp?: SMTPConfig;
    from?: string;
    to?: string[];
    templates?: EmailTemplates;
    retryAttempts?: number;
    timeout?: number;
  };
  
  // Webhook
  webhook?: {
    url?: string;
    secret?: string;
    retryAttempts?: number;
    timeout?: number;
    headers?: Record<string, string>;
    authentication?: WebhookAuth;
  };
  
  // Rate Limiting
  rateLimit?: {
    enabled: boolean;
    requests: number;
    window: string;
  };
  
  // Templates
  templates?: {
    rateLimitAlert?: string;
    ipBanNotification?: string;
    dailyReport?: string;
    weeklyReport?: string;
    custom?: Record<string, string>;
  };
}

export type NotificationChannel = 'slack' | 'email' | 'webhook';

export interface SlackMessageTypes {
  rateLimitAlert?: string;
  ipBanNotification?: string;
  dailyReport?: string;
  weeklyReport?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export interface EmailTemplates {
  rateLimitAlert?: string;
  ipBanNotification?: string;
  dailyReport?: string;
  weeklyReport?: string;
}

export interface WebhookAuth {
  type: 'bearer' | 'basic' | 'api_key' | 'custom';
  credentials: Record<string, string>;
}

export interface WhitelistConfig {
  enabled: boolean;
  bypassRateLimit: boolean;
  
  // IP Lists
  ips: string[];
  ranges: string[]; // CIDR notation
  
  // Geographic
  countries: string[];
  regions: string[];
  cities: string[];
  
  // Network
  isps: string[];
  organizations: string[];
  
  // Authentication
  apiKeys: string[];
  tokens: string[];
  
  // Custom
  customRules: WhitelistRule[];
  
  // Management
  autoUpdate: boolean;
  updateInterval: string;
  sources: WhitelistSource[];
}

export interface WhitelistRule {
  name: string;
  description: string;
  conditions: WhitelistCondition[];
  actions: WhitelistAction[];
  enabled: boolean;
  priority: number;
}

export interface WhitelistCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  caseSensitive?: boolean;
}

export interface WhitelistAction {
  type: 'bypass_rate_limit' | 'increase_limit' | 'reduce_ban_severity' | 'skip_analytics';
  parameters: Record<string, any>;
}

export interface WhitelistSource {
  name: string;
  type: 'api' | 'file' | 'database' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
  updateInterval: string;
}

export interface BlacklistConfig {
  enabled: boolean;
  immediateBlock: boolean;
  
  // IP Lists
  ips: string[];
  ranges: string[]; // CIDR notation
  
  // Geographic
  countries: string[];
  regions: string[];
  cities: string[];
  
  // Network
  isps: string[];
  organizations: string[];
  
  // Threat Intelligence
  threatIntelligence: boolean;
  threatSources: ThreatSource[];
  
  // Custom
  customRules: BlacklistRule[];
  
  // Management
  autoUpdate: boolean;
  updateInterval: string;
  sources: BlacklistSource[];
}

export interface ThreatSource {
  name: string;
  type: 'api' | 'feed' | 'database';
  config: Record<string, any>;
  enabled: boolean;
  updateInterval: string;
  reliability: number; // 0-1
}

export interface BlacklistRule {
  name: string;
  description: string;
  conditions: BlacklistCondition[];
  actions: BlacklistAction[];
  enabled: boolean;
  priority: number;
}

export interface BlacklistCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  caseSensitive?: boolean;
}

export interface BlacklistAction {
  type: 'immediate_block' | 'rate_limit' | 'ban' | 'notify';
  parameters: Record<string, any>;
}

export interface BlacklistSource {
  name: string;
  type: 'api' | 'file' | 'database' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
  updateInterval: string;
}

export interface PerformanceConfig {
  monitoring: boolean;
  maxResponseTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  optimization: boolean;
  
  // Caching
  caching?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  
  // Compression
  compression?: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate' | 'brotli';
    level: number;
    threshold: number;
  };
  
  // Connection Pooling
  connectionPooling?: {
    enabled: boolean;
    min: number;
    max: number;
    idle: number;
    acquire: number;
    evict: number;
  };
  
  // Batch Processing
  batchProcessing?: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number;
    maxWaitTime: number;
  };
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format: 'json' | 'text' | 'combined';
  
  // Output
  output: {
    console: boolean;
    file: boolean;
    filePath?: string;
    maxSize?: string;
    maxFiles?: number;
  };
  
  // Filters
  filters?: {
    include?: string[];
    exclude?: string[];
    levels?: string[];
  };
  
  // Performance
  performance?: {
    enabled: boolean;
    slowThreshold: number;
    includeStack: boolean;
  };
  
  // Security
  security?: {
    enabled: boolean;
    maskSensitiveData: boolean;
    sensitiveFields: string[];
  };
}

export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production' | 'test';
  
  // Environment-specific overrides
  overrides?: {
    redis?: Partial<RedisConfig>;
    database?: Partial<DatabaseConfig>;
    analytics?: Partial<AnalyticsConfig>;
    notifications?: Partial<NotificationConfig>;
    logging?: Partial<LoggingConfig>;
    performance?: Partial<PerformanceConfig>;
  };
  
  // Feature flags
  features?: {
    analytics: boolean;
    notifications: boolean;
    banManagement: boolean;
    whitelist: boolean;
    blacklist: boolean;
    dashboard: boolean;
    api: boolean;
  };
  
  // Security
  security?: {
    strictMode: boolean;
    validation: boolean;
    sanitization: boolean;
    encryption: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface ConfigValidator {
  validate(config: any): ValidationResult;
  getSchema(): ConfigSchema;
  addRule(field: string, rule: ValidationRule): void;
  removeRule(field: string): void;
}

export interface ValidationRule {
  type: 'required' | 'type' | 'format' | 'range' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface AdvancedRateLimiterConfig {
  redis?: RedisConfig;
  database?: DatabaseConfig;
  rules?: Record<string, RateLimitRule>;
  banManagement?: BanManagementConfig;
  analytics?: AnalyticsConfig;
  notifications?: NotificationConfig;
  whitelist?: WhitelistConfig;
  blacklist?: BlacklistConfig;
  storage?: StorageConfig;
  performance?: PerformanceConfig;
}
