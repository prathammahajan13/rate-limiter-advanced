import { RateLimitRule, RateLimitConfig } from '../types/RateLimitTypes';
import { ValidationUtils } from '../utils/ValidationUtils';

export class RuleEngine {
  private rules: Map<string, RateLimitRule>;
  private defaultRule: RateLimitRule;
  private config: RateLimitConfig;

  constructor(rules: Record<string, RateLimitRule> = {}) {
    this.config = { rules };
    this.rules = new Map();
    this.defaultRule = this.createDefaultRule();
    this.initializeRules();
  }

  /**
   * Get the applicable rule for a request
   * @param endpoint - Request endpoint
   * @returns Applicable rate limit rule
   */
  getRule(endpoint: string): RateLimitRule {
    // Check for endpoint-specific rule
    const endpointRule = this.getEndpointRule(endpoint, 'GET');
    if (endpointRule) {
      return endpointRule;
    }
    
    // Return default rule
    return this.defaultRule;
  }

  /**
   * Add a new rule
   * @param rule - Rate limit rule
   */
  addRule(rule: RateLimitRule): void {
    try {
      // Validate rule
      ValidationUtils.validateRateLimitRule(rule);
      
      // Generate rule key
      const key = this.generateRuleKey(rule);
      
      // Store rule
      this.rules.set(key, rule);
    } catch (error) {
      throw new Error(`Failed to add rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a rule
   * @param key - Rule key
   */
  removeRule(key: string): void {
    this.rules.delete(key);
  }

  /**
   * Get all rules
   * @returns Map of all rules
   */
  getRules(): Map<string, RateLimitRule> {
    return new Map(this.rules);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Get endpoint-specific rule
   * @param endpoint - Endpoint path
   * @param method - HTTP method
   * @returns Rule or null
   */
  private getEndpointRule(endpoint: string, _method: string): RateLimitRule | null {
    for (const rule of this.rules.values()) {
      if (rule.endpoint === endpoint || (rule.endpoints && rule.endpoints.includes(endpoint))) {
        return rule;
      }
    }
    return null;
  }

  // /**
  //  * Check if endpoint matches rule
  //  * @param endpoint - Endpoint pattern
  //  * @param path - Request path
  //  * @param method - HTTP method
  //  * @returns True if matches
  //  */
  // private _matchesEndpoint(endpoint: string, path: string, _method: string): boolean {
  //   // Check for exact match
  //   if (endpoint === path) {
  //     return true;
  //   }

  //   // Check for wildcard patterns
  //   if (endpoint.includes('*')) {
  //     const pattern = endpoint.replace(/\*/g, '[^/]+');
  //     const regex = new RegExp(`^${pattern}$`);
  //     return regex.test(path);
  //   }

  //   return false;
  // }

  /**
   * Generate a unique key for a rule
   * @param rule - Rate limit rule
   * @returns Rule key
   */
  private generateRuleKey(rule: RateLimitRule): string {
    const parts = [];
    
    if (rule.name) parts.push(`name:${rule.name}`);
    if (rule.endpoint) parts.push(`endpoint:${rule.endpoint}`);
    if (rule.window) parts.push(`window:${rule.window}`);
    if (rule.requests) parts.push(`requests:${rule.requests}`);
    
    return parts.join('|') || `rule_${Date.now()}`;
  }

  /**
   * Create default rule
   * @returns Default rate limit rule
   */
  private createDefaultRule(): RateLimitRule {
    return {
      name: 'default',
      window: '1h',
      requests: 100,
      windowMs: 3600000,
      maxRequests: 100,
      banOnExceed: false,
      banDuration: '1h'
    };
  }

  /**
   * Initialize rules from config
   */
  private initializeRules(): void {
    if (this.config.rules) {
      for (const [_key, rule] of Object.entries(this.config.rules)) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.defaultRule = this.createDefaultRule();
    this.initializeRules();
  }

  /**
   * Get rule statistics
   * @returns Rule statistics
   */
  getRuleStatistics(): Record<string, any> {
    const stats: any = {
      totalRules: this.rules.size,
      defaultRule: this.defaultRule,
      rulesByEndpoint: {},
      rulesByWindow: {},
      rulesByRequests: {}
    };

    for (const rule of this.rules.values()) {
      // Count by endpoint
      const endpoint = rule.endpoint || 'default';
      stats.rulesByEndpoint[endpoint] = (stats.rulesByEndpoint[endpoint] || 0) + 1;
      
      // Count by window
      const window = rule.window || '1h';
      stats.rulesByWindow[window] = (stats.rulesByWindow[window] || 0) + 1;
      
      // Count by requests
      const requests = rule.requests || 100;
      stats.rulesByRequests[requests] = (stats.rulesByRequests[requests] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export rules
   * @returns Array of rules
   */
  exportRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Import rules
   * @param rules - Array of rules to import
   */
  importRules(rules: RateLimitRule[]): void {
    this.clearRules();
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
}