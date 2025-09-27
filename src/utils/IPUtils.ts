import { createHash } from 'crypto';

export class IPUtils {
  /**
   * Validate if a string is a valid IPv4 address
   * @param ip - IP address to validate
   * @returns True if valid IPv4
   */
  static isValidIPv4(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    const parts = ip.split('.');
    if (parts.length !== 4) {
      return false;
    }

    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * Validate if a string is a valid IPv6 address
   * @param ip - IP address to validate
   * @returns True if valid IPv6
   */
  static isValidIPv6(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    // More comprehensive IPv6 validation
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Validate if a string is a valid IP address (IPv4 or IPv6)
   * @param ip - IP address to validate
   * @returns True if valid IP
   */
  static isValidIP(ip: string): boolean {
    return this.isValidIPv4(ip) || this.isValidIPv6(ip);
  }

  /**
   * Get the IP version (4 or 6)
   * @param ip - IP address
   * @returns IP version or null if invalid
   */
  static getIPVersion(ip: string): number | null {
    if (this.isValidIPv4(ip)) {
      return 4;
    }
    if (this.isValidIPv6(ip)) {
      return 6;
    }
    return null;
  }

  /**
   * Normalize an IP address (remove leading zeros, convert to lowercase for IPv6)
   * @param ip - IP address to normalize
   * @returns Normalized IP address
   */
  static normalizeIP(ip: string): string {
    if (!this.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    if (this.isValidIPv4(ip)) {
      return ip.split('.').map(part => parseInt(part, 10).toString()).join('.');
    }

    // For IPv6, convert to lowercase
    return ip.toLowerCase();
  }

  /**
   * Check if an IP address is in a CIDR range
   * @param ip - IP address to check
   * @param cidr - CIDR range (e.g., '192.168.1.0/24')
   * @returns True if IP is in range
   */
  static isIPInCIDR(ip: string, cidr: string): boolean {
    if (!this.isValidIP(ip)) {
      return false;
    }

    const [network, prefixLength] = cidr.split('/');
    if (!network || !prefixLength) {
      return false;
    }

    const prefix = parseInt(prefixLength, 10);
    if (isNaN(prefix) || prefix < 0) {
      return false;
    }

    const ipVersion = this.getIPVersion(ip);
    const networkVersion = this.getIPVersion(network);

    if (ipVersion !== networkVersion) {
      return false;
    }

    if (ipVersion === 4) {
      return this.isIPv4InCIDR(ip, network, prefix);
    } else {
      return this.isIPv6InCIDR(ip, network, prefix);
    }
  }

  /**
   * Check if an IPv4 address is in a CIDR range
   * @param ip - IPv4 address
   * @param network - Network address
   * @param prefixLength - Prefix length
   * @returns True if IP is in range
   */
  private static isIPv4InCIDR(ip: string, network: string, prefixLength: number): boolean {
    if (prefixLength > 32) {
      return false;
    }

    const ipNum = this.ipv4ToNumber(ip);
    const networkNum = this.ipv4ToNumber(network);
    const mask = this.getIPv4Mask(prefixLength);

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Check if an IPv6 address is in a CIDR range
   * @param ip - IPv6 address
   * @param network - Network address
   * @param prefixLength - Prefix length
   * @returns True if IP is in range
   */
  private static isIPv6InCIDR(ip: string, network: string, prefixLength: number): boolean {
    if (prefixLength > 128) {
      return false;
    }

    const ipNum = this.ipv6ToNumber(ip);
    const networkNum = this.ipv6ToNumber(network);
    const mask = this.getIPv6Mask(prefixLength);

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Convert IPv4 address to number
   * @param ip - IPv4 address
   * @returns Number representation
   */
  private static ipv4ToNumber(ip: string): number {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    return (parts[0]! << 24) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
  }

  /**
   * Convert IPv6 address to BigInt
   * @param ip - IPv6 address
   * @returns BigInt representation
   */
  private static ipv6ToNumber(ip: string): bigint {
    // Simplified IPv6 to number conversion
    // This is a basic implementation and may not handle all edge cases
    const parts = ip.split(':');
    let result = 0n;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] || '0';
      const num = parseInt(part, 16);
      result = (result << 16n) + BigInt(num);
    }
    
    return result;
  }

  /**
   * Get IPv4 subnet mask
   * @param prefixLength - Prefix length
   * @returns Subnet mask
   */
  private static getIPv4Mask(prefixLength: number): number {
    return (0xffffffff << (32 - prefixLength)) >>> 0;
  }

  /**
   * Get IPv6 subnet mask
   * @param prefixLength - Prefix length
   * @returns Subnet mask
   */
  private static getIPv6Mask(prefixLength: number): bigint {
    return (0xffffffffffffffffffffffffffffffffn << (128n - BigInt(prefixLength))) & 0xffffffffffffffffffffffffffffffffn;
  }

  /**
   * Check if an IP address is private
   * @param ip - IP address to check
   * @returns True if private
   */
  static isPrivateIP(ip: string): boolean {
    if (!this.isValidIP(ip)) {
      return false;
    }

    if (this.isValidIPv4(ip)) {
      return this.isPrivateIPv4(ip);
    } else {
      return this.isPrivateIPv6(ip);
    }
  }

  /**
   * Check if an IPv4 address is private
   * @param ip - IPv4 address
   * @returns True if private
   */
  private static isPrivateIPv4(ip: string): boolean {
    const privateRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '127.0.0.0/8',
      '169.254.0.0/16',
    ];

    return privateRanges.some(range => this.isIPInCIDR(ip, range));
  }

  /**
   * Check if an IPv6 address is private
   * @param ip - IPv6 address
   * @returns True if private
   */
  private static isPrivateIPv6(ip: string): boolean {
    const privateRanges = [
      '::1/128',
      'fc00::/7',
      'fe80::/10',
    ];

    return privateRanges.some(range => this.isIPInCIDR(ip, range));
  }

  /**
   * Check if an IP address is public
   * @param ip - IP address to check
   * @returns True if public
   */
  static isPublicIP(ip: string): boolean {
    return this.isValidIP(ip) && !this.isPrivateIP(ip);
  }

  /**
   * Generate a hash of an IP address for anonymization
   * @param ip - IP address to hash
   * @param algorithm - Hash algorithm (default: 'sha256')
   * @returns Hashed IP address
   */
  static hashIP(ip: string, algorithm: string = 'sha256'): string {
    if (!this.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    return createHash(algorithm).update(ip).digest('hex');
  }

  /**
   * Anonymize an IP address by masking the last octet (IPv4) or last 64 bits (IPv6)
   * @param ip - IP address to anonymize
   * @returns Anonymized IP address
   */
  static anonymizeIP(ip: string): string {
    if (!this.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    if (this.isValidIPv4(ip)) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    } else {
      // For IPv6, mask the last 64 bits
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return parts.slice(0, 4).join(':') + '::';
      }
      return ip;
    }
  }

  /**
   * Extract IP address from various formats (with port, etc.)
   * @param input - Input string that may contain IP
   * @returns Extracted IP address or null
   */
  static extractIP(input: string): string | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Remove port if present
    const withoutPort = input.split(':')[0];
    
    // Check if it's a valid IP
    if (this.isValidIP(withoutPort!)) {
      return withoutPort!;
    }

    // Try to extract IP from various formats
    const ipv4Match = input.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipv4Match && this.isValidIPv4(ipv4Match[1]!)) {
      return ipv4Match[1]!;
    }

    const ipv6Match = input.match(/([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/);
    if (ipv6Match && this.isValidIPv6(ipv6Match[0]!)) {
      return ipv6Match[0]!;
    }

    return null;
  }

  /**
   * Get the network address from a CIDR range
   * @param cidr - CIDR range
   * @returns Network address
   */
  static getNetworkAddress(cidr: string): string {
    const [network] = cidr.split('/');
    if (!network) {
      throw new Error(`Invalid CIDR format: ${cidr}`);
    }
    return network;
  }

  /**
   * Get the prefix length from a CIDR range
   * @param cidr - CIDR range
   * @returns Prefix length
   */
  static getPrefixLength(cidr: string): number {
    const [, prefixLength] = cidr.split('/');
    if (!prefixLength) {
      throw new Error(`Invalid CIDR format: ${cidr}`);
    }
    
    const prefix = parseInt(prefixLength, 10);
    if (isNaN(prefix) || prefix < 0) {
      throw new Error(`Invalid prefix length: ${prefixLength}`);
    }
    
    return prefix;
  }

  /**
   * Validate a CIDR range
   * @param cidr - CIDR range to validate
   * @returns True if valid
   */
  static isValidCIDR(cidr: string): boolean {
    if (!cidr || typeof cidr !== 'string') {
      return false;
    }

    try {
      const [network, prefixLength] = cidr.split('/');
      if (!network || !prefixLength) {
        return false;
      }

      const prefix = parseInt(prefixLength, 10);
      if (isNaN(prefix) || prefix < 0) {
        return false;
      }

      const ipVersion = this.getIPVersion(network);
      if (!ipVersion) {
        return false;
      }

      const maxPrefix = ipVersion === 4 ? 32 : 128;
      return prefix <= maxPrefix;
    } catch {
      return false;
    }
  }

  /**
   * Get all IP addresses in a CIDR range
   * @param cidr - CIDR range
   * @returns Array of IP addresses (limited for large ranges)
   */
  static getIPsInCIDR(cidr: string, limit: number = 1000): string[] {
    if (!this.isValidCIDR(cidr)) {
      throw new Error(`Invalid CIDR range: ${cidr}`);
    }

    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength!, 10);
    const ipVersion = this.getIPVersion(network!);

    if (!ipVersion) {
      throw new Error(`Invalid network address: ${network}`);
    }

    const ips: string[] = [];
    const maxIPs = Math.min(limit, Math.pow(2, (ipVersion === 4 ? 32 : 128) - prefix));

    if (ipVersion === 4) {
      const networkNum = this.ipv4ToNumber(network!);
      const hostBits = 32 - prefix;
      const hostCount = Math.pow(2, hostBits);

      for (let i = 0; i < Math.min(hostCount, maxIPs); i++) {
        const ipNum = networkNum + i;
        const ip = this.numberToIPv4(ipNum);
        ips.push(ip);
      }
    }

    return ips;
  }

  /**
   * Convert number to IPv4 address
   * @param num - Number representation
   * @returns IPv4 address
   */
  private static numberToIPv4(num: number): string {
    return [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join('.');
  }

  /**
   * Get the broadcast address for a CIDR range
   * @param cidr - CIDR range
   * @returns Broadcast address
   */
  static getBroadcastAddress(cidr: string): string {
    if (!this.isValidCIDR(cidr)) {
      throw new Error(`Invalid CIDR range: ${cidr}`);
    }

    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength!, 10);
    const ipVersion = this.getIPVersion(network!);

    if (ipVersion === 4) {
      const networkNum = this.ipv4ToNumber(network!);
      const hostBits = 32 - prefix;
      const broadcastNum = networkNum + Math.pow(2, hostBits) - 1;
      return this.numberToIPv4(broadcastNum);
    }

    throw new Error('Broadcast address not applicable for IPv6');
  }

  /**
   * Check if two IP addresses are in the same subnet
   * @param ip1 - First IP address
   * @param ip2 - Second IP address
   * @param cidr - CIDR range
   * @returns True if in same subnet
   */
  static areInSameSubnet(ip1: string, ip2: string, cidr: string): boolean {
    return this.isIPInCIDR(ip1, cidr) && this.isIPInCIDR(ip2, cidr);
  }

  /**
   * Get the distance between two IP addresses
   * @param ip1 - First IP address
   * @param ip2 - Second IP address
   * @returns Distance (number of IPs between them)
   */
  static getIPDistance(ip1: string, ip2: string): number {
    if (!this.isValidIP(ip1) || !this.isValidIP(ip2)) {
      throw new Error('Invalid IP addresses');
    }

    const version1 = this.getIPVersion(ip1);
    const version2 = this.getIPVersion(ip2);

    if (version1 !== version2) {
      throw new Error('IP addresses must be of the same version');
    }

    if (version1 === 4) {
      const num1 = this.ipv4ToNumber(ip1);
      const num2 = this.ipv4ToNumber(ip2);
      return Math.abs(num1 - num2);
    }

    // For IPv6, this is a simplified calculation
    throw new Error('IPv6 distance calculation not implemented');
  }

  /**
   * Get geolocation information for an IP address
   * @param ip - IP address
   * @returns Geolocation data or null
   */
  static getIPGeolocation(ip: string): any {
    if (!this.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    try {
      // This would typically use a geolocation service
      // For now, return null as the actual implementation would require
      // a geolocation service like geoip-lite or a paid service
      return null;
    } catch (error) {
      return null;
    }
  }
}
