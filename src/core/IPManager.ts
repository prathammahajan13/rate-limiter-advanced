import { EventEmitter } from 'events';
import { WhitelistConfig, BlacklistConfig, IPInfo, GeolocationData } from '../types/RateLimitTypes';
import { IPUtils } from '../utils/IPUtils';
import * as geoip from 'geoip-lite';
// import UserAgent from 'user-agents'; // Unused import

export class IPManager extends EventEmitter {
  private whitelistConfig: WhitelistConfig;
  private blacklistConfig: BlacklistConfig;

  constructor(whitelistConfig: WhitelistConfig, blacklistConfig: BlacklistConfig) {
    super();
    this.whitelistConfig = whitelistConfig;
    this.blacklistConfig = blacklistConfig;
  }

  /**
   * Get comprehensive IP information including geolocation and threat assessment
   * @param ip - IP address
   * @param userAgent - User agent string (optional)
   * @returns IP information
   */
  async getIPInfo(ip: string, userAgent?: string): Promise<IPInfo> {
    if (!IPUtils.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    try {
      const geolocation = this.getGeolocation(ip);
      const isWhitelisted = this.isWhitelisted(ip, geolocation || undefined);
      const isBlacklisted = this.isBlacklisted(ip, geolocation || undefined);
      const threatAssessment = await this.assessThreat(ip, userAgent, geolocation || undefined);

      return {
        ip,
        country: geolocation?.country || undefined,
        region: geolocation?.region || undefined,
        city: geolocation?.city || undefined,
        isp: geolocation?.isp || undefined,
        isVpn: threatAssessment.isVpn,
        isProxy: threatAssessment.isProxy,
        isTor: threatAssessment.isTor,
        userAgent: userAgent || '',
        fingerprint: this.generateFingerprint(ip, userAgent, geolocation || undefined),
        geolocation: geolocation || undefined,
        isWhitelisted,
        isBlacklisted,
        threatScore: threatAssessment.threatScore,
        riskLevel: threatAssessment.riskLevel,
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check if an IP is whitelisted
   * @param ip - IP address
   * @param geolocation - Geolocation data (optional)
   * @returns True if whitelisted
   */
  isWhitelisted(ip: string, geolocation?: GeolocationData): boolean {
    if (!this.whitelistConfig.enabled) {
      return false;
    }

    try {
      // Check IP whitelist
      if (this.whitelistConfig.ips?.includes(ip)) {
        return true;
      }

      // Check IP range whitelist
      if (this.whitelistConfig.ranges) {
        for (const range of this.whitelistConfig.ranges) {
          if (IPUtils.isIPInCIDR(ip, range)) {
            return true;
          }
        }
      }

      // Check country whitelist
      if (geolocation?.country && this.whitelistConfig.countries?.includes(geolocation.country)) {
        return true;
      }

      // Check ISP whitelist
      if (geolocation?.isp && this.whitelistConfig.isps?.includes(geolocation.isp)) {
        return true;
      }

      return false;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Check if an IP is blacklisted
   * @param ip - IP address
   * @param geolocation - Geolocation data (optional)
   * @returns True if blacklisted
   */
  isBlacklisted(ip: string, geolocation?: GeolocationData): boolean {
    if (!this.blacklistConfig.enabled) {
      return false;
    }

    try {
      // Check IP blacklist
      if (this.blacklistConfig.ips?.includes(ip)) {
        return true;
      }

      // Check IP range blacklist
      if (this.blacklistConfig.ranges) {
        for (const range of this.blacklistConfig.ranges) {
          if (IPUtils.isIPInCIDR(ip, range)) {
            return true;
          }
        }
      }

      // Check country blacklist
      if (geolocation?.country && this.blacklistConfig.countries?.includes(geolocation.country)) {
        return true;
      }

      // Check ISP blacklist
      if (geolocation?.isp && this.blacklistConfig.isps?.includes(geolocation.isp)) {
        return true;
      }

      return false;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get geolocation information for an IP
   * @param ip - IP address
   * @returns Geolocation data or null
   */
  private getGeolocation(ip: string): GeolocationData | null {
    try {
      const geo = geoip.lookup(ip);
      if (!geo) {
        return null;
      }

          return {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            latitude: geo.ll?.[0],
            longitude: geo.ll?.[1],
            timezone: geo.timezone,
            isp: undefined, // geoip-lite doesn't provide ISP info
            organization: undefined, // geoip-lite doesn't provide organization info
            as: undefined, // geoip-lite doesn't provide AS info
            asname: undefined, // geoip-lite doesn't provide AS name info
            mobile: undefined, // geoip-lite doesn't provide mobile info
            proxy: undefined, // geoip-lite doesn't provide proxy info
            hosting: undefined, // geoip-lite doesn't provide hosting info
          };
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Assess threat level for an IP
   * @param ip - IP address
   * @param userAgent - User agent string (optional)
   * @param geolocation - Geolocation data (optional)
   * @returns Threat assessment
   */
  private async assessThreat(
    ip: string,
    userAgent?: string,
    geolocation?: GeolocationData
  ): Promise<{
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
    threatScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    let threatScore = 0;
    let isVpn = false;
    let isProxy = false;
    let isTor = false;

    try {
      // Check if IP is private (lower threat)
      if (IPUtils.isPrivateIP(ip)) {
        threatScore -= 10;
      }

      // Check geolocation-based threats
      if (geolocation) {
        // Check for proxy/hosting indicators
        if (geolocation.proxy) {
          isProxy = true;
          threatScore += 30;
        }

        if (geolocation.hosting) {
          threatScore += 20;
        }

        // Check for high-risk countries (this would be configurable)
        const highRiskCountries = ['CN', 'RU', 'KP', 'IR']; // Example list
        if (geolocation.country && highRiskCountries.includes(geolocation.country)) {
          threatScore += 15;
        }

        // Check for known VPN/Proxy ISPs
        const vpnIsps = ['VPN', 'Proxy', 'Tor', 'Anonymous'];
        if (geolocation.isp) {
          for (const vpnIsp of vpnIsps) {
            if (geolocation.isp.toLowerCase().includes(vpnIsp.toLowerCase())) {
              isVpn = true;
              threatScore += 25;
              break;
            }
          }
        }
      }

      // Check user agent for bot indicators
      if (userAgent) {
        const botPatterns = [
          'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
          'python', 'java', 'php', 'go-http', 'okhttp'
        ];

        const lowerUserAgent = userAgent.toLowerCase();
        for (const pattern of botPatterns) {
          if (lowerUserAgent.includes(pattern)) {
            threatScore += 20;
            break;
          }
        }

        // Check for suspicious user agent patterns
        if (lowerUserAgent.length < 10 || lowerUserAgent.length > 500) {
          threatScore += 15;
        }

        // Check for missing or suspicious browser indicators
        const browserIndicators = ['mozilla', 'chrome', 'safari', 'firefox', 'edge'];
        const hasBrowserIndicator = browserIndicators.some(indicator => 
          lowerUserAgent.includes(indicator)
        );
        
        if (!hasBrowserIndicator && lowerUserAgent.length > 0) {
          threatScore += 10;
        }
      }

      // Check for Tor exit nodes (simplified check)
      if (this.isTorExitNode(ip)) {
        isTor = true;
        threatScore += 40;
      }

      // Normalize threat score to 0-100 range
      threatScore = Math.max(0, Math.min(100, threatScore));

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (threatScore >= 80) {
        riskLevel = 'critical';
      } else if (threatScore >= 60) {
        riskLevel = 'high';
      } else if (threatScore >= 30) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      return {
        isVpn,
        isProxy,
        isTor,
        threatScore,
        riskLevel,
      };
    } catch (error) {
      this.emit('error', error);
      return {
        isVpn: false,
        isProxy: false,
        isTor: false,
        threatScore: 0,
        riskLevel: 'low',
      };
    }
  }

  /**
   * Check if an IP is a Tor exit node (simplified implementation)
   * @param ip - IP address
   * @returns True if likely a Tor exit node
   */
  private isTorExitNode(ip: string): boolean {
    // This is a simplified check. In production, you would:
    // 1. Maintain a list of known Tor exit nodes
    // 2. Use a service like TorDNSEL
    // 3. Check against Tor Project's exit node list
    
    // For now, we'll use some heuristics
    try {
      // Check if IP is in known Tor exit node ranges
      const torRanges = [
        '185.220.100.0/22', // Example Tor range
        '185.220.101.0/24',
        '185.220.102.0/24',
        '185.220.103.0/24',
      ];

      for (const range of torRanges) {
        if (IPUtils.isIPInCIDR(ip, range)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a fingerprint for an IP and user agent combination
   * @param ip - IP address
   * @param userAgent - User agent string (optional)
   * @param geolocation - Geolocation data (optional)
   * @returns Fingerprint string
   */
  private generateFingerprint(ip: string, userAgent?: string, geolocation?: GeolocationData): string {
    try {
      const components = [
        ip,
        userAgent || '',
        geolocation?.country || '',
        geolocation?.isp || '',
      ];

      const fingerprint = components.join('|');
      return Buffer.from(fingerprint).toString('base64');
    } catch (error) {
      this.emit('error', error);
      return '';
    }
  }

  /**
   * Add an IP to the whitelist
   * @param ip - IP address to whitelist
   */
  addToWhitelist(ip: string): void {
    if (!IPUtils.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    if (!this.whitelistConfig.ips) {
      this.whitelistConfig.ips = [];
    }

    if (!this.whitelistConfig.ips.includes(ip)) {
      this.whitelistConfig.ips.push(ip);
      this.emit('ipWhitelisted', { ip });
    }
  }

  /**
   * Remove an IP from the whitelist
   * @param ip - IP address to remove from whitelist
   */
  removeFromWhitelist(ip: string): void {
    if (this.whitelistConfig.ips) {
      const index = this.whitelistConfig.ips.indexOf(ip);
      if (index > -1) {
        this.whitelistConfig.ips.splice(index, 1);
        this.emit('ipRemovedFromWhitelist', { ip });
      }
    }
  }

  /**
   * Add an IP to the blacklist
   * @param ip - IP address to blacklist
   */
  addToBlacklist(ip: string): void {
    if (!IPUtils.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    if (!this.blacklistConfig.ips) {
      this.blacklistConfig.ips = [];
    }

    if (!this.blacklistConfig.ips.includes(ip)) {
      this.blacklistConfig.ips.push(ip);
      this.emit('ipBlacklisted', { ip });
    }
  }

  /**
   * Remove an IP from the blacklist
   * @param ip - IP address to remove from blacklist
   */
  removeFromBlacklist(ip: string): void {
    if (this.blacklistConfig.ips) {
      const index = this.blacklistConfig.ips.indexOf(ip);
      if (index > -1) {
        this.blacklistConfig.ips.splice(index, 1);
        this.emit('ipRemovedFromBlacklist', { ip });
      }
    }
  }

  /**
   * Add a CIDR range to the whitelist
   * @param cidr - CIDR range to whitelist
   */
  addRangeToWhitelist(cidr: string): void {
    if (!IPUtils.isValidCIDR(cidr)) {
      throw new Error(`Invalid CIDR range: ${cidr}`);
    }

    if (!this.whitelistConfig.ranges) {
      this.whitelistConfig.ranges = [];
    }

    if (!this.whitelistConfig.ranges.includes(cidr)) {
      this.whitelistConfig.ranges.push(cidr);
      this.emit('rangeWhitelisted', { cidr });
    }
  }

  /**
   * Add a CIDR range to the blacklist
   * @param cidr - CIDR range to blacklist
   */
  addRangeToBlacklist(cidr: string): void {
    if (!IPUtils.isValidCIDR(cidr)) {
      throw new Error(`Invalid CIDR range: ${cidr}`);
    }

    if (!this.blacklistConfig.ranges) {
      this.blacklistConfig.ranges = [];
    }

    if (!this.blacklistConfig.ranges.includes(cidr)) {
      this.blacklistConfig.ranges.push(cidr);
      this.emit('rangeBlacklisted', { cidr });
    }
  }

  /**
   * Get whitelist configuration
   * @returns Whitelist configuration
   */
  getWhitelistConfig(): WhitelistConfig {
    return { ...this.whitelistConfig };
  }

  /**
   * Get blacklist configuration
   * @returns Blacklist configuration
   */
  getBlacklistConfig(): BlacklistConfig {
    return { ...this.blacklistConfig };
  }

  /**
   * Update whitelist configuration
   * @param config - New whitelist configuration
   */
  updateWhitelistConfig(config: Partial<WhitelistConfig>): void {
    this.whitelistConfig = { ...this.whitelistConfig, ...config };
    this.emit('whitelistConfigUpdated', { config: this.whitelistConfig });
  }

  /**
   * Update blacklist configuration
   * @param config - New blacklist configuration
   */
  updateBlacklistConfig(config: Partial<BlacklistConfig>): void {
    this.blacklistConfig = { ...this.blacklistConfig, ...config };
    this.emit('blacklistConfigUpdated', { config: this.blacklistConfig });
  }

  /**
   * Get all whitelisted IPs
   * @returns Array of whitelisted IPs
   */
  getWhitelistedIPs(): string[] {
    return [...(this.whitelistConfig.ips || [])];
  }

  /**
   * Get all blacklisted IPs
   * @returns Array of blacklisted IPs
   */
  getBlacklistedIPs(): string[] {
    return [...(this.blacklistConfig.ips || [])];
  }

  /**
   * Get all whitelisted ranges
   * @returns Array of whitelisted CIDR ranges
   */
  getWhitelistedRanges(): string[] {
    return [...(this.whitelistConfig.ranges || [])];
  }

  /**
   * Get all blacklisted ranges
   * @returns Array of blacklisted CIDR ranges
   */
  getBlacklistedRanges(): string[] {
    return [...(this.blacklistConfig.ranges || [])];
  }

  /**
   * Check if an IP matches any whitelisted range
   * @param ip - IP address to check
   * @returns True if IP matches any whitelisted range
   */
  isIPInWhitelistedRange(ip: string): boolean {
    if (!this.whitelistConfig.ranges) {
      return false;
    }

    for (const range of this.whitelistConfig.ranges) {
      if (IPUtils.isIPInCIDR(ip, range)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an IP matches any blacklisted range
   * @param ip - IP address to check
   * @returns True if IP matches any blacklisted range
   */
  isIPInBlacklistedRange(ip: string): boolean {
    if (!this.blacklistConfig.ranges) {
      return false;
    }

    for (const range of this.blacklistConfig.ranges) {
      if (IPUtils.isIPInCIDR(ip, range)) {
        return true;
      }
    }

    return false;
  }
}
