#!/usr/bin/env node

/**
 * Security-Focused Rate Limiter Example
 * Optimized for detecting and banning hackers, bots, and malicious users
 */

import { RateLimiter, IPUtils, BanManager, MemoryStorage } from '@prathammahajan/rate-limiter-advanced';

// Security-focused configuration
const securityConfig = {
  // Use memory storage for fast response times
  storage: {
    type: 'memory' as const,
    fallback: false
  },

  // Aggressive rate limiting rules for security
  rules: {
    // Login attempts - very strict
    '/api/auth/login': {
      window: '15m',
      requests: 5,
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      banOnExceed: true,
      banDuration: '1h'
    },

    // Registration attempts - moderate
    '/api/auth/register': {
      window: '1h',
      requests: 3,
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      banOnExceed: true,
      banDuration: '2h'
    },

    // Password reset - very strict
    '/api/auth/reset-password': {
      window: '1h',
      requests: 2,
      windowMs: 3600000, // 1 hour
      maxRequests: 2,
      banOnExceed: true,
      banDuration: '4h'
    },

    // API endpoints - moderate
    '/api/*': {
      window: '1m',
      requests: 60,
      windowMs: 60000, // 1 minute
      maxRequests: 60,
      banOnExceed: true,
      banDuration: '30m'
    },

    // File uploads - strict
    '/api/upload': {
      window: '1h',
      requests: 10,
      windowMs: 3600000, // 1 hour
      maxRequests: 10,
      banOnExceed: true,
      banDuration: '2h'
    }
  },

  // Ban management for security
  banManagement: {
    enabled: true,
    defaultDuration: '1h',
    escalationEnabled: true,
    maxBanDuration: '30d',
    appealProcess: false,
    autoUnban: false,
    escalationRules: [
      {
        violations: 3,
        duration: '1h'
      },
      {
        violations: 5,
        duration: '4h'
      },
      {
        violations: 10,
        duration: '24h'
      },
      {
        violations: 20,
        duration: '7d'
      }
    ]
  },

  // Whitelist trusted sources
  whitelist: {
    enabled: true,
    bypassRateLimit: true,
    ips: [
      '127.0.0.1',        // Localhost
      '::1',              // IPv6 localhost
      '10.0.0.0/8',       // Private network
      '192.168.0.0/16',   // Private network
      '172.16.0.0/12'     // Private network
    ],
    countries: ['US', 'CA', 'GB', 'DE', 'FR'], // Trusted countries
    organizations: ['Google', 'Cloudflare', 'AWS'] // Trusted ISPs
  },

  // Blacklist known bad actors
  blacklist: {
    enabled: true,
    immediateBlock: true,
    ips: [
      // Add known malicious IPs here
      '1.2.3.4',
      '5.6.7.8'
    ],
    countries: ['CN', 'RU', 'KP'], // High-risk countries
    isps: ['Tor', 'VPN', 'Proxy'] // Known proxy/VPN services
  },

  // Analytics for security monitoring
  analytics: {
    enabled: true,
    retentionDays: 90,
    realTimeUpdates: true,
    autoGenerateReports: true,
    reportInterval: '1h'
  },

  // Notifications for security alerts
  notifications: {
    enabled: true,
    alertThreshold: 10,
    channels: [
      {
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: '#security-alerts'
        }
      },
      {
        type: 'email',
        config: {
          to: 'security@yourcompany.com',
          from: 'noreply@yourcompany.com',
          subject: 'Security Alert: Rate Limit Violations'
        }
      }
    ]
  }
};

// Initialize the security-focused rate limiter
const securityRateLimiter = new RateLimiter(securityConfig);

// Security utility functions
export class SecurityUtils {
  /**
   * Check if an IP is suspicious based on various factors
   */
  static isSuspiciousIP(ip: string): boolean {
    // Check if IP is from a high-risk country
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    
    // Check if IP is from a known proxy/VPN service
    const proxyISPs = ['Tor', 'VPN', 'Proxy', 'Anonymous'];
    
    // Check if IP is from a datacenter (often used by bots)
    const datacenterRanges = [
      '1.1.1.0/24',    // Cloudflare
      '8.8.8.0/24',    // Google
      '208.67.222.0/24' // OpenDNS
    ];
    
    // Check if IP is from a mobile network (less likely to be malicious)
    const mobileISPs = ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'];
    
    // Implement your suspicious IP logic here
    return false; // Placeholder
  }

  /**
   * Check if a user agent is suspicious
   */
  static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /php/i,
      /go-http/i,
      /libwww/i,
      /lwp/i,
      /perl/i,
      /ruby/i,
      /scrapy/i,
      /mechanize/i,
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check if a request pattern is suspicious
   */
  static isSuspiciousPattern(requests: any[]): boolean {
    // Check for rapid-fire requests
    const rapidFire = requests.length > 100; // More than 100 requests in a short time
    
    // Check for requests from multiple IPs (distributed attack)
    const uniqueIPs = new Set(requests.map(r => r.ip)).size;
    const distributedAttack = uniqueIPs > 50; // More than 50 unique IPs
    
    // Check for requests to sensitive endpoints
    const sensitiveEndpoints = ['/api/auth', '/api/admin', '/api/payment'];
    const sensitiveRequests = requests.some(r => 
      sensitiveEndpoints.some(endpoint => r.path.startsWith(endpoint))
    );
    
    return rapidFire || distributedAttack || sensitiveRequests;
  }

  /**
   * Generate security report
   */
  static async generateSecurityReport(rateLimiter: RateLimiter): Promise<any> {
    const analytics = await rateLimiter.getAnalytics({
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endTime: new Date(),
      granularity: 'hour'
    });

    return {
      totalRequests: analytics.overview.totalRequests,
      violations: analytics.violations.total,
      bans: analytics.bans.total,
      topViolatingIPs: analytics.violations.byIP.slice(0, 10),
      topViolatingCountries: analytics.violations.byCountry.slice(0, 10),
      suspiciousPatterns: this.identifySuspiciousPatterns(analytics),
      recommendations: this.generateRecommendations(analytics)
    };
  }

  private static identifySuspiciousPatterns(analytics: any): string[] {
    const patterns = [];
    
    if (analytics.violations.total > 1000) {
      patterns.push('High volume of violations detected');
    }
    
    if (analytics.bans.total > 100) {
      patterns.push('High number of bans applied');
    }
    
    if (analytics.violations.byCountry.length > 10) {
      patterns.push('Attacks from multiple countries detected');
    }
    
    return patterns;
  }

  private static generateRecommendations(analytics: any): string[] {
    const recommendations = [];
    
    if (analytics.violations.total > 500) {
      recommendations.push('Consider implementing stricter rate limits');
    }
    
    if (analytics.bans.total > 50) {
      recommendations.push('Consider implementing IP whitelisting for trusted sources');
    }
    
    if (analytics.violations.byCountry.length > 5) {
      recommendations.push('Consider implementing geographic restrictions');
    }
    
    return recommendations;
  }
}

// Example usage
async function main() {
  console.log('🛡️  Security-Focused Rate Limiter Initialized');
  
  // Test suspicious IP detection
  const testIPs = ['1.1.1.1', '8.8.8.8', '192.168.1.100'];
  for (const ip of testIPs) {
    const isSuspicious = SecurityUtils.isSuspiciousIP(ip);
    const isPrivate = IPUtils.isPrivateIP(ip);
    const isPublic = IPUtils.isPublicIP(ip);
    
    console.log(`IP ${ip}: suspicious=${isSuspicious}, private=${isPrivate}, public=${isPublic}`);
  }
  
  // Test suspicious user agent detection
  const testUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'curl/7.68.0',
    'python-requests/2.25.1',
    'Googlebot/2.1'
  ];
  
  for (const ua of testUserAgents) {
    const isSuspicious = SecurityUtils.isSuspiciousUserAgent(ua);
    console.log(`User Agent: ${ua.substring(0, 50)}... suspicious=${isSuspicious}`);
  }
  
  // Generate security report
  try {
    const report = await SecurityUtils.generateSecurityReport(securityRateLimiter);
    console.log('\n📊 Security Report:');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.log('Note: Analytics not fully configured in this example');
  }
  
  console.log('\n✅ Security-focused rate limiter is ready to protect your application!');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { securityRateLimiter, SecurityUtils };
