export interface BanConfig {
  enabled: boolean;
  defaultDuration: string;
  escalationEnabled: boolean;
  maxDuration: string;
  appealEnabled: boolean;
  appealUrl?: string;
  autoUnban: boolean;
  autoUnbanAfter: string;
  notificationChannels: string[];
  escalationRules: BanEscalationRule[];
}

export interface BanRecord {
  id?: number;
  ip: string;
  reason: BanReason;
  bannedAt: Date;
  expiresAt: Date | undefined;
  duration: string | undefined;
  violationCount: number;
  lastViolation: Date;
  escalated: boolean;
  appealable: boolean;
  appealUrl: string | undefined;
  metadata: BanMetadata | undefined;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export type BanReason = 
  | 'otp_abuse'
  | 'login_attempts'
  | 'api_abuse'
  | 'suspicious_activity'
  | 'manual_ban'
  | 'bot_detected'
  | 'vpn_proxy_detected'
  | 'geographic_restriction'
  | 'threat_intelligence'
  | 'rate_limit_violation';

export interface BanMetadata {
  endpoint?: string;
  userAgent?: string;
  geolocation?: GeolocationData;
  violationHistory?: ViolationRecord[];
  escalationLevel?: number;
  previousBans?: number;
  banCount?: number;
  threatScore?: number;
  customData?: Record<string, any>;
  lastViolation?: Date;
}

export interface GeolocationData {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  as?: string;
  asname?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

export interface ViolationRecord {
  id?: number;
  ip: string;
  endpoint: string;
  timestamp: Date;
  violationType: ViolationType;
  severity: ViolationSeverity;
  userAgent?: string;
  geolocation?: GeolocationData;
  requestData?: RequestData;
  responseData?: ResponseData;
  metadata?: Record<string, any>;
}

export type ViolationType = 
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'bot_detected'
  | 'manual_ban'
  | 'geographic_violation'
  | 'user_agent_anomaly'
  | 'request_pattern_anomaly'
  | 'frequency_anomaly';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RequestData {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  params?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  referer?: string;
  origin?: string;
}

export interface ResponseData {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: any;
  responseTime?: number;
  error?: string;
}

export interface BanEscalationRule {
  name?: string;
  level: number;
  violationThreshold: number;
  banDuration: string;
  multiplier?: number;
  maxDuration?: string;
  minBanDuration?: string;
  newDuration?: string;
  durationMultiplier?: number;
  violationTypes?: string[];
  banReasons?: BanReason[];
  minBanCount?: number;
  conditions?: EscalationCondition[];
  newReason?: BanReason;
}

export interface EscalationCondition {
  type: 'time_window' | 'violation_frequency' | 'endpoint_pattern' | 'geographic' | 'user_agent';
  value: any;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in' | 'not_in';
}

export interface BanAppeal {
  id?: number;
  banId: number;
  ip: string;
  submittedAt: Date;
  status: AppealStatus;
  reason?: string;
  evidence?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  decision?: AppealDecision;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

export type AppealDecision = 'approve' | 'reject' | 'reduce_ban' | 'extend_ban';

export interface BanStatistics {
  totalBans: number;
  activeBans: number;
  expiredBans: number;
  permanentBans: number;
  bansByReason: Record<BanReason, number>;
  bansByCountry: Record<string, number>;
  averageBanDuration: number;
  escalationRate: number;
  appealRate: number;
  appealApprovalRate: number;
  topViolatingIPs: Array<{ ip: string; violations: number; bans: number }>;
  banEffectiveness: number;
  falsePositiveRate: number;
}

export interface BanQueryOptions {
  ip?: string;
  reason?: BanReason;
  status?: 'active' | 'expired' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'bannedAt' | 'expiresAt' | 'violationCount' | 'ip';
  sortOrder?: 'asc' | 'desc';
}

export interface BanUpdateOptions {
  reason?: BanReason;
  expiresAt?: Date;
  appealable?: boolean;
  appealUrl?: string;
  metadata?: BanMetadata;
}

export interface BanBulkOptions {
  ips: string[];
  reason: BanReason;
  duration?: string;
  appealable?: boolean;
  metadata?: BanMetadata;
}

export interface BanImportOptions {
  source: 'csv' | 'json' | 'api';
  data: any;
  mapping?: Record<string, string>;
  validation?: boolean;
  dryRun?: boolean;
}

export interface BanExportOptions {
  format: 'csv' | 'json' | 'xml';
  fields?: string[];
  filters?: BanQueryOptions;
  includeMetadata?: boolean;
}

export interface BanNotificationData {
  type: 'ban_applied' | 'ban_expired' | 'ban_escalated' | 'appeal_submitted' | 'appeal_decision';
  ban: BanRecord;
  previousBan?: BanRecord;
  appeal?: BanAppeal;
  metadata?: Record<string, any>;
}

export interface BanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface BanPolicy {
  name: string;
  description: string;
  rules: BanPolicyRule[];
  enabled: boolean;
  priority: number;
  conditions?: BanPolicyCondition[];
}

export interface BanPolicyRule {
  type: 'auto_ban' | 'escalate' | 'notify' | 'whitelist' | 'blacklist';
  parameters: Record<string, any>;
  conditions?: BanPolicyCondition[];
}

export interface BanPolicyCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  caseSensitive?: boolean;
}
