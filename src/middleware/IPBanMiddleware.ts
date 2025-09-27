import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../core/RateLimiter';
import { BanError } from '../errors/BanError';
import { IPUtils } from '../utils/IPUtils';

export class IPBanMiddleware {
  private rateLimiter: RateLimiter;
  private options: {
    skipWhitelisted?: boolean;
    skipBlacklisted?: boolean;
    customHeaders?: Record<string, string>;
    onBanDetected?: (req: Request, res: Response, banInfo: any) => void;
  };

  constructor(rateLimiter: RateLimiter, options: {
    skipWhitelisted?: boolean;
    skipBlacklisted?: boolean;
    customHeaders?: Record<string, string>;
    onBanDetected?: (req: Request, res: Response, banInfo: any) => void;
  } = {}) {
    this.rateLimiter = rateLimiter;
    this.options = {
      skipWhitelisted: true,
      skipBlacklisted: false,
      customHeaders: {},
      onBanDetected: this.defaultOnBanDetected,
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
          return next(new Error('Unable to extract IP address'));
        }

        // Check if IP is whitelisted
        if (this.options.skipWhitelisted) {
          const ipInfo = await this.rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
          if (ipInfo.isWhitelisted) {
            return next();
          }
        }

        // Check if IP is blacklisted
        if (!this.options.skipBlacklisted) {
          const ipInfo = await this.rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
          if (ipInfo.isBlacklisted) {
            const error = new BanError('IP address is blacklisted', ip, 'blacklisted');
            return next(error);
          }
        }

        // Check if IP is banned
        const banInfo = await this.rateLimiter.getBanInfo(ip);
        if (banInfo) {
          // Set custom headers
          this.setBanHeaders(res, banInfo);

          // Call custom handler if provided
          if (this.options.onBanDetected) {
            this.options.onBanDetected(req, res, banInfo);
          }

          // Send ban error
          const error = new BanError(
            'IP address is banned',
            ip,
            banInfo.reason,
            banInfo.expiresAt,
            banInfo.appealable,
            banInfo.appealUrl,
            banInfo.violationCount,
            banInfo.lastViolation
          );

          return next(error);
        }

        // IP is not banned, continue
        next();
      } catch (error) {
        return next(error);
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
   * Set ban-related headers on response
   * @param res - Express response
   * @param banInfo - Ban information
   */
  private setBanHeaders(res: Response, banInfo: any): void {
    res.set('X-Ban-Status', 'banned');
    res.set('X-Ban-Reason', banInfo.reason);
    res.set('X-Ban-Count', banInfo.violationCount.toString());
    res.set('X-Ban-Last-Violation', banInfo.lastViolation.toISOString());

    if (banInfo.expiresAt) {
      res.set('X-Ban-Expires', banInfo.expiresAt.toISOString());
    } else {
      res.set('X-Ban-Expires', 'permanent');
    }

    if (banInfo.appealable) {
      res.set('X-Ban-Appealable', 'true');
      if (banInfo.appealUrl) {
        res.set('X-Ban-Appeal-URL', banInfo.appealUrl);
      }
    } else {
      res.set('X-Ban-Appealable', 'false');
    }

    // Add custom headers
    if (this.options.customHeaders) {
      for (const [key, value] of Object.entries(this.options.customHeaders)) {
        res.set(key, value);
      }
    }
  }

  /**
   * Default ban detected handler
   * @param req - Express request
   * @param res - Express response
   * @param banInfo - Ban information
   */
  private defaultOnBanDetected = (req: Request, _res: Response, banInfo: any): void => {
    // Log the ban detection
    console.warn(`Banned IP ${banInfo.ip} attempted to access ${req.path}`);
  };

  /**
   * Create a whitelist-only middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createWhitelistMiddleware(
    rateLimiter: RateLimiter,
    options: {
      customHeaders?: Record<string, string>;
      onWhitelistBypass?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new IPBanMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isWhitelisted) {
          // Set whitelist headers
          res.set('X-Whitelist-Status', 'whitelisted');
          res.set('X-Whitelist-Bypass', 'true');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onWhitelistBypass) {
            options.onWhitelistBypass(req, res, ipInfo);
          }

          return next();
        }

        // IP is not whitelisted, continue with normal processing
        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a blacklist-only middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createBlacklistMiddleware(
    rateLimiter: RateLimiter,
    options: {
      customHeaders?: Record<string, string>;
      onBlacklistDetected?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new IPBanMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isBlacklisted) {
          // Set blacklist headers
          res.set('X-Blacklist-Status', 'blacklisted');
          res.set('X-Blacklist-Block', 'true');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onBlacklistDetected) {
            options.onBlacklistDetected(req, res, ipInfo);
          }

          const error = new BanError('IP address is blacklisted', ip, 'blacklisted');
          return next(error);
        }

        // IP is not blacklisted, continue
        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a combined whitelist/blacklist middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createCombinedMiddleware(
    rateLimiter: RateLimiter,
    options: {
      skipWhitelisted?: boolean;
      skipBlacklisted?: boolean;
      customHeaders?: Record<string, string>;
      onWhitelistBypass?: (req: Request, res: Response, ipInfo: any) => void;
      onBlacklistDetected?: (req: Request, res: Response, ipInfo: any) => void;
      onBanDetected?: (req: Request, res: Response, banInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new IPBanMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));

        // Check whitelist first
        if (ipInfo.isWhitelisted && options.skipWhitelisted !== false) {
          res.set('X-Whitelist-Status', 'whitelisted');
          res.set('X-Whitelist-Bypass', 'true');

          if (options.onWhitelistBypass) {
            options.onWhitelistBypass(req, res, ipInfo);
          }

          return next();
        }

        // Check blacklist
        if (ipInfo.isBlacklisted && options.skipBlacklisted !== true) {
          res.set('X-Blacklist-Status', 'blacklisted');
          res.set('X-Blacklist-Block', 'true');

          if (options.onBlacklistDetected) {
            options.onBlacklistDetected(req, res, ipInfo);
          }

          const error = new BanError('IP address is blacklisted', ip, 'blacklisted');
          return next(error);
        }

        // Check ban status
        const banInfo = await rateLimiter.getBanInfo(ip);
        if (banInfo) {
          res.set('X-Ban-Status', 'banned');
          res.set('X-Ban-Reason', banInfo.reason);

          if (options.onBanDetected) {
            options.onBanDetected(req, res, banInfo);
          }

          const error = new BanError(
            'IP address is banned',
            ip,
            banInfo.reason,
            banInfo.expiresAt,
            banInfo.appealable,
            banInfo.appealUrl,
            banInfo.violationCount,
            banInfo.lastViolation
          );

          return next(error);
        }

        // Add custom headers
        if (options.customHeaders) {
          for (const [key, value] of Object.entries(options.customHeaders)) {
            res.set(key, value);
          }
        }

        // IP is clean, continue
        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Get the current options
   * @returns Current options
   */
  getOptions(): any {
    return { ...this.options };
  }

  /**
   * Update options
   * @param newOptions - New options
   */
  updateOptions(newOptions: Partial<typeof this.options>): void {
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
