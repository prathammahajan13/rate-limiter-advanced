import { EventEmitter } from 'events';
import { EmailConfig, SMTPConfig } from '../types/RateLimitTypes';
import { RateLimitNotificationError } from '../errors/RateLimitError';

export class EmailNotifier extends EventEmitter {
  private config: EmailConfig;
  private initialized: boolean = false;

  constructor(config: EmailConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the email notifier
   */
  async initialize(): Promise<void> {
    try {
      if (!this.config.smtp) {
        throw new RateLimitNotificationError('SMTP configuration is required', 'email');
      }

      // Validate SMTP configuration
      this.validateSMTPConfig(this.config.smtp);

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Validate SMTP configuration
   * @param smtpConfig - SMTP configuration
   */
  private validateSMTPConfig(smtpConfig: SMTPConfig): void {
    if (!smtpConfig.host) {
      throw new RateLimitNotificationError('SMTP host is required', 'email');
    }

    if (!smtpConfig.port) {
      throw new RateLimitNotificationError('SMTP port is required', 'email');
    }

    if (!smtpConfig.auth || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      throw new RateLimitNotificationError('SMTP authentication is required', 'email');
    }
  }

  /**
   * Send an email
   * @param message - Message content
   * @param options - Email options
   */
  async sendEmail(message: string, options: {
    type: string;
    data: any;
    subject?: string;
    to?: string[];
    from?: string;
    html?: boolean;
  } = { type: 'default', data: {} }): Promise<void> {
    if (!this.initialized) {
      throw new RateLimitNotificationError('Email notifier not initialized', 'email');
    }

    try {
      const emailData = this.buildEmailData(message, options);
      await this.sendViaSMTP(emailData);
      this.emit('emailSent', { message, options });
    } catch (error) {
      this.emit('error', error);
      throw new RateLimitNotificationError(
        `Failed to send email: ${error}`,
        'email',
        true,
        error as Error
      );
    }
  }

  /**
   * Build email data
   * @param message - Message content
   * @param options - Email options
   * @returns Email data
   */
  private buildEmailData(message: string, options: {
    type: string;
    data: any;
    subject?: string;
    to?: string[];
    from?: string;
    html?: boolean;
  }): any {
    const subject = options.subject || this.getDefaultSubject(options.type);
    const to = options.to || this.config.to || [];
    const from = options.from || this.config.from || this.config.smtp?.auth?.user || 'noreply@example.com';
    const html = options.html !== false; // Default to true

    let emailBody = message;
    if (html) {
      emailBody = this.convertToHTML(message, options.data);
    }

    return {
      from,
      to,
      subject,
      text: html ? this.stripHTML(emailBody) : emailBody,
      html: html ? emailBody : undefined,
      attachments: this.buildAttachments(options.data),
    };
  }

  /**
   * Get default subject for message type
   * @param type - Message type
   * @returns Default subject
   */
  private getDefaultSubject(type: string): string {
    const subjects: Record<string, string> = {
      rateLimitAlert: 'Rate Limit Alert',
      ipBanNotification: 'IP Ban Notification',
      dailyReport: 'Daily Security Report',
      weeklyReport: 'Weekly Security Report',
      test: 'Test Email from Rate Limiter',
      default: 'Rate Limiter Notification',
    };

    return subjects[type] || subjects['default'] || 'Rate Limiter Notification';
  }

  /**
   * Convert message to HTML
   * @param message - Plain text message
   * @param data - Additional data
   * @returns HTML message
   */
  private convertToHTML(message: string, data: any): string {
    let html = message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;');

    // Add data as HTML table if present
    if (data && Object.keys(data).length > 0) {
      html += '<br><br><table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">';
      html += '<tr><th>Field</th><th>Value</th></tr>';
      
      for (const [key, value] of Object.entries(data)) {
        html += `<tr><td>${this.formatFieldTitle(key)}</td><td>${this.formatFieldValue(value)}</td></tr>`;
      }
      
      html += '</table>';
    }

    // Wrap in HTML structure
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rate Limiter Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Rate Limiter Advanced Notification</h2>
        </div>
        <div class="content">
          ${html}
        </div>
        <div class="footer">
          <p>This is an automated message from Rate Limiter Advanced v1.0.0</p>
          <p>Generated at: ${new Date().toISOString()}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Strip HTML tags from text
   * @param html - HTML content
   * @returns Plain text
   */
  private stripHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&bull;/g, '•')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /**
   * Build email attachments
   * @param data - Data to convert to attachments
   * @returns Array of attachments
   */
  private buildAttachments(data: any): any[] {
    const attachments: any[] = [];

    // Add JSON attachment if data is complex
    if (data && Object.keys(data).length > 0) {
      attachments.push({
        filename: 'notification-data.json',
        content: JSON.stringify(data, null, 2),
        contentType: 'application/json',
      });
    }

    return attachments;
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
   * Send email via SMTP
   * @param emailData - Email data
   */
  private async sendViaSMTP(emailData: any): Promise<void> {
    // This is a simplified implementation
    // In a real implementation, you would use a library like nodemailer
    
    const smtpConfig = this.config.smtp!;
    
    // Simulate SMTP sending
    // In practice, you would use nodemailer or similar library
    console.log('Sending email via SMTP:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // For now, we'll just simulate success
    // In a real implementation, you would:
    // 1. Create a transporter with nodemailer
    // 2. Send the email
    // 3. Handle errors appropriately
    
    // Example with nodemailer:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
    });
    
    await transporter.sendMail(emailData);
    */
  }

  /**
   * Send a test email
   */
  async sendTestEmail(): Promise<void> {
    await this.sendEmail('This is a test email from Rate Limiter Advanced', {
      type: 'test',
      data: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
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
    const message = `Rate Limit Alert\n\nIP: ${alertData.ip}\nEndpoint: ${alertData.endpoint}\nViolations: ${alertData.violationCount}`;
    
    await this.sendEmail(message, {
      type: 'rateLimitAlert',
      subject: `Rate Limit Alert - ${alertData.ip}`,
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
    const message = `IP Ban Notification\n\nIP: ${banData.ip}\nReason: ${banData.reason}\nDuration: ${banData.duration || 'Permanent'}`;
    
    await this.sendEmail(message, {
      type: 'ipBanNotification',
      subject: `IP Ban Notification - ${banData.ip}`,
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
    const message = `Daily Security Report - ${reportData.date}\n\nSummary:\n• Total Requests: ${reportData.totalRequests}\n• Violations: ${reportData.totalViolations}\n• Bans Applied: ${reportData.totalBans}`;
    
    await this.sendEmail(message, {
      type: 'dailyReport',
      subject: `Daily Security Report - ${reportData.date}`,
      data: {
        date: reportData.date,
        totalRequests: reportData.totalRequests,
        totalViolations: reportData.totalViolations,
        totalBans: reportData.totalBans,
        topViolatingIPs: reportData.topViolatingIPs,
        topEndpoints: reportData.topEndpoints,
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
    const message = `Weekly Security Report - ${reportData.week}\n\nSummary:\n• Total Requests: ${reportData.totalRequests}\n• Violations: ${reportData.totalViolations}\n• Bans Applied: ${reportData.totalBans}`;
    
    await this.sendEmail(message, {
      type: 'weeklyReport',
      subject: `Weekly Security Report - ${reportData.week}`,
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
   * Close the email notifier
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.emit('closed');
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): EmailConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  async updateConfig(newConfig: Partial<EmailConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if SMTP config changed
    if (newConfig.smtp && this.initialized) {
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
    smtpConfigured: boolean;
    from: string | undefined;
    to: string[] | undefined;
  } {
    return {
      initialized: this.initialized,
      smtpConfigured: !!this.config.smtp,
      from: this.config.from,
      to: this.config.to,
    };
  }
}
