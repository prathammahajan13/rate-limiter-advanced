import { EventEmitter } from 'events';
import { AnalyticsCollector } from './AnalyticsCollector';
import { ReportGenerator } from './ReportGenerator';
import { MetricsCalculator } from './MetricsCalculator';
import { AnalyticsQuery, AnalyticsData, AnalyticsDashboard, AnalyticsAPIResponse } from '../types/AnalyticsTypes';

export class DashboardAPI extends EventEmitter {
  private analyticsCollector: AnalyticsCollector;
  private reportGenerator: ReportGenerator;
  private metricsCalculator: MetricsCalculator;
  private dashboards: Map<string, AnalyticsDashboard> = new Map();
  private initialized: boolean = false;

  constructor(
    analyticsCollector: AnalyticsCollector,
    reportGenerator: ReportGenerator,
    metricsCalculator: MetricsCalculator
  ) {
    super();
    this.analyticsCollector = analyticsCollector;
    this.reportGenerator = reportGenerator;
    this.metricsCalculator = metricsCalculator;
  }

  /**
   * Initialize the dashboard API
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
   * Get analytics overview
   * @param query - Analytics query
   * @returns Analytics overview
   */
  async getOverview(query?: Partial<AnalyticsQuery>): Promise<AnalyticsAPIResponse<AnalyticsData>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const defaultQuery: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans'],
        dimensions: ['ip', 'endpoint'],
        filters: {},
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date(),
          granularity: 'hour',
        },
        granularity: 'hour',
        aggregations: [],
        sort: [],
      };

      const finalQuery = { ...defaultQuery, ...query };
      const data = await this.analyticsCollector.getAnalytics(finalQuery);
      const metrics = this.metricsCalculator.calculateMetrics(data as AnalyticsData, finalQuery);

      return {
        success: true,
        data: {
          ...data,
          calculatedMetrics: metrics,
        } as unknown as AnalyticsData,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null as any,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get IP analytics
   * @param query - Analytics query
   * @returns IP analytics
   */
  async getIPAnalytics(query?: Partial<AnalyticsQuery>): Promise<AnalyticsAPIResponse<any>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const defaultQuery: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans'],
        dimensions: ['ip'],
        filters: {},
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'hour',
        },
        granularity: 'hour',
        aggregations: [],
        sort: [],
      };

      const finalQuery = { ...defaultQuery, ...query };
      const data = await this.analyticsCollector.getAnalytics(finalQuery);

      return {
        success: true,
        data: {
          topIPs: data['requests']?.topIPs || [],
          topViolatingIPs: data['violations']?.byIP || [],
          topBannedIPs: data['bans']?.byCountry || [], // Simplified mapping
          geographicDistribution: data['geographic']?.countries || [],
        },
        meta: {
          total: data['requests']?.topIPs?.length || 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null,
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get endpoint analytics
   * @param query - Analytics query
   * @returns Endpoint analytics
   */
  async getEndpointAnalytics(query?: Partial<AnalyticsQuery>): Promise<AnalyticsAPIResponse<any>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const defaultQuery: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans'],
        dimensions: ['endpoint'],
        filters: {},
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'hour',
        },
        granularity: 'hour',
        aggregations: [],
        sort: [],
      };

      const finalQuery = { ...defaultQuery, ...query };
      const data = await this.analyticsCollector.getAnalytics(finalQuery);

      return {
        success: true,
        data: {
          topEndpoints: data['endpoints']?.topEndpoints || [],
          slowestEndpoints: data['endpoints']?.slowestEndpoints || [],
          mostViolatedEndpoints: data['endpoints']?.mostViolated || [],
          endpointPerformance: data['performance'] || {},
        },
        meta: {
          total: data['endpoints']?.topEndpoints?.length || 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null,
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get geographic analytics
   * @param query - Analytics query
   * @returns Geographic analytics
   */
  async getGeographicAnalytics(query?: Partial<AnalyticsQuery>): Promise<AnalyticsAPIResponse<any>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const defaultQuery: AnalyticsQuery = {
        metrics: ['requests', 'violations', 'bans'],
        dimensions: ['country', 'region', 'city'],
        filters: {},
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'hour',
        },
        granularity: 'hour',
        aggregations: [],
        sort: [],
      };

      const finalQuery = { ...defaultQuery, ...query };
      const data = await this.analyticsCollector.getAnalytics(finalQuery);

      return {
        success: true,
        data: {
          countries: data['geographic']?.countries || [],
          regions: data['geographic']?.regions || [],
          cities: data['geographic']?.cities || [],
          isps: data['geographic']?.isps || [],
          riskMap: data['geographic']?.riskMap || {},
        },
        meta: {
          total: data['geographic']?.countries?.length || 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null,
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Export analytics data
   * @param query - Analytics query
   * @param format - Export format
   * @returns Exported data
   */
  async exportAnalytics(query: AnalyticsQuery, format: string): Promise<AnalyticsAPIResponse<string>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      // const data = await this.analyticsCollector.getAnalytics(query); // Unused
      const report = await this.reportGenerator.generateCustomReport(
        query,
        'Analytics Export',
        'Exported analytics data'
      );
      const exportedData = await this.reportGenerator.exportReport(report, format as any);

      return {
        success: true,
        data: exportedData,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: '',
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Create a dashboard
   * @param dashboard - Dashboard configuration
   * @returns Created dashboard
   */
  async createDashboard(dashboard: Omit<AnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsAPIResponse<AnalyticsDashboard>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const newDashboard: AnalyticsDashboard = {
        ...dashboard,
        id: this.generateDashboardId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.dashboards.set(newDashboard.id, newDashboard);
      this.emit('dashboardCreated', newDashboard);

      return {
        success: true,
        data: newDashboard,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null as any,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get a dashboard
   * @param id - Dashboard ID
   * @returns Dashboard
   */
  async getDashboard(id: string): Promise<AnalyticsAPIResponse<AnalyticsDashboard>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          data: null as any,
          meta: {
            total: 0,
            page: 1,
            limit: 1,
            hasMore: false,
          },
          errors: ['Dashboard not found'],
        };
      }

      return {
        success: true,
        data: dashboard,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null as any,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Update a dashboard
   * @param id - Dashboard ID
   * @param updates - Dashboard updates
   * @returns Updated dashboard
   */
  async updateDashboard(id: string, updates: Partial<AnalyticsDashboard>): Promise<AnalyticsAPIResponse<AnalyticsDashboard>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          data: null as any,
          meta: {
            total: 0,
            page: 1,
            limit: 1,
            hasMore: false,
          },
          errors: ['Dashboard not found'],
        };
      }

      const updatedDashboard: AnalyticsDashboard = {
        ...dashboard,
        ...updates,
        id: dashboard.id, // Preserve ID
        createdAt: dashboard.createdAt, // Preserve creation date
        updatedAt: new Date(),
      };

      this.dashboards.set(id, updatedDashboard);
      this.emit('dashboardUpdated', updatedDashboard);

      return {
        success: true,
        data: updatedDashboard,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null as any,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Delete a dashboard
   * @param id - Dashboard ID
   * @returns Deletion result
   */
  async deleteDashboard(id: string): Promise<AnalyticsAPIResponse<boolean>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          data: false,
          meta: {
            total: 0,
            page: 1,
            limit: 1,
            hasMore: false,
          },
          errors: ['Dashboard not found'],
        };
      }

      this.dashboards.delete(id);
      this.emit('dashboardDeleted', { id, dashboard });

      return {
        success: true,
        data: true,
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: false,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * List all dashboards
   * @param page - Page number
   * @param limit - Items per page
   * @returns List of dashboards
   */
  async listDashboards(page: number = 1, limit: number = 10): Promise<AnalyticsAPIResponse<AnalyticsDashboard[]>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const dashboards = Array.from(this.dashboards.values());
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDashboards = dashboards.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedDashboards,
        meta: {
          total: dashboards.length,
          page,
          limit,
          hasMore: endIndex < dashboards.length,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get dashboard data
   * @param id - Dashboard ID
   * @returns Dashboard data
   */
  async getDashboardData(id: string): Promise<AnalyticsAPIResponse<any>> {
    if (!this.initialized) {
      throw new Error('Dashboard API not initialized');
    }

    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          data: null,
          meta: {
            total: 0,
            page: 1,
            limit: 1,
            hasMore: false,
          },
          errors: ['Dashboard not found'],
        };
      }

      // Get data for each widget
      const widgetData: any = {};
      for (const widget of dashboard.widgets) {
        try {
          const query: AnalyticsQuery = {
            metrics: [widget.config.metric],
            dimensions: widget.filters ? Object.keys(widget.filters) : [],
            filters: widget.filters || {},
            dateRange: {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000),
              end: new Date(),
              granularity: 'hour',
            },
            granularity: 'hour',
            aggregations: widget.config.aggregation ? [widget.config.aggregation] : [],
            sort: [],
          };

          const data = await this.analyticsCollector.getAnalytics(query);
          widgetData[widget.id] = data;
        } catch (error) {
          widgetData[widget.id] = { error: (error as Error).message };
        }
      }

      return {
        success: true,
        data: {
          dashboard,
          widgetData,
        },
        meta: {
          total: 1,
          page: 1,
          limit: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        data: null,
        meta: {
          total: 0,
          page: 1,
          limit: 1,
          hasMore: false,
        },
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Generate a unique dashboard ID
   * @returns Dashboard ID
   */
  private generateDashboardId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `dashboard_${timestamp}_${random}`;
  }

  /**
   * Close the dashboard API
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.emit('closed');
  }

  /**
   * Check if the dashboard API is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
