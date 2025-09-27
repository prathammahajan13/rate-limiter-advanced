import { EventEmitter } from 'events';
import { AnalyticsQuery, AnalyticsReport, ExportFormat, ExportFilters, AnalyticsData } from '../types/AnalyticsTypes';
import { AnalyticsCollector } from './AnalyticsCollector';

export class ReportGenerator extends EventEmitter {
  private analyticsCollector: AnalyticsCollector;
  private initialized: boolean = false;

  constructor(analyticsCollector: AnalyticsCollector) {
    super();
    this.analyticsCollector = analyticsCollector;
  }

  /**
   * Initialize the report generator
   */
  async initialize(): Promise<void> {
    try {
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate a daily report
   * @param date - Date for the report (optional, defaults to yesterday)
   * @param filters - Optional filters
   * @returns Daily report
   */
  async generateDailyReport(date?: Date, filters?: ExportFilters): Promise<AnalyticsReport> {
    if (!this.initialized) {
      throw new Error('Report generator not initialized');
    }

    try {
      const reportDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const query: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans', 'geographic', 'endpoints'],
        dimensions: ['ip', 'endpoint', 'country', 'isp'],
        filters: (filters as any) || {},
        dateRange: {
          start: startOfDay,
          end: endOfDay,
          granularity: 'hour',
        },
        granularity: 'hour',
        aggregations: [],
        sort: [],
      };

      const data = await this.analyticsCollector.getAnalytics(query);
      
      const report: AnalyticsReport = {
        id: this.generateReportId('daily', reportDate),
        name: `Daily Security Report - ${reportDate.toISOString().split('T')[0]}`,
        description: `Daily security report for ${reportDate.toISOString().split('T')[0]}`,
        type: 'overview',
        query,
        data: data as AnalyticsData,
        generatedAt: new Date(),
        generatedBy: 'system',
        format: 'json',
        size: JSON.stringify(data).length,
        metadata: {
          reportType: 'daily',
          date: reportDate.toISOString().split('T')[0],
          filters: (filters as any) || {},
        },
      };

      this.emit('dailyReportGenerated', report);
      return report;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate a weekly report
   * @param weekStart - Start of the week (optional, defaults to last Monday)
   * @param filters - Optional filters
   * @returns Weekly report
   */
  async generateWeeklyReport(weekStart?: Date, filters?: ExportFilters): Promise<AnalyticsReport> {
    if (!this.initialized) {
      throw new Error('Report generator not initialized');
    }

    try {
      const startOfWeek = weekStart || this.getLastMonday();
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const query: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans', 'geographic', 'endpoints', 'performance'],
        dimensions: ['ip', 'endpoint', 'country', 'isp', 'day'],
        filters: (filters as any) || {},
        dateRange: {
          start: startOfWeek,
          end: endOfWeek,
          granularity: 'day',
        },
        granularity: 'day',
        aggregations: [],
        sort: [],
      };

      const data = await this.analyticsCollector.getAnalytics(query);
      
      const report: AnalyticsReport = {
        id: this.generateReportId('weekly', startOfWeek),
        name: `Weekly Security Report - Week of ${startOfWeek.toISOString().split('T')[0]}`,
        description: `Weekly security report for the week of ${startOfWeek.toISOString().split('T')[0]}`,
        type: 'detailed',
        query,
        data: data as AnalyticsData,
        generatedAt: new Date(),
        generatedBy: 'system',
        format: 'json',
        size: JSON.stringify(data).length,
        metadata: {
          reportType: 'weekly',
          weekStart: startOfWeek.toISOString().split('T')[0],
          weekEnd: endOfWeek.toISOString().split('T')[0],
          filters: (filters as any) || {},
        },
      };

      this.emit('weeklyReportGenerated', report);
      return report;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate a monthly report
   * @param month - Month for the report (optional, defaults to last month)
   * @param filters - Optional filters
   * @returns Monthly report
   */
  async generateMonthlyReport(month?: Date, filters?: ExportFilters): Promise<AnalyticsReport> {
    if (!this.initialized) {
      throw new Error('Report generator not initialized');
    }

    try {
      const reportMonth = month || this.getLastMonth();
      const startOfMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), 1);
      const endOfMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const query: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans', 'geographic', 'endpoints', 'performance', 'trends'],
        dimensions: ['ip', 'endpoint', 'country', 'isp', 'week'],
        filters: (filters as any) || {},
        dateRange: {
          start: startOfMonth,
          end: endOfMonth,
          granularity: 'week',
        },
        granularity: 'week',
        aggregations: [],
        sort: [],
      };

      const data = await this.analyticsCollector.getAnalytics(query);
      
      const report: AnalyticsReport = {
        id: this.generateReportId('monthly', startOfMonth),
        name: `Monthly Security Report - ${startOfMonth.toISOString().substring(0, 7)}`,
        description: `Monthly security report for ${startOfMonth.toISOString().substring(0, 7)}`,
        type: 'detailed',
        query,
        data: data as AnalyticsData,
        generatedAt: new Date(),
        generatedBy: 'system',
        format: 'json',
        size: JSON.stringify(data).length,
        metadata: {
          reportType: 'monthly',
          month: startOfMonth.toISOString().substring(0, 7),
          filters: (filters as any) || {},
        },
      };

      this.emit('monthlyReportGenerated', report);
      return report;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate a custom report
   * @param query - Analytics query
   * @param name - Report name
   * @param description - Report description
   * @returns Custom report
   */
  async generateCustomReport(
    query: AnalyticsQuery,
    name: string,
    description: string
  ): Promise<AnalyticsReport> {
    if (!this.initialized) {
      throw new Error('Report generator not initialized');
    }

    try {
      const data = await this.analyticsCollector.getAnalytics(query);
      
      const report: AnalyticsReport = {
        id: this.generateReportId('custom', new Date()),
        name,
        description,
        type: 'custom',
        query,
        data: data as AnalyticsData,
        generatedAt: new Date(),
        generatedBy: 'system',
        format: 'json',
        size: JSON.stringify(data).length,
        metadata: {
          reportType: 'custom',
          customQuery: true,
        },
      };

      this.emit('customReportGenerated', report);
      return report;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Export a report to a specific format
   * @param report - Report to export
   * @param format - Export format
   * @returns Exported report data
   */
  async exportReport(report: AnalyticsReport, format: ExportFormat): Promise<string> {
    if (!this.initialized) {
      throw new Error('Report generator not initialized');
    }

    try {
      let exportedData: string;

      switch (format) {
        case 'json':
          exportedData = JSON.stringify(report, null, 2);
          break;
        case 'csv':
          exportedData = this.exportToCSV(report);
          break;
        case 'xlsx':
          exportedData = this.exportToXLSX(report);
          break;
        case 'pdf':
          exportedData = this.exportToPDF(report);
          break;
        case 'xml':
          exportedData = this.exportToXML(report);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.emit('reportExported', { report, format, size: exportedData.length });
      return exportedData;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Export report to CSV format
   * @param report - Report to export
   * @returns CSV data
   */
  private exportToCSV(report: AnalyticsReport): string {
    const lines: string[] = [];
    
    // Add report metadata
    lines.push('Report Metadata');
    lines.push(`Name,${report.name}`);
    lines.push(`Description,${report.description}`);
    lines.push(`Generated At,${report.generatedAt.toISOString()}`);
    lines.push(`Generated By,${report.generatedBy}`);
    lines.push('');

    // Add overview data
    lines.push('Overview');
    lines.push('Metric,Value');
    lines.push(`Total Requests,${report.data.overview.totalRequests}`);
    lines.push(`Total Violations,${report.data.overview.totalViolations}`);
    lines.push(`Total Bans,${report.data.overview.totalBans}`);
    lines.push(`Unique IPs,${report.data.overview.uniqueIPs}`);
    lines.push(`Unique Endpoints,${report.data.overview.uniqueEndpoints}`);
    lines.push(`Average Response Time,${report.data.overview.averageResponseTime}`);
    lines.push(`Error Rate,${report.data.overview.errorRate}`);
    lines.push(`Ban Effectiveness,${report.data.overview.banEffectiveness}`);
    lines.push(`False Positive Rate,${report.data.overview.falsePositiveRate}`);
    lines.push('');

    // Add top violating IPs
    lines.push('Top Violating IPs');
    lines.push('IP,Violations,Percentage');
    for (const ip of report.data.violations.byIP.slice(0, 10)) {
      lines.push(`${ip.ip},${ip.count},${ip.percentage.toFixed(2)}`);
    }
    lines.push('');

    // Add top endpoints
    lines.push('Top Endpoints');
    lines.push('Endpoint,Requests,Percentage');
    for (const endpoint of report.data.endpoints.topEndpoints.slice(0, 10)) {
      lines.push(`${endpoint.endpoint},${endpoint.requests},${endpoint.percentage.toFixed(2)}`);
    }

    return lines.join('\n');
  }

  /**
   * Export report to XLSX format
   * @param report - Report to export
   * @returns XLSX data (simplified as JSON for now)
   */
  private exportToXLSX(report: AnalyticsReport): string {
    // This is a simplified implementation
    // In a real implementation, you would use a library like xlsx
    return JSON.stringify({
      metadata: {
        name: report.name,
        description: report.description,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
      },
      overview: report.data.overview,
      topViolatingIPs: report.data.violations.byIP.slice(0, 10),
      topEndpoints: report.data.endpoints.topEndpoints.slice(0, 10),
      geographic: report.data.geographic.countries.slice(0, 10),
    }, null, 2);
  }

  /**
   * Export report to PDF format
   * @param report - Report to export
   * @returns PDF data (simplified as JSON for now)
   */
  private exportToPDF(report: AnalyticsReport): string {
    // This is a simplified implementation
    // In a real implementation, you would use a library like puppeteer or jsPDF
    return JSON.stringify({
      type: 'pdf',
      metadata: {
        name: report.name,
        description: report.description,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
      },
      content: {
        overview: report.data.overview,
        summary: this.generateReportSummary(report),
      },
    }, null, 2);
  }

  /**
   * Export report to XML format
   * @param report - Report to export
   * @returns XML data
   */
  private exportToXML(report: AnalyticsReport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<report>\n';
    xml += `  <metadata>\n`;
    xml += `    <name>${this.escapeXml(report.name)}</name>\n`;
    xml += `    <description>${this.escapeXml(report.description)}</description>\n`;
    xml += `    <generatedAt>${report.generatedAt.toISOString()}</generatedAt>\n`;
    xml += `    <generatedBy>${this.escapeXml(report.generatedBy)}</generatedBy>\n`;
    xml += `  </metadata>\n`;
    xml += `  <overview>\n`;
    xml += `    <totalRequests>${report.data.overview.totalRequests}</totalRequests>\n`;
    xml += `    <totalViolations>${report.data.overview.totalViolations}</totalViolations>\n`;
    xml += `    <totalBans>${report.data.overview.totalBans}</totalBans>\n`;
    xml += `    <uniqueIPs>${report.data.overview.uniqueIPs}</uniqueIPs>\n`;
    xml += `    <uniqueEndpoints>${report.data.overview.uniqueEndpoints}</uniqueEndpoints>\n`;
    xml += `    <averageResponseTime>${report.data.overview.averageResponseTime}</averageResponseTime>\n`;
    xml += `    <errorRate>${report.data.overview.errorRate}</errorRate>\n`;
    xml += `    <banEffectiveness>${report.data.overview.banEffectiveness}</banEffectiveness>\n`;
    xml += `    <falsePositiveRate>${report.data.overview.falsePositiveRate}</falsePositiveRate>\n`;
    xml += `  </overview>\n`;
    xml += '</report>';

    return xml;
  }

  /**
   * Generate a report summary
   * @param report - Report to summarize
   * @returns Report summary
   */
  private generateReportSummary(report: AnalyticsReport): string {
    const overview = report.data.overview;
    const summary = [];

    summary.push(`This report covers the period from ${report.query.dateRange.start.toISOString().split('T')[0]} to ${report.query.dateRange.end.toISOString().split('T')[0]}.`);
    summary.push(`During this period, there were ${overview.totalRequests} total requests, with ${overview.totalViolations} violations and ${overview.totalBans} bans applied.`);
    summary.push(`The system processed requests from ${overview.uniqueIPs} unique IP addresses across ${overview.uniqueEndpoints} different endpoints.`);
    summary.push(`The average response time was ${overview.averageResponseTime.toFixed(2)}ms, with an error rate of ${overview.errorRate.toFixed(2)}%.`);
    summary.push(`Ban effectiveness was ${overview.banEffectiveness.toFixed(2)}%, with a false positive rate of ${overview.falsePositiveRate.toFixed(2)}%.`);

    return summary.join(' ');
  }

  /**
   * Escape XML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate a unique report ID
   * @param type - Report type
   * @param date - Report date
   * @returns Report ID
   */
  private generateReportId(type: string, date: Date): string {
    const timestamp = date.getTime();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Get last Monday
   * @returns Date of last Monday
   */
  private getLastMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToMonday - 7);
    lastMonday.setHours(0, 0, 0, 0);
    return lastMonday;
  }

  /**
   * Get last month
   * @returns Date of last month
   */
  private getLastMonth(): Date {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return lastMonth;
  }

  /**
   * Close the report generator
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.emit('closed');
  }

  /**
   * Check if the report generator is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
