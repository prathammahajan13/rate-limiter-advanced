export interface RateLimitRule {
  name?: string;
  endpoint?: string;
  endpoints?: string[];
  windowMs: number;
  maxRequests: number;
  limit?: number;
  window?: string;
  requests?: number;
  ips?: string[];
  users?: string[];
  countries?: string[];
  isps?: string[];
  userAgents?: string[];
  timeWindows?: string[];
  customMatcher?: (requestInfo: RequestInfo) => boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  banOnExceed?: boolean;
  banDuration?: string;
  warningThreshold?: number;
  escalation?: EscalationRule;
  message?: string;
}

export interface EscalationRule {
  threshold: number;
  multiplier: number;
  maxBanDuration: string;
}

export interface RateLimitConfig {
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
  defaultLimit?: number;
  defaultWindow?: string;
  defaultMessage?: string;
  defaultRule?: RateLimitRule;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any, res: any, info: any) => void;
  onLimitExceeded?: (req: any, res: any, info: any) => void;
}

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
  cluster?: boolean;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export interface DatabaseConfig {
  enabled?: boolean;
  autoCreateTables?: boolean;
  retentionDays?: number;
  connection?: any; // Sequelize instance or config
}

export interface BanManagementConfig {
  escalationEnabled?: boolean;
  maxBanDuration?: string;
  appealProcess?: boolean;
  autoUnban?: boolean;
  violationTracking?: boolean;
}

export interface AnalyticsConfig {
  enabled?: boolean;
  retentionDays?: number;
  realTimeUpdates?: boolean;
  dashboard?: DashboardConfig;
  metrics?: MetricsConfig;
}

export interface DashboardConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  authentication?: boolean;
  apiKey?: string;
}

export interface MetricsConfig {
  requestRate?: boolean;
  violationFrequency?: boolean;
  banEffectiveness?: boolean;
  geographicDistribution?: boolean;
  endpointPopularity?: boolean;
  peakUsageTimes?: boolean;
}

export interface NotificationConfig {
  enabled?: boolean;
  channels?: NotificationChannel[];
  alertThreshold?: number;
  slack?: SlackConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
}

export type NotificationChannel = 'slack' | 'email' | 'webhook';

export interface SlackConfig {
  webhook?: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  messageTypes?: SlackMessageTypes;
}

export interface SlackMessageTypes {
  rateLimitAlert?: string;
  ipBanNotification?: string;
  dailyReport?: string;
  weeklyReport?: string;
}

export interface EmailConfig {
  smtp?: SMTPConfig;
  from?: string;
  to?: string[];
  templates?: EmailTemplates;
}

export interface SMTPConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplates {
  rateLimitAlert?: string;
  ipBanNotification?: string;
  dailyReport?: string;
  weeklyReport?: string;
}

export interface WebhookConfig {
  url?: string;
  secret?: string;
  retryAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface WhitelistConfig {
  enabled?: boolean;
  bypassRateLimit?: boolean;
  ips?: string[];
  ranges?: string[]; // CIDR notation
  countries?: string[];
  isps?: string[];
  apiKeys?: string[];
}

export interface BlacklistConfig {
  enabled?: boolean;
  immediateBlock?: boolean;
  ips?: string[];
  ranges?: string[]; // CIDR notation
  countries?: string[];
  isps?: string[];
  threatIntelligence?: boolean;
}

export interface StorageConfig {
  type?: 'redis' | 'database' | 'memory' | 'custom';
  fallback?: boolean;
  custom?: any;
}

export interface PerformanceConfig {
  monitoring?: boolean;
  maxResponseTime?: number;
  maxMemoryUsage?: number;
  maxCpuUsage?: number;
  optimization?: boolean;
}

export interface RequestInfo {
  ip: string;
  userAgent?: string;
  endpoint?: string;
  path?: string;
  method?: string;
  userId?: string;
  country?: string;
  isp?: string;
  timestamp?: Date;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Retry-After'?: string;
}

export interface EscalationConfig {
  enabled: boolean;
  threshold: number;
  multiplier: number;
  maxBanDuration: string;
  cooldownPeriod: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retryAfter?: number;
  violation?: boolean;
  banApplied?: boolean;
  banDuration?: number;
}

export interface GeolocationData {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string | undefined;
  organization?: string | undefined;
  as?: string | undefined;
  asname?: string | undefined;
  mobile?: boolean | undefined;
  proxy?: boolean | undefined;
  hosting?: boolean | undefined;
}

export interface IPInfo {
  ip: string;
  country?: string | undefined;
  region?: string | undefined;
  city?: string | undefined;
  isp?: string | undefined;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  userAgent?: string;
  fingerprint?: string;
  geolocation: GeolocationData | undefined;
  isWhitelisted?: boolean;
  isBlacklisted?: boolean;
  threatScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BanInfo {
  ip: string;
  reason: string;
  bannedAt: Date;
  expiresAt?: Date;
  violationCount: number;
  lastViolation: Date;
  escalated: boolean;
  appealable: boolean;
  appealUrl?: string;
}

export interface ViolationInfo {
  ip: string;
  endpoint: string;
  timestamp: Date;
  userAgent?: string;
  geolocation?: any;
  violationType: ViolationType;
  severity: ViolationSeverity;
}

export type ViolationType = 'rate_limit_exceeded' | 'suspicious_activity' | 'bot_detected' | 'manual_ban';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnalyticsData {
  totalRequests: number;
  totalViolations: number;
  totalBans: number;
  uniqueIPs: number;
  topViolatingIPs: Array<{ ip: string; violations: number }>;
  topEndpoints: Array<{ endpoint: string; requests: number }>;
  geographicDistribution: Array<{ country: string; requests: number; violations: number }>;
  hourlyDistribution: Array<{ hour: number; requests: number; violations: number }>;
  banEffectiveness: number;
  averageResponseTime: number;
}

export interface MiddlewareOptions {
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any, res: any, info: RateLimitResult) => void;
  onBanApplied?: (req: any, res: any, banInfo: BanInfo) => void;
  customHeaders?: Record<string, string>;
}

export interface StorageInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string, ttl?: number): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  flush(): Promise<void>;
}
