import { AnalyticsConfig, MetricData, ReportData } from '../types/AnalyticsTypes';
import { StorageInterface as IStorage } from '../storage/StorageInterface';
import { TimeUtils } from '../utils/TimeUtils';

export class AnalyticsCollector {
  private config: AnalyticsConfig;
  private storage: IStorage;
  private metrics: Map<string, MetricData>;
  private reportCache: Map<string, ReportData>;

  constructor(config: AnalyticsConfig, storage: IStorage) {
    this.config = config;
    this.storage = storage;
    this.metrics = new Map();
    this.reportCache = new Map();
  }

  /**
   * Record a request
   * @param ip - IP address
   * @param endpoint - Endpoint path
   * @param method - HTTP method
   * @param statusCode - Response status code
   * @param responseTime - Response time in milliseconds
   * @param metadata - Additional metadata
   */
  async recordRequest(
    ip: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const key = this.generateRequestKey(ip, endpoint, method, timestamp);

      // Store request data
      await this.storage.set(key, {
        ip,
        endpoint,
        method,
        statusCode,
        responseTime,
        timestamp,
        metadata,
      });

      // Update metrics
      await this.updateMetrics('request', {
        ip,
        endpoint,
        method,
        statusCode,
        responseTime,
        timestamp,
        metadata,
      });

      // Check if we need to generate a report
      if (this.shouldGenerateReport(timestamp)) {
        await this.generateReportFromTimestamp(timestamp);
      }
    } catch (error) {
      console.error('Error recording request:', error);
    }
  }

  /**
   * Record a rate limit violation
   * @param ip - IP address
   * @param endpoint - Endpoint path
   * @param method - HTTP method
   * @param limit - Rate limit that was exceeded
   * @param window - Time window
   * @param metadata - Additional metadata
   */
  async recordViolation(
    ip: string,
    endpoint: string,
    method: string,
    limit: number,
    window: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const key = this.generateViolationKey(ip, endpoint, method, timestamp);

      // Store violation data
      await this.storage.set(key, {
        ip,
        endpoint,
        method,
        limit,
        window,
        timestamp,
        metadata,
      });

      // Update metrics
      await this.updateMetrics('violation', {
        ip,
        endpoint,
        method,
        limit,
        window,
        timestamp,
        metadata,
      });

      // Check if we need to generate a report
      if (this.shouldGenerateReport(timestamp)) {
        await this.generateReportFromTimestamp(timestamp);
      }
    } catch (error) {
      console.error('Error recording violation:', error);
    }
  }

  /**
   * Record a ban event
   * @param ip - IP address
   * @param reason - Ban reason
   * @param duration - Ban duration
   * @param metadata - Additional metadata
   */
  async recordBan(
    ip: string,
    reason: string,
    duration: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const key = this.generateBanKey(ip, reason, timestamp);

      // Store ban data
      await this.storage.set(key, {
        ip,
        reason,
        duration,
        timestamp,
        metadata,
      });

      // Update metrics
      await this.updateMetrics('ban', {
        ip,
        reason,
        duration,
        timestamp,
        metadata,
      });

      // Check if we need to generate a report
      if (this.shouldGenerateReport(timestamp)) {
        await this.generateReportFromTimestamp(timestamp);
      }
    } catch (error) {
      console.error('Error recording ban:', error);
    }
  }

  /**
   * Record an unban event
   * @param ip - IP address
   * @param reason - Unban reason
   * @param metadata - Additional metadata
   */
  async recordUnban(
    ip: string,
    reason: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const key = this.generateUnbanKey(ip, reason, timestamp);

      // Store unban data
      await this.storage.set(key, {
        ip,
        reason,
        timestamp,
        metadata,
      });

      // Update metrics
      await this.updateMetrics('unban', {
        ip,
        reason,
        timestamp,
        metadata,
      });

      // Check if we need to generate a report
      if (this.shouldGenerateReport(timestamp)) {
        await this.generateReportFromTimestamp(timestamp);
      }
    } catch (error) {
      console.error('Error recording unban:', error);
    }
  }

  /**
   * Get metrics for a specific time period
   * @param startTime - Start time
   * @param endTime - End time
   * @param granularity - Time granularity (hour, day, week, month)
   * @returns Metrics data
   */
  async getMetrics(
    startTime: Date,
    endTime: Date,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'hour'
  ): Promise<MetricData[]> {
    try {
      const metrics: MetricData[] = [];
      const currentTime = new Date(startTime);

      while (currentTime <= endTime) {
        const timeKey = this.generateTimeKey(currentTime, granularity);
        const metric = await this.getMetric(timeKey);
        
        if (metric) {
          metrics.push(metric);
        }

        // Move to next time period
        this.incrementTime(currentTime, granularity);
      }

      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  /**
   * Get a specific metric
   * @param timeKey - Time key
   * @returns Metric data or null
   */
  async getMetric(timeKey: string): Promise<MetricData | null> {
    try {
      // Check cache first
      const cachedMetric = this.metrics.get(timeKey);
      if (cachedMetric) {
        return cachedMetric;
      }

      // Get from storage
      const metric = await this.storage.get(timeKey);
      if (metric) {
        this.metrics.set(timeKey, metric);
        return metric;
      }

      return null;
    } catch (error) {
      console.error('Error getting metric:', error);
      return null;
    }
  }

  async getAnalytics(query: any): Promise<Record<string, any>> {
    // Delegate to getMetrics for now
    const startTime = query?.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = query?.endTime || new Date();
    const granularity = query?.granularity || 'hour';
    const metrics = await this.getMetrics(startTime, endTime, granularity);
    
    // Convert to the expected format
    return {
      metrics,
      summary: await this.getSummary(),
      timeRange: { startTime, endTime },
      granularity
    };
  }

  /**
   * Generate a report for a specific time period
   * @param startTime - Start time
   * @param endTime - End time
   * @param type - Report type
   * @returns Report data
   */
  async generateReport(
    startTime: Date,
    endTime: Date,
    type: 'summary' | 'detailed' | 'trends' = 'summary'
  ): Promise<ReportData> {
    try {
      const reportKey = this.generateReportKey(startTime, endTime, type);
      
      // Check cache first
      const cachedReport = this.reportCache.get(reportKey);
      if (cachedReport) {
        return cachedReport;
      }

      // Generate report
      const report = await this.createReport(startTime, endTime, type);
      
      // Cache report
      this.reportCache.set(reportKey, report);
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary
   * @returns Analytics summary
   */
  async getSummary(): Promise<Record<string, any>> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [hourlyMetrics, dailyMetrics, weeklyMetrics] = await Promise.all([
        this.getMetrics(oneHourAgo, now, 'hour'),
        this.getMetrics(oneDayAgo, now, 'day'),
        this.getMetrics(oneWeekAgo, now, 'week'),
      ]);

      return {
        lastHour: this.aggregateMetrics(hourlyMetrics),
        lastDay: this.aggregateMetrics(dailyMetrics),
        lastWeek: this.aggregateMetrics(weeklyMetrics),
        totalRequests: this.getTotalRequests(),
        totalViolations: this.getTotalViolations(),
        totalBans: this.getTotalBans(),
        totalUnbans: this.getTotalUnbans(),
      };
    } catch (error) {
      console.error('Error getting summary:', error);
      return {};
    }
  }

  /**
   * Clear old data
   * @param olderThan - Clear data older than this date
   * @returns Number of records cleared
   */
  async clearOldData(olderThan: Date): Promise<number> {
    try {
      let clearedCount = 0;
      const keys = await this.storage.getAllKeys();

      for (const key of keys) {
        if (this.isDataKey(key)) {
          const data = await this.storage.get(key);
          if (data && data.timestamp && new Date(data.timestamp) < olderThan) {
            await this.storage.delete(key);
            clearedCount++;
          }
        }
      }

      return clearedCount;
    } catch (error) {
      console.error('Error clearing old data:', error);
      return 0;
    }
  }

  /**
   * Export analytics data
   * @param startTime - Start time
   * @param endTime - End time
   * @param format - Export format
   * @returns Exported data
   */
  async exportData(
    startTime: Date,
    endTime: Date,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    try {
      const data = await this.getMetrics(startTime, endTime, 'hour');
      
      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          return this.convertToCSV(data);
        case 'xml':
          return this.convertToXML(data);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Update metrics
   * @param type - Metric type
   * @param data - Metric data
   */
  private async updateMetrics(type: string, data: any): Promise<void> {
    try {
      const timestamp = data.timestamp || new Date();
      const timeKey = this.generateTimeKey(timestamp, 'hour');
      
      // Get existing metric or create new one
      let metric = await this.getMetric(timeKey);
      if (!metric) {
        metric = {
          timestamp,
          requests: 0,
          violations: 0,
          bans: 0,
          unbans: 0,
          responseTime: {
            min: 0,
            max: 0,
            avg: 0,
            total: 0,
            count: 0,
          },
          statusCodes: {},
          endpoints: {},
          ips: {},
          countries: {},
          isps: {},
        };
      }

      // Update metric based on type
      switch (type) {
        case 'request':
          metric.requests++;
          if (data.responseTime) {
            this.updateResponseTime(metric.responseTime, data.responseTime);
          }
          if (data.statusCode) {
            metric.statusCodes[data.statusCode] = (metric.statusCodes[data.statusCode] || 0) + 1;
          }
          if (data.endpoint) {
            metric.endpoints[data.endpoint] = (metric.endpoints[data.endpoint] || 0) + 1;
          }
          if (data.ip) {
            metric.ips[data.ip] = (metric.ips[data.ip] || 0) + 1;
          }
          if (data.metadata?.country) {
            metric.countries[data.metadata.country] = (metric.countries[data.metadata.country] || 0) + 1;
          }
          if (data.metadata?.isp) {
            metric.isps[data.metadata.isp] = (metric.isps[data.metadata.isp] || 0) + 1;
          }
          break;
        case 'violation':
          metric.violations++;
          break;
        case 'ban':
          metric.bans++;
          break;
        case 'unban':
          metric.unbans++;
          break;
      }

      // Store updated metric
      await this.storage.set(timeKey, metric);
      this.metrics.set(timeKey, metric);
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  /**
   * Update response time statistics
   * @param responseTime - Response time object
   * @param newTime - New response time
   */
  private updateResponseTime(responseTime: any, newTime: number): void {
    if (responseTime.count === 0) {
      responseTime.min = newTime;
      responseTime.max = newTime;
    } else {
      responseTime.min = Math.min(responseTime.min, newTime);
      responseTime.max = Math.max(responseTime.max, newTime);
    }
    
    responseTime.total += newTime;
    responseTime.count++;
    responseTime.avg = responseTime.total / responseTime.count;
  }

  /**
   * Check if we should generate a report
   * @param timestamp - Current timestamp
   * @returns True if report should be generated
   */
  private shouldGenerateReport(timestamp: Date): boolean {
    if (!this.config.autoGenerateReports) {
      return false;
    }

    const now = new Date();
    const timeDiff = now.getTime() - timestamp.getTime();
    const reportInterval = TimeUtils.parseDurationToSeconds(this.config.reportInterval || '1h') * 1000;

    return timeDiff >= reportInterval;
  }

  /**
   * Generate a report
   * @param timestamp - Report timestamp
   */
  private async generateReportFromTimestamp(timestamp: Date): Promise<void> {
    try {
      const endTime = timestamp;
      const startTime = new Date(endTime.getTime() - TimeUtils.parseDurationToSeconds(this.config.reportInterval || '1h') * 1000);
      
      await this.generateReport(startTime, endTime, 'summary');
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }

  /**
   * Create a report
   * @param startTime - Start time
   * @param endTime - End time
   * @param type - Report type
   * @returns Report data
   */
  private async createReport(
    startTime: Date,
    endTime: Date,
    type: 'summary' | 'detailed' | 'trends'
  ): Promise<ReportData> {
    const metrics = await this.getMetrics(startTime, endTime, 'hour');
    
    return {
      startTime,
      endTime,
      type,
      generatedAt: new Date(),
      summary: this.aggregateMetrics(metrics),
      details: type === 'detailed' ? metrics : undefined,
      trends: type === 'trends' ? this.calculateTrends(metrics) : undefined,
    };
  }

  /**
   * Aggregate metrics
   * @param metrics - Array of metrics
   * @returns Aggregated metrics
   */
  private aggregateMetrics(metrics: MetricData[]): Record<string, any> {
    const aggregated = {
      totalRequests: 0,
      totalViolations: 0,
      totalBans: 0,
      totalUnbans: 0,
      responseTime: {
        min: 0,
        max: 0,
        avg: 0,
        total: 0,
        count: 0,
      },
      statusCodes: {} as Record<string, number>,
      endpoints: {} as Record<string, number>,
      ips: {} as Record<string, number>,
      countries: {} as Record<string, number>,
      isps: {} as Record<string, number>,
    };

    for (const metric of metrics) {
      aggregated.totalRequests += metric.requests;
      aggregated.totalViolations += metric.violations;
      aggregated.totalBans += metric.bans;
      aggregated.totalUnbans += metric.unbans;

      // Aggregate response time
      if (metric.responseTime.count > 0) {
        if (aggregated.responseTime.count === 0) {
          aggregated.responseTime.min = metric.responseTime.min;
          aggregated.responseTime.max = metric.responseTime.max;
        } else {
          aggregated.responseTime.min = Math.min(aggregated.responseTime.min, metric.responseTime.min);
          aggregated.responseTime.max = Math.max(aggregated.responseTime.max, metric.responseTime.max);
        }
        
        aggregated.responseTime.total += metric.responseTime.total;
        aggregated.responseTime.count += metric.responseTime.count;
        aggregated.responseTime.avg = aggregated.responseTime.total / aggregated.responseTime.count;
      }

      // Aggregate status codes
      for (const [code, count] of Object.entries(metric.statusCodes)) {
        aggregated.statusCodes[code] = (aggregated.statusCodes[code] || 0) + (count as number);
      }

      // Aggregate endpoints
      for (const [endpoint, count] of Object.entries(metric.endpoints)) {
        aggregated.endpoints[endpoint] = (aggregated.endpoints[endpoint] || 0) + (count as number);
      }

      // Aggregate IPs
      for (const [ip, count] of Object.entries(metric.ips)) {
        aggregated.ips[ip] = (aggregated.ips[ip] || 0) + (count as number);
      }

      // Aggregate countries
      for (const [country, count] of Object.entries(metric.countries)) {
        aggregated.countries[country] = (aggregated.countries[country] || 0) + (count as number);
      }

      // Aggregate ISPs
      for (const [isp, count] of Object.entries(metric.isps)) {
        aggregated.isps[isp] = (aggregated.isps[isp] || 0) + (count as number);
      }
    }

    return aggregated;
  }

  /**
   * Calculate trends
   * @param metrics - Array of metrics
   * @returns Trend data
   */
  private calculateTrends(metrics: MetricData[]): Record<string, any> {
    if (metrics.length < 2) {
      return {};
    }

    const first = metrics[0];
    const last = metrics[metrics.length - 1];

    if (!first || !last) {
      return {};
    }

    return {
      requests: {
        change: last.requests - first.requests,
        changePercent: first.requests > 0 ? ((last.requests - first.requests) / first.requests) * 100 : 0,
      },
      violations: {
        change: last.violations - first.violations,
        changePercent: first.violations > 0 ? ((last.violations - first.violations) / first.violations) * 100 : 0,
      },
      bans: {
        change: last.bans - first.bans,
        changePercent: first.bans > 0 ? ((last.bans - first.bans) / first.bans) * 100 : 0,
      },
      responseTime: {
        change: last.responseTime.avg - first.responseTime.avg,
        changePercent: first.responseTime.avg > 0 ? ((last.responseTime.avg - first.responseTime.avg) / first.responseTime.avg) * 100 : 0,
      },
    };
  }

  /**
   * Generate request key
   * @param ip - IP address
   * @param endpoint - Endpoint path
   * @param method - HTTP method
   * @param timestamp - Timestamp
   * @returns Request key
   */
  private generateRequestKey(ip: string, endpoint: string, method: string, timestamp: Date): string {
    const timeKey = this.generateTimeKey(timestamp, 'hour');
    return `request:${timeKey}:${ip}:${method}:${endpoint}`;
  }

  /**
   * Generate violation key
   * @param ip - IP address
   * @param endpoint - Endpoint path
   * @param method - HTTP method
   * @param timestamp - Timestamp
   * @returns Violation key
   */
  private generateViolationKey(ip: string, endpoint: string, method: string, timestamp: Date): string {
    const timeKey = this.generateTimeKey(timestamp, 'hour');
    return `violation:${timeKey}:${ip}:${method}:${endpoint}`;
  }

  /**
   * Generate ban key
   * @param ip - IP address
   * @param reason - Ban reason
   * @param timestamp - Timestamp
   * @returns Ban key
   */
  private generateBanKey(ip: string, reason: string, timestamp: Date): string {
    const timeKey = this.generateTimeKey(timestamp, 'hour');
    return `ban:${timeKey}:${ip}:${reason}`;
  }

  /**
   * Generate unban key
   * @param ip - IP address
   * @param reason - Unban reason
   * @param timestamp - Timestamp
   * @returns Unban key
   */
  private generateUnbanKey(ip: string, reason: string, timestamp: Date): string {
    const timeKey = this.generateTimeKey(timestamp, 'hour');
    return `unban:${timeKey}:${ip}:${reason}`;
  }

  /**
   * Generate time key
   * @param timestamp - Timestamp
   * @param granularity - Time granularity
   * @returns Time key
   */
  private generateTimeKey(timestamp: Date, granularity: 'hour' | 'day' | 'week' | 'month'): string {
    const year = timestamp.getFullYear();
    const month = timestamp.getMonth() + 1;
    const day = timestamp.getDate();
    const hour = timestamp.getHours();

    switch (granularity) {
      case 'hour':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}`;
      case 'day':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'week':
        const week = Math.ceil(day / 7);
        return `${year}-${month.toString().padStart(2, '0')}-W${week}`;
      case 'month':
        return `${year}-${month.toString().padStart(2, '0')}`;
      default:
        throw new Error(`Unsupported granularity: ${granularity}`);
    }
  }

  /**
   * Generate report key
   * @param startTime - Start time
   * @param endTime - End time
   * @param type - Report type
   * @returns Report key
   */
  private generateReportKey(startTime: Date, endTime: Date, type: string): string {
    const startKey = this.generateTimeKey(startTime, 'hour');
    const endKey = this.generateTimeKey(endTime, 'hour');
    return `report:${type}:${startKey}:${endKey}`;
  }

  /**
   * Increment time
   * @param time - Time to increment
   * @param granularity - Time granularity
   */
  private incrementTime(time: Date, granularity: 'hour' | 'day' | 'week' | 'month'): void {
    switch (granularity) {
      case 'hour':
        time.setHours(time.getHours() + 1);
        break;
      case 'day':
        time.setDate(time.getDate() + 1);
        break;
      case 'week':
        time.setDate(time.getDate() + 7);
        break;
      case 'month':
        time.setMonth(time.getMonth() + 1);
        break;
    }
  }

  /**
   * Check if key is a data key
   * @param key - Key to check
   * @returns True if data key
   */
  private isDataKey(key: string): boolean {
    return key.startsWith('request:') || 
           key.startsWith('violation:') || 
           key.startsWith('ban:') || 
           key.startsWith('unban:');
  }

  /**
   * Convert data to CSV
   * @param data - Data to convert
   * @returns CSV string
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to XML
   * @param data - Data to convert
   * @returns XML string
   */
  private convertToXML(data: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<analytics>\n';

    for (const item of data) {
      xml += '  <item>\n';
      for (const [key, value] of Object.entries(item)) {
        xml += `    <${key}>${value}</${key}>\n`;
      }
      xml += '  </item>\n';
    }

    xml += '</analytics>';
    return xml;
  }

  /**
   * Get total requests
   * @returns Total requests
   */
  private getTotalRequests(): number {
    let total = 0;
    for (const metric of this.metrics.values()) {
      total += metric.requests;
    }
    return total;
  }

  /**
   * Get total violations
   * @returns Total violations
   */
  private getTotalViolations(): number {
    let total = 0;
    for (const metric of this.metrics.values()) {
      total += metric.violations;
    }
    return total;
  }

  /**
   * Get total bans
   * @returns Total bans
   */
  private getTotalBans(): number {
    let total = 0;
    for (const metric of this.metrics.values()) {
      total += metric.bans;
    }
    return total;
  }

  /**
   * Get total unbans
   * @returns Total unbans
   */
  private getTotalUnbans(): number {
    let total = 0;
    for (const metric of this.metrics.values()) {
      total += metric.unbans;
    }
    return total;
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the storage instance
   * @returns Storage instance
   */
  getStorage(): IStorage {
    return this.storage;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reportCache.clear();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.clearMetrics();
    this.clearReports();
  }
}
