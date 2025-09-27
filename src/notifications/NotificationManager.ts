import { EventEmitter } from 'events';
import { NotificationConfig, NotificationChannel } from '../types/RateLimitTypes';
import { SlackNotifier } from './SlackNotifier';
import { EmailNotifier } from './EmailNotifier';
import { WebhookNotifier } from './WebhookNotifier';
import { RateLimitNotificationError } from '../errors/RateLimitError';

export class NotificationManager extends EventEmitter {
  private config: NotificationConfig;
  private notifiers: Map<NotificationChannel, any> = new Map();
  private initialized: boolean = false;

  constructor(config: NotificationConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the notification manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize notifiers based on configuration
      if (this.config.slack) {
        const slackNotifier = new SlackNotifier(this.config.slack);
        await slackNotifier.initialize();
        this.notifiers.set('slack', slackNotifier);
      }

      if (this.config.email) {
        const emailNotifier = new EmailNotifier(this.config.email);
        await emailNotifier.initialize();
        this.notifiers.set('email', emailNotifier);
      }

      if (this.config.webhook) {
        const webhookNotifier = new WebhookNotifier(this.config.webhook);
        await webhookNotifier.initialize();
        this.notifiers.set('webhook', webhookNotifier);
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
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
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    try {
      const message = this.formatRateLimitAlert(alertData);
      await this.sendToChannels('rateLimitAlert', message, alertData);
      this.emit('rateLimitAlertSent', alertData);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
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
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    try {
      const message = this.formatIPBanNotification(banData);
      await this.sendToChannels('ipBanNotification', message, banData);
      this.emit('ipBanNotificationSent', banData);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
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
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    try {
      const message = this.formatDailyReport(reportData);
      await this.sendToChannels('dailyReport', message, reportData);
      this.emit('dailyReportSent', reportData);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
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
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    try {
      const message = this.formatWeeklyReport(reportData);
      await this.sendToChannels('weeklyReport', message, reportData);
      this.emit('weeklyReportSent', reportData);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a custom notification
   * @param type - Notification type
   * @param message - Message content
   * @param data - Additional data
   */
  async sendCustomNotification(type: string, message: string, data?: any): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    try {
      await this.sendToChannels(type, message, data);
      this.emit('customNotificationSent', { type, message, data });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send message to all configured channels
   * @param type - Message type
   * @param message - Message content
   * @param data - Additional data
   */
  private async sendToChannels(type: string, message: string, data: any): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of this.config.channels || []) {
      const notifier = this.notifiers.get(channel);
      if (notifier) {
        promises.push(this.sendToChannel(notifier, channel, type, message, data));
      }
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(promises);
    
    // Check for failures
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      const errors = failures.map(failure => (failure as PromiseRejectedResult).reason);
      throw new RateLimitNotificationError(
        `Failed to send notifications to ${failures.length} channels: ${errors.map(e => e.message).join(', ')}`,
        'multiple',
        true
      );
    }
  }

  /**
   * Send message to a specific channel
   * @param notifier - Notifier instance
   * @param channel - Channel name
   * @param type - Message type
   * @param message - Message content
   * @param data - Additional data
   */
  private async sendToChannel(
    notifier: any,
    channel: NotificationChannel,
    type: string,
    message: string,
    data: any
  ): Promise<void> {
    try {
      switch (channel) {
        case 'slack':
          await notifier.sendMessage(message, { type, data });
          break;
        case 'email':
          await notifier.sendEmail(message, { type, data });
          break;
        case 'webhook':
          await notifier.sendWebhook(message, { type, data });
          break;
        default:
          throw new RateLimitNotificationError(`Unsupported notification channel: ${channel}`, channel);
      }
    } catch (error) {
      throw new RateLimitNotificationError(
        `Failed to send notification via ${channel}: ${error}`,
        channel,
        true,
        error as Error
      );
    }
  }

  /**
   * Format rate limit alert message
   * @param alertData - Alert data
   * @returns Formatted message
   */
  private formatRateLimitAlert(alertData: {
    ip: string;
    endpoint: string;
    userAgent?: string;
    violationCount: number;
    rule: any;
  }): string {
    const template = (this.config as any).templates?.rateLimitAlert || 
      '🚫 *Rate Limit Hit*\n*IP:* {ip}\n*Endpoint:* {endpoint}\n*User-Agent:* {userAgent}\n*Violations:* {count}';

    return template
      .replace('{ip}', alertData.ip)
      .replace('{endpoint}', alertData.endpoint)
      .replace('{userAgent}', alertData.userAgent || 'Unknown')
      .replace('{count}', alertData.violationCount.toString());
  }

  /**
   * Format IP ban notification message
   * @param banData - Ban data
   * @returns Formatted message
   */
  private formatIPBanNotification(banData: {
    ip: string;
    reason: string;
    duration?: string;
    violationCount: number;
    geolocation?: any;
  }): string {
    const template = (this.config as any).templates?.ipBanNotification || 
      '🚫 *IP Banned*\n*IP:* {ip}\n*Reason:* {reason}\n*Duration:* {duration}\n*Previous Violations:* {violations}';

    return template
      .replace('{ip}', banData.ip)
      .replace('{reason}', banData.reason)
      .replace('{duration}', banData.duration || 'Permanent')
      .replace('{violations}', banData.violationCount.toString());
  }

  /**
   * Format daily report message
   * @param reportData - Report data
   * @returns Formatted message
   */
  private formatDailyReport(reportData: {
    date: string;
    totalRequests: number;
    totalViolations: number;
    totalBans: number;
    topViolatingIPs: any[];
    topEndpoints: any[];
    summary: any;
  }): string {
    const template = (this.config as any).templates?.dailyReport || 
      '📊 *Daily Security Report - {date}*\n\n*Summary:*\n• Total Requests: {totalRequests}\n• Violations: {totalViolations}\n• Bans Applied: {totalBans}\n\n*Top Violating IPs:*\n{topIPs}\n\n*Top Endpoints:*\n{topEndpoints}';

    const topIPs = reportData.topViolatingIPs
      .slice(0, 5)
      .map(ip => `• ${ip.ip}: ${ip.violations} violations`)
      .join('\n');

    const topEndpoints = reportData.topEndpoints
      .slice(0, 5)
      .map(endpoint => `• ${endpoint.endpoint}: ${endpoint.requests} requests`)
      .join('\n');

    return template
      .replace('{date}', reportData.date)
      .replace('{totalRequests}', reportData.totalRequests.toString())
      .replace('{totalViolations}', reportData.totalViolations.toString())
      .replace('{totalBans}', reportData.totalBans.toString())
      .replace('{topIPs}', topIPs)
      .replace('{topEndpoints}', topEndpoints);
  }

  /**
   * Format weekly report message
   * @param reportData - Report data
   * @returns Formatted message
   */
  private formatWeeklyReport(reportData: {
    week: string;
    totalRequests: number;
    totalViolations: number;
    totalBans: number;
    trends: any;
    insights: any;
    recommendations: any;
  }): string {
    const template = (this.config as any).templates?.weeklyReport || 
      '📈 *Weekly Security Report - {week}*\n\n*Summary:*\n• Total Requests: {totalRequests}\n• Violations: {totalViolations}\n• Bans Applied: {totalBans}\n\n*Trends:*\n{trends}\n\n*Insights:*\n{insights}\n\n*Recommendations:*\n{recommendations}';

    return template
      .replace('{week}', reportData.week)
      .replace('{totalRequests}', reportData.totalRequests.toString())
      .replace('{totalViolations}', reportData.totalViolations.toString())
      .replace('{totalBans}', reportData.totalBans.toString())
      .replace('{trends}', reportData.trends || 'No significant trends')
      .replace('{insights}', reportData.insights || 'No insights available')
      .replace('{recommendations}', reportData.recommendations || 'No recommendations');
  }

  /**
   * Test notification channels
   * @returns Test results
   */
  async testChannels(): Promise<{
    channel: NotificationChannel;
    status: 'success' | 'failed';
    error?: string;
  }[]> {
    if (!this.initialized) {
      throw new RateLimitNotificationError('Notification manager not initialized', 'unknown');
    }

    const results: {
      channel: NotificationChannel;
      status: 'success' | 'failed';
      error?: string;
    }[] = [];

    for (const [channel, notifier] of this.notifiers.entries()) {
      try {
        await this.sendToChannel(notifier, channel, 'test', 'Test notification', {});
        results.push({ channel, status: 'success' });
      } catch (error) {
        results.push({ 
          channel, 
          status: 'failed', 
          error: (error as Error).message 
        });
      }
    }

    return results;
  }

  /**
   * Get notification statistics
   * @returns Notification statistics
   */
  getStatistics(): {
    totalChannels: number;
    activeChannels: number;
    failedChannels: number;
    channelStatus: Record<NotificationChannel, 'active' | 'inactive' | 'error'>;
  } {
    const totalChannels = this.config.channels?.length || 0;
    const activeChannels = this.notifiers.size;
    const failedChannels = totalChannels - activeChannels;

    const channelStatus: Record<NotificationChannel, 'active' | 'inactive' | 'error'> = {
      slack: this.notifiers.has('slack') ? 'active' : 'inactive',
      email: this.notifiers.has('email') ? 'active' : 'inactive',
      webhook: this.notifiers.has('webhook') ? 'active' : 'inactive',
    };

    return {
      totalChannels,
      activeChannels,
      failedChannels,
      channelStatus,
    };
  }

  /**
   * Close the notification manager
   */
  async close(): Promise<void> {
    try {
      for (const [_channel, notifier] of this.notifiers.entries()) {
        try {
          if (typeof notifier.close === 'function') {
            await notifier.close();
          }
        } catch (error) {
          this.emit('error', error);
        }
      }

      this.notifiers.clear();
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
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  async updateConfig(newConfig: Partial<NotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if configuration changed
    if (this.initialized) {
      await this.close();
      await this.initialize();
    }
    
    this.emit('configUpdated', { config: this.config });
  }

  /**
   * Get available notification channels
   * @returns Array of available channels
   */
  getAvailableChannels(): NotificationChannel[] {
    return ['slack', 'email', 'webhook'];
  }

  /**
   * Check if a channel is configured
   * @param channel - Channel to check
   * @returns True if channel is configured
   */
  isChannelConfigured(channel: NotificationChannel): boolean {
    return this.notifiers.has(channel);
  }

  /**
   * Get notifier for a specific channel
   * @param channel - Channel name
   * @returns Notifier instance or null
   */
  getNotifier(channel: NotificationChannel): any {
    return this.notifiers.get(channel) || null;
  }
}
