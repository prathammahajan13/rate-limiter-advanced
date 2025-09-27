export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  realTimeUpdates: boolean;
  autoGenerateReports?: boolean;
  reportInterval?: string;
  dashboard?: DashboardConfig;
  metrics?: MetricsConfig;
  export?: ExportConfig;
}

export interface DashboardConfig {
  enabled: boolean;
  port: number;
  host: string;
  authentication: boolean;
  apiKey?: string;
  cors?: CorsConfig;
  rateLimit?: DashboardRateLimit;
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

export interface MetricsConfig {
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

export interface ExportConfig {
  formats: ExportFormat[];
  schedules: ExportSchedule[];
  destinations: ExportDestination[];
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

export interface AnalyticsData {
  timestamp: Date;
  period: AnalyticsPeriod;
  overview: OverviewMetrics;
  requests: RequestMetrics;
  violations: ViolationMetrics;
  bans: BanMetrics;
  geographic: GeographicMetrics;
  endpoints: EndpointMetrics;
  performance: PerformanceMetrics;
  custom: CustomMetrics;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  timezone: string;
}

export interface OverviewMetrics {
  totalRequests: number;
  totalViolations: number;
  totalBans: number;
  uniqueIPs: number;
  uniqueEndpoints: number;
  averageResponseTime: number;
  errorRate: number;
  banEffectiveness: number;
  falsePositiveRate: number;
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  rate: number; // requests per second
  distribution: TimeDistribution;
  topIPs: Array<{ ip: string; count: number; percentage: number }>;
  topUserAgents: Array<{ userAgent: string; count: number; percentage: number }>;
  topCountries: Array<{ country: string; count: number; percentage: number }>;
  topISPs: Array<{ isp: string; count: number; percentage: number }>;
}

export interface ViolationMetrics {
  total: number;
  rate: number; // violations per second
  byType: Record<ViolationType, number>;
  bySeverity: Record<ViolationSeverity, number>;
  byEndpoint: Array<{ endpoint: string; count: number; percentage: number }>;
  byIP: Array<{ ip: string; count: number; percentage: number }>;
  byCountry: Array<{ country: string; count: number; percentage: number }>;
  distribution: TimeDistribution;
  escalationRate: number;
  resolutionTime: number; // average time to resolve
}

export interface BanMetrics {
  total: number;
  active: number;
  expired: number;
  permanent: number;
  byReason: Record<BanReason, number>;
  byCountry: Array<{ country: string; count: number; percentage: number }>;
  byDuration: Array<{ duration: string; count: number; percentage: number }>;
  distribution: TimeDistribution;
  averageDuration: number;
  escalationRate: number;
  appealRate: number;
  appealApprovalRate: number;
  effectiveness: number;
}

export interface GeographicMetrics {
  countries: Array<{
    country: string;
    code: string;
    requests: number;
    violations: number;
    bans: number;
    percentage: number;
    riskScore: number;
  }>;
  regions: Array<{
    region: string;
    country: string;
    requests: number;
    violations: number;
    bans: number;
    percentage: number;
  }>;
  cities: Array<{
    city: string;
    region: string;
    country: string;
    requests: number;
    violations: number;
    bans: number;
    percentage: number;
  }>;
  isps: Array<{
    isp: string;
    requests: number;
    violations: number;
    bans: number;
    percentage: number;
    riskScore: number;
  }>;
  riskMap: Array<{
    latitude: number;
    longitude: number;
    riskScore: number;
    requests: number;
    violations: number;
  }>;
}

export interface EndpointMetrics {
  total: number;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    requests: number;
    violations: number;
    bans: number;
    averageResponseTime: number;
    errorRate: number;
    percentage: number;
  }>;
  byMethod: Record<string, number>;
  byStatus: Record<number, number>;
  slowestEndpoints: Array<{
    endpoint: string;
    method: string;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  }>;
  mostViolated: Array<{
    endpoint: string;
    method: string;
    violations: number;
    violationRate: number;
    banRate: number;
  }>;
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    distribution: Array<{ range: string; count: number; percentage: number }>;
  };
  throughput: {
    requestsPerSecond: number;
    violationsPerSecond: number;
    bansPerSecond: number;
    peakThroughput: number;
    averageThroughput: number;
  };
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
    byEndpoint: Array<{ endpoint: string; count: number; percentage: number }>;
    distribution: TimeDistribution;
  };
}

export interface CustomMetrics {
  [key: string]: {
    value: number;
    unit: string;
    description: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  };
}

export interface TimeDistribution {
  hourly: Array<{ hour: number; value: number }>;
  daily: Array<{ day: string; value: number }>;
  weekly: Array<{ week: string; value: number }>;
  monthly: Array<{ month: string; value: number }>;
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions: string[];
  filters: AnalyticsFilters;
  dateRange: DateRange;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  aggregations: AggregationConfig[];
  sort: SortConfig[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsFilters {
  ips?: string[];
  endpoints?: string[];
  countries?: string[];
  isps?: string[];
  userAgents?: string[];
  violationTypes?: ViolationType[];
  banReasons?: BanReason[];
  severity?: ViolationSeverity[];
  custom?: Record<string, any>;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: 'overview' | 'detailed' | 'custom';
  query: AnalyticsQuery;
  data: AnalyticsData;
  generatedAt: Date;
  generatedBy: string;
  format: ExportFormat;
  size: number;
  metadata: Record<string, any>;
}

export interface AnalyticsAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  channels: NotificationChannel[];
  cooldown: number; // minutes
  lastTriggered?: Date;
  triggerCount: number;
  metadata: Record<string, any>;
}

export interface AlertCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'not_contains';
  value: number | string;
  timeWindow: string;
  aggregation?: AggregationConfig;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: AnalyticsFilters;
  refreshInterval: number; // seconds
  public: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  config: WidgetConfig;
  position: WidgetPosition;
  size: WidgetSize;
  refreshInterval: number;
  filters: AnalyticsFilters;
}

export type WidgetType = 
  | 'metric'
  | 'chart'
  | 'table'
  | 'map'
  | 'gauge'
  | 'progress'
  | 'alert'
  | 'custom';

export interface WidgetConfig {
  metric: string;
  visualization: VisualizationConfig;
  aggregation?: AggregationConfig;
  thresholds?: ThresholdConfig[];
  colors?: ColorConfig;
  format?: FormatConfig;
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'table';
  options: Record<string, any>;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label: string;
  operator: 'greater_than' | 'less_than' | 'equals';
}

export interface ColorConfig {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface FormatConfig {
  type: 'number' | 'percentage' | 'currency' | 'duration' | 'bytes' | 'custom';
  precision: number;
  unit: string;
  prefix: string;
  suffix: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
  responsive: boolean;
}

export interface AnalyticsAPIResponse<T = any> {
  success: boolean;
  data: T;
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  errors?: string[];
  warnings?: string[];
}

export interface AnalyticsHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    storage: HealthCheckResult;
    notifications: HealthCheckResult;
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
  };
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime: number;
  details?: Record<string, any>;
}

// Additional types for AnalyticsCollector
export interface MetricData {
  timestamp: Date;
  requests: number;
  violations: number;
  bans: number;
  unbans: number;
  responseTime: {
    min: number;
    max: number;
    avg: number;
    total: number;
    count: number;
  };
  statusCodes: Record<string, number>;
  endpoints: Record<string, number>;
  ips: Record<string, number>;
  countries: Record<string, number>;
  isps: Record<string, number>;
}

export interface ReportData {
  startTime: Date;
  endTime: Date;
  type: 'summary' | 'detailed' | 'trends';
  generatedAt: Date;
  summary: Record<string, any>;
  details?: any[] | undefined;
  trends?: Record<string, any> | undefined;
}

export type ViolationType = string;
export type ViolationSeverity = string;
export type BanReason = string;
export type NotificationChannel = string;
