import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../core/RateLimiter';
import { BanError } from '../errors/BanError';
import { IPUtils } from '../utils/IPUtils';

export class BlacklistMiddleware {
  private rateLimiter: RateLimiter;
  private options: {
    immediateBlock?: boolean;
    customHeaders?: Record<string, string>;
    onBlacklistDetected?: (req: Request, res: Response, ipInfo: any) => void;
  };

  constructor(rateLimiter: RateLimiter, options: {
    immediateBlock?: boolean;
    customHeaders?: Record<string, string>;
    onBlacklistDetected?: (req: Request, res: Response, ipInfo: any) => void;
  } = {}) {
    this.rateLimiter = rateLimiter;
    this.options = {
      immediateBlock: true,
      customHeaders: {},
      onBlacklistDetected: this.defaultOnBlacklistDetected,
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

        // Check if IP is blacklisted
        const ipInfo = await this.rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isBlacklisted) {
          // Set blacklist headers
          this.setBlacklistHeaders(res, ipInfo);

          // Call custom handler if provided
          if (this.options.onBlacklistDetected) {
            this.options.onBlacklistDetected(req, res, ipInfo);
          }

          // Add custom headers
          if (this.options.customHeaders) {
            for (const [key, value] of Object.entries(this.options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Block the request if immediate block is enabled
          if (this.options.immediateBlock) {
            const error = new BanError('IP address is blacklisted', ip, 'blacklisted');
            return next(error);
          }
        }

        // Continue to next middleware
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
   * Set blacklist-related headers on response
   * @param res - Express response
   * @param ipInfo - IP information
   */
  private setBlacklistHeaders(res: Response, ipInfo: any): void {
    res.set('X-Blacklist-Status', 'blacklisted');
    res.set('X-Blacklist-Block', 'true');
    
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

    if (ipInfo.isVpn) {
      res.set('X-IP-VPN', 'true');
    }

    if (ipInfo.isProxy) {
      res.set('X-IP-Proxy', 'true');
    }

    if (ipInfo.isTor) {
      res.set('X-IP-Tor', 'true');
    }
  }

  /**
   * Default blacklist detected handler
   * @param req - Express request
   * @param res - Express response
   * @param ipInfo - IP information
   */
  private defaultOnBlacklistDetected = (req: Request, _res: Response, ipInfo: any): void => {
    // Log the blacklist detection
    console.warn(`Blacklisted IP ${ipInfo.ip} attempted to access ${req.path}`);
  };

  /**
   * Create a country-based blacklist middleware
   * @param rateLimiter - Rate limiter instance
   * @param blockedCountries - Array of blocked country codes
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createCountryBlacklistMiddleware(
    rateLimiter: RateLimiter,
    blockedCountries: string[],
    options: {
      immediateBlock?: boolean;
      customHeaders?: Record<string, string>;
      onCountryBlocked?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new BlacklistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.country && blockedCountries.includes(ipInfo.country)) {
          // Set country blacklist headers
          res.set('X-Country-Blacklist', 'blocked');
          res.set('X-Country-Code', ipInfo.country);

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onCountryBlocked) {
            options.onCountryBlocked(req, res, ipInfo);
          }

          // Block the request if immediate block is enabled
          if (options.immediateBlock !== false) {
            const error = new BanError('IP address is from a blocked country', ip, 'country_blocked');
            return next(error);
          }
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create an ISP-based blacklist middleware
   * @param rateLimiter - Rate limiter instance
   * @param blockedISPs - Array of blocked ISP names
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createISPBlacklistMiddleware(
    rateLimiter: RateLimiter,
    blockedISPs: string[],
    options: {
      immediateBlock?: boolean;
      customHeaders?: Record<string, string>;
      onISPBlocked?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new BlacklistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.isp && blockedISPs.some(blockedISP => 
          ipInfo.isp?.toLowerCase().includes(blockedISP.toLowerCase())
        )) {
          // Set ISP blacklist headers
          res.set('X-ISP-Blacklist', 'blocked');
          res.set('X-ISP-Name', ipInfo.isp);

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onISPBlocked) {
            options.onISPBlocked(req, res, ipInfo);
          }

          // Block the request if immediate block is enabled
          if (options.immediateBlock !== false) {
            const error = new BanError('IP address is from a blocked ISP', ip, 'isp_blocked');
            return next(error);
          }
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a VPN/Proxy detection middleware
   * @param rateLimiter - Rate limiter instance
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createVPNProxyDetectionMiddleware(
    rateLimiter: RateLimiter,
    options: {
      blockVPN?: boolean;
      blockProxy?: boolean;
      blockTor?: boolean;
      immediateBlock?: boolean;
      customHeaders?: Record<string, string>;
      onVPNDetected?: (req: Request, res: Response, ipInfo: any) => void;
      onProxyDetected?: (req: Request, res: Response, ipInfo: any) => void;
      onTorDetected?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new BlacklistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        let shouldBlock = false;
        let blockReason = '';

        // Check for VPN
        if (options.blockVPN && ipInfo.isVpn) {
          res.set('X-VPN-Detected', 'true');
          shouldBlock = true;
          blockReason = 'VPN detected';

          if (options.onVPNDetected) {
            options.onVPNDetected(req, res, ipInfo);
          }
        }

        // Check for Proxy
        if (options.blockProxy && ipInfo.isProxy) {
          res.set('X-Proxy-Detected', 'true');
          shouldBlock = true;
          blockReason = 'Proxy detected';

          if (options.onProxyDetected) {
            options.onProxyDetected(req, res, ipInfo);
          }
        }

        // Check for Tor
        if (options.blockTor && ipInfo.isTor) {
          res.set('X-Tor-Detected', 'true');
          shouldBlock = true;
          blockReason = 'Tor detected';

          if (options.onTorDetected) {
            options.onTorDetected(req, res, ipInfo);
          }
        }

        // Add custom headers
        if (options.customHeaders) {
          for (const [key, value] of Object.entries(options.customHeaders)) {
            res.set(key, value);
          }
        }

        // Block the request if any threat is detected
        if (shouldBlock && options.immediateBlock !== false) {
          const error = new BanError(`IP address blocked: ${blockReason}`, ip, 'threat_detected');
          return next(error);
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a threat score-based middleware
   * @param rateLimiter - Rate limiter instance
   * @param threatThreshold - Minimum threat score to block
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createThreatScoreMiddleware(
    rateLimiter: RateLimiter,
    threatThreshold: number,
    options: {
      immediateBlock?: boolean;
      customHeaders?: Record<string, string>;
      onHighThreatScore?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new BlacklistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.threatScore !== undefined && ipInfo.threatScore >= threatThreshold) {
          // Set threat score headers
          res.set('X-Threat-Score', ipInfo.threatScore.toString());
          res.set('X-Threat-Threshold', threatThreshold.toString());
          res.set('X-Threat-Blocked', 'true');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onHighThreatScore) {
            options.onHighThreatScore(req, res, ipInfo);
          }

          // Block the request if immediate block is enabled
          if (options.immediateBlock !== false) {
            const error = new BanError(
              `IP address blocked: high threat score (${ipInfo.threatScore})`,
              ip,
              'high_threat_score'
            );
            return next(error);
          }
        }

        next();
      } catch (error) {
        return next(error);
      }
    };
  }

  /**
   * Create a risk level-based middleware
   * @param rateLimiter - Rate limiter instance
   * @param blockedRiskLevels - Array of blocked risk levels
   * @param options - Middleware options
   * @returns Express middleware
   */
  static createRiskLevelMiddleware(
    rateLimiter: RateLimiter,
    blockedRiskLevels: string[],
    options: {
      immediateBlock?: boolean;
      customHeaders?: Record<string, string>;
      onHighRiskLevel?: (req: Request, res: Response, ipInfo: any) => void;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = new BlacklistMiddleware(rateLimiter).extractIP(req);
        if (!ip) {
          return next(new Error('Unable to extract IP address'));
        }

        const ipInfo = await rateLimiter.getIPManager().getIPInfo(ip, req.get('User-Agent'));
        
        if (ipInfo.riskLevel && blockedRiskLevels.includes(ipInfo.riskLevel)) {
          // Set risk level headers
          res.set('X-Risk-Level', ipInfo.riskLevel);
          res.set('X-Risk-Blocked', 'true');

          // Add custom headers
          if (options.customHeaders) {
            for (const [key, value] of Object.entries(options.customHeaders)) {
              res.set(key, value);
            }
          }

          // Call custom handler if provided
          if (options.onHighRiskLevel) {
            options.onHighRiskLevel(req, res, ipInfo);
          }

          // Block the request if immediate block is enabled
          if (options.immediateBlock !== false) {
            const error = new BanError(
              `IP address blocked: high risk level (${ipInfo.riskLevel})`,
              ip,
              'high_risk_level'
            );
            return next(error);
          }
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
