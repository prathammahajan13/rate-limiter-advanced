# @pm/rate-limiter-advanced

[![npm version](https://badge.fury.io/js/%40pm%2Frate-limiter-advanced.svg)](https://badge.fury.io/js/%40pm%2Frate-limiter-advanced)
[![Build Status](https://github.com/prathammahajan13/rate-limiter-advanced/workflows/CI/badge.svg)](https://github.com/prathammahajan13/rate-limiter-advanced/actions)
[![Coverage Status](https://coveralls.io/repos/github/prathammahajan13/rate-limiter-advanced/badge.svg?branch=main)](https://coveralls.io/github/prathammahajan13/rate-limiter-advanced?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.11.0+-green.svg)](https://nodejs.org/)

> **🛡️ Security-Focused IP-Based Rate Limiter** - Advanced threat detection and automatic banning system for hackers, bots, and malicious users.

A comprehensive, enterprise-grade rate limiting solution designed specifically for **detecting and banning hackers, bots, and malicious users**. Features automatic IP banning with escalating penalties, advanced threat detection, real-time analytics, and multi-channel security alerts.

## 🚀 Key Features

### 🛡️ **Security & Threat Detection**
- **Automatic IP Banning** - Instant bans on rate limit violations with escalating penalties
- **Advanced Hacker Detection** - Identifies bots, scrapers, and malicious users
- **Suspicious IP Analysis** - Geolocation-based threat assessment
- **User Agent Analysis** - Detects automated tools and suspicious patterns
- **Attack Pattern Recognition** - Machine learning-based threat identification
- **Real-time Security Alerts** - Multi-channel notifications (Slack, Email, Webhooks)

### ⚡ **High-Performance Rate Limiting**
- **IP-based Rate Limiting** - Configurable windows and limits per endpoint
- **Endpoint-specific Rules** - Fine-grained control for different API endpoints
- **Multiple Storage Backends** - Memory, Redis, Database with automatic fallback
- **Express.js Middleware** - Seamless integration with existing applications
- **Custom Rule Engine** - Flexible matching and advanced rule configuration

### 📊 **Analytics & Monitoring**
- **Real-time Analytics** - Live monitoring of requests, violations, and bans
- **Performance Metrics** - Response times, throughput, and error rates
- **Dashboard API** - Built-in monitoring and insights dashboard
- **Export Capabilities** - Data export for external analysis tools
- **Trend Analysis** - Historical data analysis and reporting

### 🔧 **Enterprise Features**
- **Redis Clustering** - Distributed deployments with high availability
- **Database Persistence** - Full persistence for banned IPs and analytics
- **Whitelist/Blacklist** - IP, range, country, and ISP-based filtering
- **Ban Management** - Appeal process, auto-unban, and escalation rules
- **TypeScript Support** - Full type definitions and IntelliSense support

## 📦 Installation

```bash
npm install @pm/rate-limiter-advanced
```

### Peer Dependencies

```bash
npm install express
```

### Optional Dependencies

For database support, install one or more:
```bash
npm install pg mysql2 sqlite3
```

## 🚀 Quick Start

### Basic Security Configuration

```typescript
import { RateLimiter } from '@pm/rate-limiter-advanced';
import express from 'express';

const app = express();

// Security-focused configuration
const rateLimiter = new RateLimiter({
  storage: {
    type: 'memory', // or 'redis' or 'database'
    fallback: false
  },
  rules: {
    // Strict limits for authentication endpoints
    '/api/auth/login': {
      window: '15m',
      requests: 5,
      windowMs: 900000,
      maxRequests: 5,
      banOnExceed: true,
      banDuration: '1h'
    },
    // Moderate limits for general API
    '/api/*': {
      window: '1m',
      requests: 60,
      windowMs: 60000,
      maxRequests: 60,
      banOnExceed: true,
      banDuration: '30m'
    }
  },
  banManagement: {
    enabled: true,
    escalationEnabled: true,
    escalationRules: [
      { violations: 3, duration: '1h' },
      { violations: 5, duration: '4h' },
      { violations: 10, duration: '24h' }
    ]
  },
  whitelist: {
    enabled: true,
    bypassRateLimit: true,
    ips: ['127.0.0.1', '192.168.0.0/16'],
    countries: ['US', 'CA', 'GB']
  },
  blacklist: {
    enabled: true,
    immediateBlock: true,
    countries: ['CN', 'RU', 'KP']
  }
});

// Apply middleware
app.use(rateLimiter.middleware());

app.listen(3000);
```

### Advanced Production Configuration

```typescript
import { RateLimiter } from '@pm/rate-limiter-advanced';

const rateLimiter = new RateLimiter({
  // Redis storage for production
  storage: {
    type: 'redis',
    config: {
      host: 'localhost',
      port: 6379,
      password: 'your-password',
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    },
    fallback: true // Fallback to memory if Redis fails
  },
  
  // Comprehensive rate limiting rules
  rules: {
    '/api/auth/login': {
      window: '15m',
      requests: 5,
      windowMs: 900000,
      maxRequests: 5,
      banOnExceed: true,
      banDuration: '1h'
    },
    '/api/auth/register': {
      window: '1h',
      requests: 3,
      windowMs: 3600000,
      maxRequests: 3,
      banOnExceed: true,
      banDuration: '2h'
    },
    '/api/upload': {
      window: '1h',
      requests: 10,
      windowMs: 3600000,
      maxRequests: 10,
      banOnExceed: true,
      banDuration: '2h'
    },
    '/api/*': {
      window: '1m',
      requests: 60,
      windowMs: 60000,
      maxRequests: 60,
      banOnExceed: true,
      banDuration: '30m'
    }
  },
  
  // Advanced ban management
  banManagement: {
    enabled: true,
    defaultDuration: '1h',
    escalationEnabled: true,
    maxDuration: '30d',
    appealEnabled: true,
    autoUnban: true,
    autoUnbanAfter: '7d',
    escalationRules: [
      { violations: 3, duration: '1h' },
      { violations: 5, duration: '4h' },
      { violations: 10, duration: '24h' },
      { violations: 20, duration: '7d' }
    ]
  },
  
  // Whitelist configuration
  whitelist: {
    enabled: true,
    bypassRateLimit: true,
    ips: ['127.0.0.1', '192.168.0.0/16', '10.0.0.0/8'],
    countries: ['US', 'CA', 'GB', 'DE', 'FR'],
    organizations: ['Google', 'Cloudflare', 'AWS']
  },
  
  // Blacklist configuration
  blacklist: {
    enabled: true,
    immediateBlock: true,
    ips: ['1.2.3.4', '5.6.7.8'], // Known malicious IPs
    countries: ['CN', 'RU', 'KP'], // High-risk countries
    isps: ['Tor', 'VPN', 'Proxy'] // Known proxy/VPN services
  },
  
  // Analytics configuration
  analytics: {
    enabled: true,
    retentionDays: 90,
    realTimeUpdates: true,
    autoGenerateReports: true,
    reportInterval: '1h'
  },
  
  // Notification configuration
  notifications: {
    enabled: true,
    alertThreshold: 10,
    channels: [
      {
        type: 'slack',
        config: {
          webhookUrl: 'https://hooks.slack.com/services/...',
          channel: '#security-alerts'
        }
      },
      {
        type: 'email',
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'your-email@gmail.com',
            pass: 'your-password'
          },
          to: 'security@yourcompany.com'
        }
      }
    ]
  }
});
```

## 📚 API Reference

### RateLimiter Class

The main class for managing rate limiting functionality.

#### Constructor

```typescript
new RateLimiter(config: RateLimitConfig)
```

#### Methods

##### `middleware(): ExpressMiddleware`
Create Express middleware for rate limiting.

```typescript
app.use(rateLimiter.middleware());
```

##### `checkRateLimit(ip: string, endpoint: string, userAgent?: string, userId?: string): Promise<RateLimitResult>`
Check if a request should be allowed based on rate limiting rules.

```typescript
const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test');
if (result.allowed) {
  // Request is allowed
} else {
  // Rate limit exceeded
  console.log(`Retry after: ${result.retryAfter} seconds`);
}
```

##### `getBanManager(): BanManager`
Get the ban manager instance for manual ban operations.

```typescript
const banManager = rateLimiter.getBanManager();
await banManager.banIP('192.168.1.1', 'suspicious_activity', '1h');
```

##### `getIPManager(): IPManager`
Get the IP manager instance for whitelist/blacklist operations.

```typescript
const ipManager = rateLimiter.getIPManager();
const isWhitelisted = ipManager.isWhitelisted('192.168.1.1');
```

##### `getRuleEngine(): RuleEngine`
Get the rule engine instance for dynamic rule management.

```typescript
const ruleEngine = rateLimiter.getRuleEngine();
ruleEngine.addRule({
  endpoint: '/api/custom',
  window: '1m',
  requests: 10,
  windowMs: 60000,
  maxRequests: 10
});
```

##### `getAnalyticsCollector(): AnalyticsCollector`
Get the analytics collector for monitoring and reporting.

```typescript
const analytics = rateLimiter.getAnalyticsCollector();
const metrics = await analytics.getMetrics();
```

### Configuration Types

#### RateLimitConfig

```typescript
interface RateLimitConfig {
  storage?: StorageConfig;
  rules?: Record<string, RateLimitRule>;
  banManagement?: BanManagementConfig;
  analytics?: AnalyticsConfig;
  notifications?: NotificationConfig;
  whitelist?: WhitelistConfig;
  blacklist?: BlacklistConfig;
  performance?: PerformanceConfig;
}
```

#### StorageConfig

```typescript
interface StorageConfig {
  type: 'memory' | 'redis' | 'database';
  fallback?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  keyPrefix?: string;
  compression?: boolean;
  encryption?: boolean;
  custom?: any;
}
```

#### RateLimitRule

```typescript
interface RateLimitRule {
  name?: string;
  endpoint?: string;
  endpoints?: string[];
  windowMs: number;
  maxRequests: number;
  window?: string;
  requests?: number;
  banOnExceed?: boolean;
  banDuration?: string;
  warningThreshold?: number;
  escalation?: EscalationRule;
  message?: string;
}
```

#### BanManagementConfig

```typescript
interface BanManagementConfig {
  enabled: boolean;
  defaultDuration: string;
  escalationEnabled: boolean;
  maxDuration: string;
  appealEnabled: boolean;
  autoUnban: boolean;
  autoUnbanAfter: string;
  escalationRules: BanEscalationRule[];
}
```

#### WhitelistConfig

```typescript
interface WhitelistConfig {
  enabled: boolean;
  bypassRateLimit: boolean;
  ips?: string[];
  ranges?: string[];
  countries?: string[];
  isps?: string[];
  organizations?: string[];
}
```

#### BlacklistConfig

```typescript
interface BlacklistConfig {
  enabled: boolean;
  immediateBlock: boolean;
  ips?: string[];
  ranges?: string[];
  countries?: string[];
  isps?: string[];
  threatIntelligence?: boolean;
}
```

#### AnalyticsConfig

```typescript
interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  realTimeUpdates: boolean;
  autoGenerateReports?: boolean;
  reportInterval?: string;
}
```

#### NotificationConfig

```typescript
interface NotificationConfig {
  enabled: boolean;
  alertThreshold: number;
  channels: NotificationChannel[];
}
```

## 🗄️ Storage Backends

### Memory Storage

Fastest option, but data doesn't persist across restarts.

```typescript
{
  storage: {
    type: 'memory',
    fallback: false
  }
}
```

### Redis Storage

Best for distributed deployments with high performance.

```typescript
{
  storage: {
    type: 'redis',
    config: {
      host: 'localhost',
      port: 6379,
      password: 'your-password',
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    },
    fallback: true
  }
}
```

### Database Storage

Full persistence with complex querying capabilities.

```typescript
{
  storage: {
    type: 'database',
    config: {
      dialect: 'postgres', // or 'mysql', 'sqlite'
      host: 'localhost',
      port: 5432,
      database: 'rate_limiter',
      username: 'user',
      password: 'password',
      logging: false
    }
  }
}
```

## 🔧 Advanced Usage

### Custom Rule Management

```typescript
// Add custom rules dynamically
rateLimiter.getRuleEngine().addRule({
  endpoint: '/api/upload',
  window: '1h',
  requests: 5,
  windowMs: 3600000,
  maxRequests: 5,
  banOnExceed: true,
  banDuration: '2h'
});

// Remove rules
rateLimiter.getRuleEngine().removeRule('/api/upload');

// Get all rules
const rules = rateLimiter.getRuleEngine().getRules();
```

### Manual Ban Management

```typescript
const banManager = rateLimiter.getBanManager();

// Check if IP is banned
const banInfo = await banManager.getBanInfo('192.168.1.1');
if (banInfo) {
  console.log(`IP banned until: ${banInfo.expiresAt}`);
}

// Manually ban an IP
await banManager.banIP('192.168.1.1', 'manual_ban', '24h', {
  reason: 'Suspicious activity detected',
  admin: 'security-team'
});

// Unban an IP
await banManager.unbanIP('192.168.1.1');

// Get ban statistics
const stats = await banManager.getBanStatistics();
```

### Whitelist/Blacklist Management

```typescript
const ipManager = rateLimiter.getIPManager();

// Add to whitelist
ipManager.addToWhitelist('192.168.1.100');
ipManager.addRangeToWhitelist('192.168.2.0/24');
ipManager.addCountryToWhitelist('US');

// Add to blacklist
ipManager.addToBlacklist('192.168.1.200');
ipManager.addRangeToBlacklist('192.168.3.0/24');
ipManager.addCountryToBlacklist('CN');

// Check status
const isWhitelisted = ipManager.isWhitelisted('192.168.1.100');
const isBlacklisted = ipManager.isBlacklisted('192.168.1.200');
```

### Analytics and Monitoring

```typescript
const analytics = rateLimiter.getAnalyticsCollector();

// Get real-time metrics
const metrics = await analytics.getMetrics();
console.log(`Total requests: ${metrics.totalRequests}`);
console.log(`Violations: ${metrics.violations}`);
console.log(`Bans applied: ${metrics.bansApplied}`);

// Get analytics data
const data = await analytics.getAnalytics({
  startTime: new Date(Date.now() - 86400000), // 24 hours ago
  endTime: new Date(),
  granularity: 'hour'
});

// Generate reports
const report = await analytics.generateReport('security', {
  startTime: new Date(Date.now() - 86400000),
  endTime: new Date()
});
```

### Custom Notifications

```typescript
// Add custom notification channels
rateLimiter.getNotificationManager().addChannel({
  type: 'webhook',
  config: {
    url: 'https://your-webhook.com/security-alerts',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  }
});

// Send custom alerts
await rateLimiter.getNotificationManager().sendAlert({
  type: 'security_incident',
  severity: 'high',
  message: 'Multiple failed login attempts detected',
  data: {
    ip: '192.168.1.1',
    attempts: 10,
    timeWindow: '5m'
  }
});
```

## 🛡️ Security Best Practices

### 1. **Production Configuration**
```typescript
// Use Redis or Database for production
const productionConfig = {
  storage: {
    type: 'redis',
    config: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD
    },
    fallback: true
  },
  banManagement: {
    enabled: true,
    escalationEnabled: true,
    maxDuration: '30d'
  }
};
```

### 2. **Whitelist Trusted Sources**
```typescript
whitelist: {
  enabled: true,
  bypassRateLimit: true,
  ips: ['127.0.0.1'],
  ranges: ['192.168.0.0/16', '10.0.0.0/8'],
  countries: ['US', 'CA', 'GB'],
  organizations: ['Google', 'Cloudflare', 'AWS']
}
```

### 3. **Monitor and Alert**
```typescript
notifications: {
  enabled: true,
  alertThreshold: 5,
  channels: [
    {
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK,
        channel: '#security-alerts'
      }
    }
  ]
}
```

### 4. **Regular Cleanup**
```typescript
// Clean up expired data
setInterval(async () => {
  await rateLimiter.getBanManager().cleanupExpiredBans();
  await rateLimiter.getAnalyticsCollector().cleanupOldData();
}, 3600000); // Every hour
```

## ⚡ Performance Considerations

### Memory Usage
- **Memory Storage**: Fastest but doesn't persist across restarts
- **Redis**: Best for distributed deployments with high performance
- **Database**: Slower but provides full persistence and complex queries

### Optimization Tips
1. **Disable Analytics** in high-traffic production environments
2. **Use Redis** for distributed deployments
3. **Configure appropriate timeouts** for storage operations
4. **Monitor memory usage** with large datasets
5. **Use connection pooling** for database storage

### Benchmarking
```typescript
// Performance test
const start = Date.now();
for (let i = 0; i < 10000; i++) {
  await rateLimiter.checkRateLimit(`192.168.1.${i % 255}`, '/api/test');
}
const duration = Date.now() - start;
console.log(`Processed 10,000 requests in ${duration}ms`);
```

## 🚨 Error Handling

The package provides comprehensive error handling with custom error classes:

```typescript
import { 
  RateLimitExceededError, 
  IPBannedError, 
  StorageError, 
  ValidationError,
  BanError
} from '@pm/rate-limiter-advanced';

try {
  const result = await rateLimiter.checkRateLimit(ip, endpoint);
} catch (error) {
  if (error instanceof RateLimitExceededError) {
    console.log(`Rate limit exceeded. Retry after: ${error.retryAfter} seconds`);
  } else if (error instanceof IPBannedError) {
    console.log(`IP banned. Reason: ${error.reason}`);
    console.log(`Expires at: ${error.expiresAt}`);
  } else if (error instanceof StorageError) {
    console.log(`Storage error: ${error.message}`);
  } else if (error instanceof ValidationError) {
    console.log(`Validation error: ${error.message}`);
  }
}
```

## 🧪 Testing

### Unit Testing
```typescript
import { RateLimiter } from '@pm/rate-limiter-advanced';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      storage: { type: 'memory', fallback: false },
      rules: {
        '/api/test': {
          window: '1m',
          requests: 10,
          windowMs: 60000,
          maxRequests: 10
        }
      }
    });
  });

  it('should allow requests within limit', async () => {
    const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test');
    expect(result.allowed).toBe(true);
  });

  it('should block requests exceeding limit', async () => {
    // Make 11 requests
    for (let i = 0; i < 11; i++) {
      await rateLimiter.checkRateLimit('192.168.1.1', '/api/test');
    }
    
    const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test');
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Testing
```typescript
import request from 'supertest';
import express from 'express';
import { RateLimiter } from '@pm/rate-limiter-advanced';

describe('Express Integration', () => {
  let app: express.Application;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    app = express();
    rateLimiter = new RateLimiter({
      storage: { type: 'memory', fallback: false },
      rules: {
        '/api/test': {
          window: '1m',
          requests: 5,
          windowMs: 60000,
          maxRequests: 5
        }
      }
    });
    
    app.use(rateLimiter.middleware());
    app.get('/api/test', (req, res) => res.json({ message: 'OK' }));
  });

  it('should apply rate limiting middleware', async () => {
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
    expect(response.headers['x-rate-limit-remaining']).toBeDefined();
  });
});
```

## 📊 Monitoring and Debugging

### Debug Mode
```typescript
import debug from 'debug';

// Enable debug logging
process.env.DEBUG = 'rate-limiter:*';

const rateLimiter = new RateLimiter({
  // ... configuration
});
```

### Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const storage = rateLimiter.getStorage();
    const isConnected = await storage.isConnected();
    
    res.json({
      status: 'healthy',
      storage: isConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Metrics Collection
```typescript
// Custom metrics collection
const metrics = {
  requests: 0,
  violations: 0,
  bans: 0
};

rateLimiter.on('rateLimitCheck', (data) => {
  metrics.requests++;
  if (data.result.violation) {
    metrics.violations++;
  }
  if (data.result.banApplied) {
    metrics.bans++;
  }
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

## 🔄 Migration Guide

### From express-rate-limit
```typescript
// Old express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// New @pm/rate-limiter-advanced
import { RateLimiter } from '@pm/rate-limiter-advanced';

const rateLimiter = new RateLimiter({
  storage: { type: 'memory', fallback: false },
  rules: {
    '/': {
      window: '15m',
      requests: 100,
      windowMs: 900000,
      maxRequests: 100
    }
  }
});

app.use(rateLimiter.middleware());
```

### From express-slow-down
```typescript
// Old express-slow-down
import slowDown from 'express-slow-down';

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 100
});

// New @pm/rate-limiter-advanced with escalation
const rateLimiter = new RateLimiter({
  storage: { type: 'memory', fallback: false },
  rules: {
    '/': {
      window: '15m',
      requests: 100,
      windowMs: 900000,
      maxRequests: 100,
      warningThreshold: 80
    }
  },
  banManagement: {
    enabled: true,
    escalationEnabled: true,
    escalationRules: [
      { violations: 100, duration: '1m' },
      { violations: 150, duration: '5m' }
    ]
  }
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/pm/rate-limiter-advanced.git
cd rate-limiter-advanced
npm install
npm run build
npm test
```

### Code Style
- Use TypeScript
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation
7. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 **Email**: mahajanpratham88@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/prathammahajan13/rate-limiter-advanced/issues)
- 📖 **Documentation**: [Full Documentation](https://github.com/prathammahajan13/rate-limiter-advanced#readme)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/prathammahajan13/rate-limiter-advanced/discussions)

## 🏆 Acknowledgments

- Built with ❤️ by Pratham Mahajan
- Inspired by the need for better security in modern web applications
- Thanks to all contributors and the open-source community

## 📈 Changelog

### v1.0.0 (2024-01-XX)
- 🎉 Initial release
- ✅ Core rate limiting functionality
- ✅ Automatic IP banning with escalation
- ✅ Redis and database support
- ✅ Analytics and monitoring
- ✅ Multi-channel notifications
- ✅ Whitelist/blacklist management
- ✅ Express.js middleware integration
- ✅ TypeScript support
- ✅ Comprehensive test suite
- ✅ Security-focused features

---

**Made with ❤️ for the security community**

[![GitHub stars](https://img.shields.io/github/stars/prathammahajan13/rate-limiter-advanced.svg?style=social&label=Star)](https://github.com/prathammahajan13/rate-limiter-advanced)
[![GitHub forks](https://img.shields.io/github/forks/prathammahajan13/rate-limiter-advanced.svg?style=social&label=Fork)](https://github.com/prathammahajan13/rate-limiter-advanced/fork)
[![GitHub watchers](https://img.shields.io/github/watchers/prathammahajan13/rate-limiter-advanced.svg?style=social&label=Watch)](https://github.com/prathammahajan13/rate-limiter-advanced)