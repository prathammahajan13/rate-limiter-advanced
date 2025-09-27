import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../core/RateLimiter';
import { MiddlewareOptions, RateLimitResult } from '../types/RateLimitTypes';
import { RateLimitError, RateLimitMiddlewareError } from '../errors/RateLimitError';
import { BanError } from '../errors/BanError';
import { IPUtils } from '../utils/IPUtils';

export class RateLimitMiddleware {
  private rateLimiter: RateLimiter;
  private options: MiddlewareOptions;

  constructor(rateLimiter: RateLimiter, options: MiddlewareOptions = {}) {
    this.rateLimiter = rateLimiter;
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: this.defaultKeyGenerator,
      onLimitReached: this.defaultOnLimitReached,
      onBanApplied: this.defaultOnBanApplied,
      customHeaders: {},
      ...options,
    };
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Extract IP address
        const ip = this.extractIP(req);
        if (!ip) {
          return next(new RateLimitMiddlewareError('Unable to extract IP address', 'ip_extraction'));
        }

        // Generate key for rate limiting
        const key = this.options.keyGenerator!(req);
        const endpoint = req.path || req.url;

        // Check rate limit
        const result = await this.rateLimiter.checkRateLimit(
          ip,
          endpoint,
          req.get('User-Agent'),
          key
        );

        // Set response headers
        this.setRateLimitHeaders(res, result);

        // Handle rate limit violation
        if (!result.allowed) {
          // Call custom handler if provided
          if (this.options.onLimitReached) {
            this.options.onLimitReached(req, res, result);
          }

          // Handle ban applied
          if (result.banApplied && this.options.onBanApplied) {
            const banInfo = await this.rateLimiter.getBanInfo(ip);
            if (banInfo) {
              this.options.onBanApplied(req, res, banInfo);
            }
          }

          // Send error response
          const error = new RateLimitError(
            'Rate limit exceeded',
            result.retryAfter || 0,
            result.totalHits,
            result.remaining,
            result.resetTime,
            ip,
            endpoint,
            req.get('User-Agent')
          );

          return next(error);
        }

        // Rate limit passed, continue
        next();
      } catch (error) {
        // Handle ban errors
        if (error instanceof BanError) {
          return next(error);
        }

        // Handle other errors
        return next(new RateLimitMiddlewareError(
          `Rate limit middleware error: ${error}`,
          'rate_limit_check',
          error as Error
        ));
      }
    };
  }

  /**
   * Extract IP address from request
   * @param req - Express request
   * @returns IP address or null
   */
  private extractIP(req: Request): string | null {
    // Check various headers for IP address
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'x-forwarded',
      'x-cluster-client-ip',
      'cf-connecting-ip', // Cloudflare
      'true-client-ip', // Cloudflare Enterprise
    ];

    for (const header of headers) {
      const value = req.get(header);
      if (value) {
        // Handle comma-separated IPs (x-forwarded-for)
        const ips = value.split(',').map(ip => ip.trim());
        for (const ip of ips) {
          if (IPUtils.isValidIP(ip)) {
            return ip;
          }
        }
      }
    }

    // Fallback to connection remote address
    const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
    if (remoteAddress) {
      const ip = IPUtils.extractIP(remoteAddress);
      if (ip) {
        return ip;
      }
    }

    return null;
  }

  /**
   * Default key generator
   * @param req - Express request
   * @returns Key for rate limiting
   */
  private defaultKeyGenerator = (req: Request): string => {
    const ip = this.extractIP(req);
    const userId = (req as any).user?.id || (req as any).user?.userId;
    return userId ? `${ip}:${userId}` : ip || 'unknown';
  };

  /**
   * Set rate limit headers on response
   * @param res - Express response
   * @param result - Rate limit result
   */
  private setRateLimitHeaders(res: Response, result: RateLimitResult): void {
    // Standard rate limit headers
    res.set('X-RateLimit-Limit', result.totalHits.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', result.resetTime.toString());
    res.set('X-RateLimit-Window', '3600'); // 1 hour in seconds

    // Custom headers
    if (result.retryAfter) {
      res.set('Retry-After', result.retryAfter.toString());
    }

    if (result.violation) {
      res.set('X-RateLimit-Violations', 'true');
    }

    if (result.banApplied) {
      res.set('X-RateLimit-Banned', 'true');
      if (result.banDuration) {
        res.set('X-RateLimit-Ban-Duration', result.banDuration.toString());
      }
    }

    // Add custom headers
    if (this.options.customHeaders) {
      for (const [key, value] of Object.entries(this.options.customHeaders)) {
        res.set(key, value);
      }
    }
  }

  /**
   * Default limit reached handler
   * @param req - Express request
   * @param res - Express response
   * @param info - Rate limit info
   */
  private defaultOnLimitReached = (req: Request, _res: Response, _info: RateLimitResult): void => {
    // Log the rate limit violation
    console.warn(`Rate limit exceeded for IP ${this.extractIP(req)} on endpoint ${req.path}`);
  };

  /**
   * Default ban applied handler
   * @param req - Express request
   * @param res - Express response
   * @param banInfo - Ban information
   */
  private defaultOnBanApplied = (_req: Request, _res: Response, banInfo: any): void => {
    // Log the ban application
    console.warn(`IP ${banInfo.ip} has been banned for ${banInfo.reason}`);
  };

  /**
   * Create a custom rate limit middleware for specific endpoints
   * @param endpoint - Endpoint pattern
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createEndpointMiddleware(
    rateLimiter: RateLimiter,
    endpoint: string,
    options: MiddlewareOptions = {}
  ) {
    const middleware = new RateLimitMiddleware(rateLimiter, options);
    
    return (req: Request, res: Response, next: NextFunction): void => {
      // Check if request matches endpoint pattern
      if (this.matchesEndpoint(req.path, endpoint)) {
        middleware.middleware()(req, res, next);
      } else {
        // Skip rate limiting for this endpoint
        next();
      }
    };
  }

  /**
   * Check if request path matches endpoint pattern
   * @param path - Request path
   * @param pattern - Endpoint pattern
   * @returns True if matches
   */
  private static matchesEndpoint(path: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced
    if (pattern === '*') {
      return true;
    }

    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    }

    return path === pattern;
  }

  /**
   * Create a user-specific rate limit middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createUserMiddleware(
    rateLimiter: RateLimiter,
    options: MiddlewareOptions = {}
  ) {
    const middleware = new RateLimitMiddleware(rateLimiter, {
      ...options,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) {
          throw new Error('User ID not found in request');
        }
        return `user:${userId}`;
      },
    });

    return middleware.middleware();
  }

  /**
   * Create an API key-based rate limit middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createAPIKeyMiddleware(
    rateLimiter: RateLimiter,
    options: MiddlewareOptions = {}
  ) {
    const middleware = new RateLimitMiddleware(rateLimiter, {
      ...options,
      keyGenerator: (req: Request) => {
        const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');
        if (!apiKey) {
          throw new Error('API key not found in request');
        }
        return `api:${apiKey}`;
      },
    });

    return middleware.middleware();
  }

  /**
   * Create a custom key-based rate limit middleware
   * @param rateLimiter - Rate limiter instance
   * @param keyExtractor - Function to extract key from request
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createCustomKeyMiddleware(
    rateLimiter: RateLimiter,
    keyExtractor: (req: Request) => string,
    options: MiddlewareOptions = {}
  ) {
    const middleware = new RateLimitMiddleware(rateLimiter, {
      ...options,
      keyGenerator: keyExtractor,
    });

    return middleware.middleware();
  }

  /**
   * Get the current options
   * @returns Current options
   */
  getOptions(): MiddlewareOptions {
    return { ...this.options };
  }

  /**
   * Update options
   * @param newOptions - New options
   */
  updateOptions(newOptions: Partial<MiddlewareOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get the rate limiter instance
   * @returns Rate limiter instance
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}
