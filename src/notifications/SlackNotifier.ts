import { EventEmitter } from 'events';
import { SlackConfig } from '../types/RateLimitTypes';
import { RateLimitNotificationError } from '../errors/RateLimitError';

export class SlackNotifier extends EventEmitter {
  private config: SlackConfig;
  private initialized: boolean = false;

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the Slack notifier
   */
  async initialize(): Promise<void> {
    try {
      if (!this.config.webhook) {
        throw new RateLimitNotificationError('Slack webhook URL is required', 'slack');
      }

      // Validate webhook URL
      if (!this.isValidWebhookUrl(this.config.webhook)) {
        throw new RateLimitNotificationError('Invalid Slack webhook URL', 'slack');
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a message to Slack
   * @param message - Message content
   * @param options - Message options
   */
  async sendMessage(message: string, options: {
    type: string;
    data: any;
    channel?: string;
    username?: string;
    iconEmoji?: string;
  } = { type: 'default', data: {} }): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitNotificationError('Slack notifier not initialized', 'slack');
    }

    try {
      const payload = this.buildSlackPayload(message, options);
      await this.sendToSlack(payload);
      this.emit('messageSent', { message, options });
    } catch (error) {
      this.emit('error', error);
      throw new RateLimitNotificationError(
        `Failed to send Slack message: ${error}`,
        'slack',
        true,
        error as Error
      );
    }
  }

  /**
   * Build Slack payload
   * @param message - Message content
   * @param options - Message options
   * @returns Slack payload
   */
  private buildSlackPayload(message: string, options: {
    type: string;
    data: any;
    channel?: string;
    username?: string;
    iconEmoji?: string;
  }): any {
    const payload: any = {
      text: message,
      channel: options.channel || this.config.channel,
      username: options.username || this.config.username || 'Rate Limiter',
      icon_emoji: options.iconEmoji || this.config.iconEmoji || ':warning:',
    };

    // Add attachments for rich formatting
    if (options.data && Object.keys(options.data).length > 0) {
      payload.attachments = [{
        color: this.getColorForType(options.type),
        fields: this.buildFields(options.data),
        footer: 'Rate Limiter Advanced',
        ts: Math.floor(Date.now() / 1000),
      }];
    }

    return payload;
  }

  /**
   * Get color for message type
   * @param type - Message type
   * @returns Color string
   */
  private getColorForType(type: string): string {
    const colors: Record<string, string> = {
      rateLimitAlert: 'warning',
      ipBanNotification: 'danger',
      dailyReport: 'good',
      weeklyReport: 'good',
      test: 'good',
      default: '#36a64f',
    };

    return colors[type] || colors['default'] || '#36a64f';
  }

  /**
   * Build fields for Slack attachment
   * @param data - Data to convert to fields
   * @returns Array of Slack fields
   */
  private buildFields(data: any): any[] {
    const fields: any[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        fields.push({
          title: this.formatFieldTitle(key),
          value: this.formatFieldValue(value),
          short: this.isShortField(key),
        });
      }
    }

    return fields;
  }

  /**
   * Format field title
   * @param key - Field key
   * @returns Formatted title
   */
  private formatFieldTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format field value
   * @param value - Field value
   * @returns Formatted value
   */
  private formatFieldValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Check if field should be short
   * @param key - Field key
   * @returns True if field should be short
   */
  private isShortField(key: string): boolean {
    const shortFields = ['ip', 'endpoint', 'count', 'duration', 'status'];
    return shortFields.includes(key.toLowerCase());
  }

  /**
   * Send payload to Slack
   * @param payload - Slack payload
   */
  private async sendToSlack(payload: any): Promise<void> {
    const response = await fetch(this.config.webhook!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} ${errorText}`);
    }
  }

  /**
   * Validate webhook URL
   * @param url - URL to validate
   * @returns True if valid
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'hooks.slack.com' && urlObj.pathname.startsWith('/services/');
    } catch {
      return false;
    }
  }

  /**
   * Send a test message
   */
  async sendTestMessage(): Promise<void> {
    await this.sendMessage('Test message from Rate Limiter Advanced', {
      type: 'test',
      data: {
        timestamp: new Date().toISOString(),
        version: '1.0.2',
      },
    });
  }

  /**
   * Send a rate limit alert
   * @param alertData - Alert data
   */
  async sendRateLimitAlert(alertData: {
    ip: string;
    endpoint: string;
    userAgent?: string;
    violationCount: number;
    rule: any;
  }): Promise<void> {
    const message = `🚫 *Rate Limit Alert*\nIP: ${alertData.ip}\nEndpoint: ${alertData.endpoint}\nViolations: ${alertData.violationCount}`;
    
    await this.sendMessage(message, {
      type: 'rateLimitAlert',
      data: {
        ip: alertData.ip,
        endpoint: alertData.endpoint,
        userAgent: alertData.userAgent,
        violationCount: alertData.violationCount,
        rule: alertData.rule,
      },
    });
  }

  /**
   * Send an IP ban notification
   * @param banData - Ban data
   */
  async sendIPBanNotification(banData: {
    ip: string;
    reason: string;
    duration?: string;
    violationCount: number;
    geolocation?: any;
  }): Promise<void> {
    const message = `🚫 *IP Banned*\nIP: ${banData.ip}\nReason: ${banData.reason}\nDuration: ${banData.duration || 'Permanent'}`;
    
    await this.sendMessage(message, {
      type: 'ipBanNotification',
      data: {
        ip: banData.ip,
        reason: banData.reason,
        duration: banData.duration,
        violationCount: banData.violationCount,
        geolocation: banData.geolocation,
      },
    });
  }

  /**
   * Send a daily report
   * @param reportData - Report data
   */
  async sendDailyReport(reportData: {
    date: string;
    totalRequests: number;
    totalViolations: number;
    totalBans: number;
    topViolatingIPs: any[];
    topEndpoints: any[];
    summary: any;
  }): Promise<void> {
    const message = `📊 *Daily Security Report - ${reportData.date}*\n\n*Summary:*\n• Total Requests: ${reportData.totalRequests}\n• Violations: ${reportData.totalViolations}\n• Bans Applied: ${reportData.totalBans}`;
    
    await this.sendMessage(message, {
      type: 'dailyReport',
      data: {
        date: reportData.date,
        totalRequests: reportData.totalRequests,
        totalViolations: reportData.totalViolations,
        totalBans: reportData.totalBans,
        topViolatingIPs: reportData.topViolatingIPs.slice(0, 5),
        topEndpoints: reportData.topEndpoints.slice(0, 5),
        summary: reportData.summary,
      },
    });
  }

  /**
   * Send a weekly report
   * @param reportData - Report data
   */
  async sendWeeklyReport(reportData: {
    week: string;
    totalRequests: number;
    totalViolations: number;
    totalBans: number;
    trends: any;
    insights: any;
    recommendations: any;
  }): Promise<void> {
    const message = `📈 *Weekly Security Report - ${reportData.week}*\n\n*Summary:*\n• Total Requests: ${reportData.totalRequests}\n• Violations: ${reportData.totalViolations}\n• Bans Applied: ${reportData.totalBans}`;
    
    await this.sendMessage(message, {
      type: 'weeklyReport',
      data: {
        week: reportData.week,
        totalRequests: reportData.totalRequests,
        totalViolations: reportData.totalViolations,
        totalBans: reportData.totalBans,
        trends: reportData.trends,
        insights: reportData.insights,
        recommendations: reportData.recommendations,
      },
    });
  }

  /**
   * Close the Slack notifier
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.emit('closed');
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): SlackConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  async updateConfig(newConfig: Partial<SlackConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if webhook changed
    if (newConfig.webhook && this.initialized) {
      await this.close();
      await this.initialize();
    }
    
    this.emit('configUpdated', { config: this.config });
  }

  /**
   * Check if the notifier is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get notifier status
   * @returns Status information
   */
  getStatus(): {
    initialized: boolean;
    webhookConfigured: boolean;
    channel: string | undefined;
    username: string | undefined;
  } {
    return {
      initialized: this.initialized,
      webhookConfigured: !!this.config.webhook,
      channel: this.config.channel,
      username: this.config.username,
    };
  }
}
