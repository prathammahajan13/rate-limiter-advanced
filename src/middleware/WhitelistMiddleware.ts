import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../core/RateLimiter';
import { IPUtils } from '../utils/IPUtils';

export class WhitelistMiddleware {
  private rateLimiter: RateLimiter;
  private options: {
    bypassRateLimit?: boolean;
    customHeaders?: Record<string, string>;
    onWhitelistBypass?: (req: Request, res: Response, ipInfo: any) => void;
  };

  constructor(rateLimiter: RateLimiter, options: {
    bypassRateLimit?: boolean;
    customHeaders?: Record<string, string>;
    onWhitelistBypass?: (req: Request, res: Response, ipInfo: any) => void;
  } = {}) {
    this.rateLimiter = rateLimiter;
    this.options = {
      bypassRateLimit: true,
      customHeaders: {},
      onWhitelistBypass: this.defaultOnWhitelistBypass,
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
        const ipInfo = await this.rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isWhitelisted) {
          // Set whitelist headers
          this.setWhitelistHeaders(res, ipInfo);

          // Call custom handler if provided
          if (this.options.onWhitelistBypass) {
            this.options.onWhitelistBypass(req, res, ipInfo);
          }

          // Add custom headers
          if (this.options.customHeaders) {
            for (const [key, value] of Object.entries(this.options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Continue to next middleware
          next();
        } else {
          // IP is not whitelisted, continue with normal processing
          next();
        }
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
   * Set whitelist-related headers on response
   * @param res - Express response
   * @param ipInfo - IP information
   */
  private setWhitelistHeaders(res: Response, ipInfo: any): void {
    res.set('X-Whitelist-Status', 'whitelisted');
    res.set('X-Whitelist-Bypass', 'true');
    
    if (this.options.bypassRateLimit) {
      res.set('X-RateLimit-Bypass', 'whitelist');
    }

    if (ipInfo.country) {
      res.set('X-IP-Country', ipInfo.country);
    }

    if (ipInfo.isp) {
      res.set('X-IP-ISP', ipInfo.isp);
    }

    if (ipInfo.threatScore !== undefined) {
      res.set('X-IP-Threat-Score', ipInfo.threatScore.toString());
    }

    if (ipInfo.riskLevel) {
      res.set('X-IP-Risk-Level', ipInfo.riskLevel);
    }
  }

  /**
   * Default whitelist bypass handler
   * @param req - Express request
   * @param res - Express response
   * @param ipInfo - IP information
   */
  private defaultOnWhitelistBypass = (req: Request, _res: Response, ipInfo: any): void => {
    // Log the whitelist bypass
    console.info(`Whitelisted IP ${ipInfo.ip} bypassed rate limiting for ${req.path}`);
  };

  /**
   * Create a rate limit bypass middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createBypassMiddleware(
    rateLimiter: RateLimiter,
    options: {
      customHeaders?: Record<string, string>;
      onBypass?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new WhitelistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isWhitelisted) {
          // Set bypass headers
          res.set('X-RateLimit-Bypass', 'whitelist');
          res.set('X-Whitelist-Status', 'whitelisted');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onBypass) {
            options.onBypass(req, res, ipInfo);
          }

          // Skip rate limiting by setting a flag
          (req as any).skipRateLimit = true;
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a trusted source middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createTrustedSourceMiddleware(
    rateLimiter: RateLimiter,
    options: {
      customHeaders?: Record<string, string>;
      onTrustedSource?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new WhitelistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isWhitelisted) {
          // Set trusted source headers
          res.set('X-Trusted-Source', 'true');
          res.set('X-Source-Type', 'whitelist');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onTrustedSource) {
            options.onTrustedSource(req, res, ipInfo);
          }

          // Mark as trusted source
          (req as any).isTrustedSource = true;
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a country-based whitelist middleware
   * @param rateLimiter - Rate limiter instance
   * @param allowedCountries - Array of allowed country codes
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createCountryWhitelistMiddleware(
    rateLimiter: RateLimiter,
    allowedCountries: string[],
    options: {
      customHeaders?: Record<string, string>;
      onCountryAllowed?: (req: Request, res: Response, ipInfo: any) => void;
      onCountryBlocked?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new WhitelistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.country && allowedCountries.includes(ipInfo.country)) {
          // Set country whitelist headers
          res.set('X-Country-Whitelist', 'allowed');
          res.set('X-Country-Code', ipInfo.country);

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onCountryAllowed) {
            options.onCountryAllowed(req, res, ipInfo);
          }

          // Mark as country whitelisted
          (req as any).isCountryWhitelisted = true;
        } else {
          // Set country block headers
          res.set('X-Country-Whitelist', 'blocked');
          if (ipInfo.country) {
            res.set('X-Country-Code', ipInfo.country);
          }

          // Call custom handler if provided
          if (options.onCountryBlocked) {
            options.onCountryBlocked(req, res, ipInfo);
          }

          // Mark as country blocked
          (req as any).isCountryBlocked = true;
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create an ISP-based whitelist middleware
   * @param rateLimiter - Rate limiter instance
   * @param allowedISPs - Array of allowed ISP names
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createISPWhitelistMiddleware(
    rateLimiter: RateLimiter,
    allowedISPs: string[],
    options: {
      customHeaders?: Record<string, string>;
      onISPAllowed?: (req: Request, res: Response, ipInfo: any) => void;
      onISPBlocked?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new WhitelistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isp && allowedISPs.some(allowedISP => 
          ipInfo.isp?.toLowerCase().includes(allowedISP.toLowerCase())
        )) {
          // Set ISP whitelist headers
          res.set('X-ISP-Whitelist', 'allowed');
          res.set('X-ISP-Name', ipInfo.isp);

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onISPAllowed) {
            options.onISPAllowed(req, res, ipInfo);
          }

          // Mark as ISP whitelisted
          (req as any).isISPWhitelisted = true;
        } else {
          // Set ISP block headers
          res.set('X-ISP-Whitelist', 'blocked');
          if (ipInfo.isp) {
            res.set('X-ISP-Name', ipInfo.isp);
          }

          // Call custom handler if provided
          if (options.onISPBlocked) {
            options.onISPBlocked(req, res, ipInfo);
          }

          // Mark as ISP blocked
          (req as any).isISPBlocked = true;
        }

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
