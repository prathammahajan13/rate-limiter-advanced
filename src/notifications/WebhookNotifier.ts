import { EventEmitter } from 'events';
import { WebhookConfig } from '../types/RateLimitTypes';
import { RateLimitNotificationError } from '../errors/RateLimitError';
import { CryptoUtils } from '../utils/CryptoUtils';

export class WebhookNotifier extends EventEmitter {
  private config: WebhookConfig;
  private initialized: boolean = false;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the webhook notifier
   */
  async initialize(): Promise<void> {
    try {
      if (!this.config.url) {
        throw new RateLimitNotificationError('Webhook URL is required', 'webhook');
      }

      // Validate webhook URL
      if (!this.isValidUrl(this.config.url)) {
        throw new RateLimitNotificationError('Invalid webhook URL', 'webhook');
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a webhook notification
   * @param message - Message content
   * @param options - Webhook options
   */
  async sendWebhook(message: string, options: {
    type: string;
    data: any;
    headers?: Record<string, string>;
    retryAttempts?: number;
    timeout?: number;
  } = { type: 'default', data: {} }): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitNotificationError('Webhook notifier not initialized', 'webhook');
    }

    try {
      const payload = this.buildWebhookPayload(message, options);
      await this.sendToWebhook(payload, options);
      this.emit('webhookSent', { message, options });
    } catch (error) {
      this.emit('error', error);
      throw new RateLimitNotificationError(
        `Failed to send webhook: ${error}`,
        'webhook',
        true,
        error as Error
      );
    }
  }

  /**
   * Build webhook payload
   * @param message - Message content
   * @param options - Webhook options
   * @returns Webhook payload
   */
  private buildWebhookPayload(message: string, options: {
    type: string;
    data: any;
  }): any {
    const payload: any = {
      timestamp: new Date().toISOString(),
      type: options.type,
      message,
      data: options.data,
      source: 'rate-limiter-advanced',
      version: '1.0.1',
    };

    // Add signature if secret is configured
    if (this.config.secret) {
      payload.signature = this.generateSignature(payload);
    }

    return payload;
  }

  /**
   * Generate signature for webhook payload
   * @param payload - Payload to sign
   * @returns Signature
   */
  private generateSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return CryptoUtils.hmac(payloadString, this.config.secret!, 'sha256');
  }

  /**
   * Send payload to webhook
   * @param payload - Webhook payload
   * @param options - Webhook options
   */
  private async sendToWebhook(payload: any, options: {
    headers?: Record<string, string>;
    retryAttempts?: number;
    timeout?: number;
  }): Promise<void> {
    const retryAttempts = options.retryAttempts || this.config.retryAttempts || 3;
    const timeout = options.timeout || this.config.timeout || 10000;
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Rate-Limiter-Advanced/1.0.1',
          ...this.config.headers,
          ...options.headers,
        };

        // Add signature header if secret is configured
        if (this.config.secret) {
          headers['X-Signature'] = `sha256=${payload.signature}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(this.config.url!, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Webhook API error: ${response.status} ${errorText}`);
        }

        // Success - no need to retry
        return;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retry attempts failed
    throw lastError || new Error('Webhook request failed after all retry attempts');
  }

  /**
   * Check if error is non-retryable
   * @param error - Error to check
   * @returns True if error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    // Don't retry on authentication errors, bad requests, etc.
    if (error.message.includes('401') || error.message.includes('403') || error.message.includes('400')) {
      return true;
    }

    // Don't retry on timeout errors
    if (error.name === 'AbortError') {
      return true;
    }

    return false;
  }

  /**
   * Validate URL
   * @param url - URL to validate
   * @returns True if valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a test webhook
   */
  async sendTestWebhook(): Promise<void> {
    await this.sendWebhook('Test webhook from Rate Limiter Advanced', {
      type: 'test',
      data: {
        timestamp: new Date().toISOString(),
        version: '1.0.1',
        test: true,
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
    const message = `Rate Limit Alert: IP ${alertData.ip} exceeded limit on ${alertData.endpoint}`;
    
    await this.sendWebhook(message, {
      type: 'rateLimitAlert',
      data: {
        ip: alertData.ip,
        endpoint: alertData.endpoint,
        userAgent: alertData.userAgent,
        violationCount: alertData.violationCount,
        rule: alertData.rule,
        severity: 'medium',
        category: 'rate_limit',
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
    const message = `IP Ban Notification: IP ${banData.ip} has been banned for ${banData.reason}`;
    
    await this.sendWebhook(message, {
      type: 'ipBanNotification',
      data: {
        ip: banData.ip,
        reason: banData.reason,
        duration: banData.duration,
        violationCount: banData.violationCount,
        geolocation: banData.geolocation,
        severity: 'high',
        category: 'ip_ban',
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
    const message = `Daily Security Report for ${reportData.date}`;
    
    await this.sendWebhook(message, {
      type: 'dailyReport',
      data: {
        date: reportData.date,
        totalRequests: reportData.totalRequests,
        totalViolations: reportData.totalViolations,
        totalBans: reportData.totalBans,
        topViolatingIPs: reportData.topViolatingIPs,
        topEndpoints: reportData.topEndpoints,
        summary: reportData.summary,
        severity: 'info',
        category: 'report',
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
    const message = `Weekly Security Report for ${reportData.week}`;
    
    await this.sendWebhook(message, {
      type: 'weeklyReport',
      data: {
        week: reportData.week,
        totalRequests: reportData.totalRequests,
        totalViolations: reportData.totalViolations,
        totalBans: reportData.totalBans,
        trends: reportData.trends,
        insights: reportData.insights,
        recommendations: reportData.recommendations,
        severity: 'info',
        category: 'report',
      },
    });
  }

  /**
   * Send a custom webhook
   * @param type - Webhook type
   * @param data - Custom data
   * @param message - Optional message
   */
  async sendCustomWebhook(type: string, data: any, message?: string): Promise<void> {
    const webhookMessage = message || `Custom webhook notification: ${type}`;
    
    await this.sendWebhook(webhookMessage, {
      type,
      data: {
        ...data,
        custom: true,
      },
    });
  }

  /**
   * Verify webhook signature
   * @param payload - Payhook payload
   * @param signature - Signature to verify
   * @returns True if signature is valid
   */
  verifySignature(payload: any, signature: string): boolean {
    if (!this.config.secret) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload);
    return CryptoUtils.timingSafeEqual(expectedSignature, signature);
  }

  /**
   * Test webhook connectivity
   * @returns Test result
   */
  async testConnectivity(): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.sendTestWebhook();
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Close the webhook notifier
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.emit('closed');
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  async updateConfig(newConfig: Partial<WebhookConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if URL changed
    if (newConfig.url && this.initialized) {
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
    urlConfigured: boolean;
    secretConfigured: boolean;
    retryAttempts: number;
    timeout: number;
  } {
    return {
      initialized: this.initialized,
      urlConfigured: !!this.config.url,
      secretConfigured: !!this.config.secret,
      retryAttempts: this.config.retryAttempts || 3,
      timeout: this.config.timeout || 10000,
    };
  }
}
