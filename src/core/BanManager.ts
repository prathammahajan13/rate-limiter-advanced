import { StorageInterface } from '../storage/StorageInterface';
import { BanRecord, BanReason, BanConfig, BanEscalationRule } from '../types/BanTypes';
import { BanError } from '../errors/BanError';
import { TimeUtils } from '../utils/TimeUtils';
import { IPUtils } from '../utils/IPUtils';
import { AnalyticsCollector } from '../analytics/AnalyticsCollector';
import { NotificationManager } from '../notifications/NotificationManager';

export class BanManager {
  private storage: StorageInterface;
  private config: BanConfig;
  private analytics: AnalyticsCollector;
  private notifications: NotificationManager;
  private escalationRules: BanEscalationRule[];

  constructor(
    storage: StorageInterface,
    config: BanConfig,
    analytics: AnalyticsCollector,
    notifications: NotificationManager
  ) {
    this.storage = storage;
    this.config = config;
    this.analytics = analytics;
    this.notifications = notifications;
    this.escalationRules = config.escalationRules || [];
  }

  /**
   * Check if an IP is currently banned
   * @param ip - IP address to check
   * @returns Promise<boolean>
   */
  async isBanned(ip: string): Promise<boolean> {
    try {
      if (!IPUtils.isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      const banRecord = await this.storage.getBan(ip);
      if (!banRecord) {
        return false;
      }

      // Check if ban has expired
      if (banRecord.expiresAt && new Date() > new Date(banRecord.expiresAt)) {
        await this.storage.removeBan(ip);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking ban status:', error);
      return false;
    }
  }

  /**
   * Get ban information for an IP
   * @param ip - IP address
   * @returns Promise<BanRecord | null>
   */
  async getBanInfo(ip: string): Promise<BanRecord | null> {
    try {
      if (!IPUtils.isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      const banRecord = await this.storage.getBan(ip);
      if (!banRecord) {
        return null;
      }

      // Check if ban has expired
      if (banRecord.expiresAt && new Date() > new Date(banRecord.expiresAt)) {
        await this.storage.removeBan(ip);
        return null;
      }

      return banRecord;
    } catch (error) {
      console.error('Error getting ban info:', error);
      return null;
    }
  }

  /**
   * Ban an IP address
   * @param ip - IP address to ban
   * @param reason - Reason for the ban
   * @param duration - Ban duration (optional, uses default if not provided)
   * @param metadata - Additional metadata
   * @returns Promise<BanRecord>
   */
  async banIP(
    ip: string,
    reason: BanReason,
    duration?: string,
    metadata: Record<string, any> = {}
  ): Promise<BanRecord> {
    try {
      if (!IPUtils.isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      // Check if IP is already banned
      const existingBan = await this.getBanInfo(ip);
      if (existingBan) {
        // Update existing ban with new reason and duration
        return await this.updateBan(ip, reason, duration, metadata);
      }

      // Calculate ban duration
      const banDuration = duration || this.getDefaultBanDuration(reason);
      const expiresAt = new Date(Date.now() + TimeUtils.parseDurationToSeconds(banDuration) * 1000);

      // Create ban record
      const banRecord: BanRecord = {
        ip,
        reason,
        bannedAt: new Date(),
        expiresAt,
        duration: banDuration,
        violationCount: 1,
        lastViolation: new Date(),
        escalated: false,
        appealable: this.config.appealEnabled,
        appealUrl: this.config.appealUrl,
        metadata: {
          ...metadata,
          banCount: 1,
          lastViolation: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store ban record
      await this.storage.setBan(ip, banRecord);

      // Record analytics
      await this.analytics.recordViolation(ip, 'ban', 'POST', 0, '1h', {
        action: 'ban',
        duration: banDuration,
        metadata,
      });

      // Send notification
      await this.notifications.sendIPBanNotification({
        ip,
        reason,
        duration: banDuration,
        violationCount: 1,
        geolocation: metadata?.['geolocation'],
      });

      return banRecord;
    } catch (error) {
      console.error('Error banning IP:', error);
      throw new BanError(`Failed to ban IP ${ip}: ${error instanceof Error ? error.message : String(error)}`, ip, reason);
    }
  }

  /**
   * Update an existing ban
   * @param ip - IP address
   * @param reason - New reason for the ban
   * @param duration - New ban duration
   * @param metadata - Additional metadata
   * @returns Promise<BanRecord>
   */
  async updateBan(
    ip: string,
    reason: BanReason,
    duration?: string,
    metadata: Record<string, any> = {}
  ): Promise<BanRecord> {
    try {
      const existingBan = await this.getBanInfo(ip);
      if (!existingBan) {
        throw new Error('IP is not currently banned');
      }

      // Calculate new ban duration
      const banDuration = duration || this.getDefaultBanDuration(reason);
      const expiresAt = new Date(Date.now() + TimeUtils.parseDurationToSeconds(banDuration) * 1000);

      // Update ban record
      const updatedBan: BanRecord = {
        ...existingBan,
        reason,
        expiresAt,
        duration: banDuration,
            metadata: {
              ...existingBan.metadata,
              ...metadata,
              banCount: (existingBan.metadata?.banCount || 0) + 1,
              lastViolation: new Date(),
            },
      };

      // Store updated ban record
      await this.storage.setBan(ip, updatedBan);

      // Record analytics
      await this.analytics.recordViolation(ip, 'ban', 'POST', 0, '1h', {
        action: 'ban_update',
        duration: banDuration,
        metadata,
      });

      // Send notification
      await this.notifications.sendIPBanNotification({
        ip,
        reason,
        duration: banDuration,
        violationCount: (existingBan.violationCount || 0) + 1,
        geolocation: metadata?.['geolocation'],
      });

      return updatedBan;
    } catch (error) {
      console.error('Error updating ban:', error);
      throw new BanError(`Failed to update ban for IP ${ip}: ${error instanceof Error ? error.message : String(error)}`, ip, reason);
    }
  }

  /**
   * Unban an IP address
   * @param ip - IP address to unban
   * @param reason - Reason for unbanning
   * @returns Promise<boolean>
   */
  async unbanIP(ip: string, reason: string = 'manual_unban'): Promise<boolean> {
    try {
      if (!IPUtils.isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      const banRecord = await this.getBanInfo(ip);
      if (!banRecord) {
        return false;
      }

      // Remove ban from storage
      await this.storage.removeBan(ip);

      // Record analytics
      await this.analytics.recordViolation(ip, 'unban', 'POST', 0, '1h', {
        action: 'unban',
        reason,
        originalBanReason: banRecord.reason,
        banDuration: banRecord.duration,
      });

      // Send notification
      await this.notifications.sendIPBanNotification({
        ip,
        reason,
        duration: banRecord.duration || '1h',
        violationCount: banRecord.violationCount || 0,
        geolocation: banRecord.metadata?.geolocation,
      });

      return true;
    } catch (error) {
      console.error('Error unbanning IP:', error);
      throw new BanError(`Failed to unban IP ${ip}: ${error instanceof Error ? error.message : String(error)}`, ip, 'unban');
    }
  }

  /**
   * Escalate a ban based on violation history
   * @param ip - IP address
   * @param violationType - Type of violation
   * @returns Promise<BanRecord | null>
   */
  async escalateBan(ip: string, violationType: string): Promise<BanRecord | null> {
    try {
      if (!IPUtils.isValidIP(ip)) {
        throw new Error('Invalid IP address');
      }

      // Get current ban info
      const currentBan = await this.getBanInfo(ip);
      if (!currentBan) {
        return null;
      }

      // Find applicable escalation rule
      const escalationRule = this.findEscalationRule(violationType, currentBan);
      if (!escalationRule) {
        return currentBan;
      }

      // Calculate new ban duration
      const newDuration = this.calculateEscalatedDuration(currentBan, escalationRule);
      const expiresAt = new Date(Date.now() + TimeUtils.parseDurationToSeconds(newDuration) * 1000);

      // Update ban record
      const escalatedBan: BanRecord = {
        ...currentBan,
        reason: escalationRule.newReason || currentBan.reason,
        expiresAt,
        duration: newDuration,
        metadata: {
          ...currentBan.metadata,
          banCount: (currentBan.metadata?.banCount || 0) + 1,
          lastViolation: new Date(),
        },
      };

      // Store escalated ban record
      await this.storage.setBan(ip, escalatedBan);

      // Record analytics
      await this.analytics.recordViolation(ip, 'escalation', 'POST', 0, '1h', {
        action: 'ban_escalation',
        duration: newDuration,
        escalationRule: escalationRule.name,
        previousDuration: currentBan.duration,
      });

      // Send notification
      await this.notifications.sendIPBanNotification({
        ip,
        reason: escalationRule.newReason || currentBan.reason,
        duration: newDuration,
        violationCount: (currentBan.violationCount || 0) + 1,
        geolocation: currentBan.metadata?.geolocation,
      });

      return escalatedBan;
    } catch (error) {
      console.error('Error escalating ban:', error);
      throw new BanError(`Failed to escalate ban for IP ${ip}: ${error instanceof Error ? error.message : String(error)}`, ip, 'escalation');
    }
  }

  /**
   * Get all banned IPs
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise<BanRecord[]>
   */
  async getAllBannedIPs(limit: number = 100, offset: number = 0): Promise<BanRecord[]> {
    try {
      return await this.storage.getAllBans(limit, offset);
    } catch (error) {
      console.error('Error getting all banned IPs:', error);
      return [];
    }
  }

  /**
   * Get banned IPs by reason
   * @param reason - Ban reason
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Promise<BanRecord[]>
   */
  async getBannedIPsByReason(reason: BanReason, limit: number = 100, offset: number = 0): Promise<BanRecord[]> {
    try {
      return await this.storage.getBansByReason(reason, limit, offset);
    } catch (error) {
      console.error('Error getting banned IPs by reason:', error);
      return [];
    }
  }

  /**
   * Get ban statistics
   * @returns Promise<Record<string, any>>
   */
  async getBanStatistics(): Promise<Record<string, any>> {
    try {
      const allBans = await this.getAllBannedIPs(1000, 0);
      const now = new Date();

      const stats = {
        total: allBans.length,
        active: 0,
        expired: 0,
        byReason: {} as Record<string, number>,
        byDuration: {} as Record<string, number>,
        averageBanDuration: 0,
        totalBanTime: 0,
      };

      let totalBanTime = 0;

      for (const ban of allBans) {
        // Count by reason
        stats.byReason[ban.reason] = (stats.byReason[ban.reason] || 0) + 1;

        // Count by duration
        if (ban.duration) {
          stats.byDuration[ban.duration] = (stats.byDuration[ban.duration] || 0) + 1;
        }

        // Check if ban is active
        if (ban.expiresAt && new Date(ban.expiresAt) > now) {
          stats.active++;
        } else {
          stats.expired++;
        }

        // Calculate ban time
        const banTime = ban.expiresAt ? 
          new Date(ban.expiresAt).getTime() - new Date(ban.bannedAt).getTime() : 0;
        totalBanTime += banTime;
      }

      stats.totalBanTime = totalBanTime;
      stats.averageBanDuration = allBans.length > 0 ? totalBanTime / allBans.length : 0;

      return stats;
    } catch (error) {
      console.error('Error getting ban statistics:', error);
      return {};
    }
  }

  /**
   * Clean up expired bans
   * @returns Promise<number> - Number of expired bans removed
   */
  async cleanupExpiredBans(): Promise<number> {
    try {
      const allBans = await this.getAllBannedIPs(1000, 0);
      const now = new Date();
      let removedCount = 0;

      for (const ban of allBans) {
        if (ban.expiresAt && new Date(ban.expiresAt) <= now) {
          await this.storage.removeBan(ban.ip);
          removedCount++;
        }
      }

      return removedCount;
    } catch (error) {
      console.error('Error cleaning up expired bans:', error);
      return 0;
    }
  }

  /**
   * Get default ban duration for a reason
   * @param reason - Ban reason
   * @returns Default duration string
   */
  private getDefaultBanDuration(reason: BanReason): string {
    const defaultDurations: Record<BanReason, string> = {
      otp_abuse: this.config.defaultDuration || '1h',
      login_attempts: this.config.defaultDuration || '1h',
      api_abuse: this.config.defaultDuration || '24h',
      suspicious_activity: this.config.defaultDuration || '24h',
      manual_ban: this.config.defaultDuration || '1d',
      bot_detected: this.config.defaultDuration || '7d',
      vpn_proxy_detected: this.config.defaultDuration || '24h',
      geographic_restriction: this.config.defaultDuration || '30d',
      threat_intelligence: this.config.defaultDuration || '7d',
      rate_limit_violation: this.config.defaultDuration || '1h',
    };

    return defaultDurations[reason] || '1h';
  }

  /**
   * Find applicable escalation rule
   * @param violationType - Type of violation
   * @param currentBan - Current ban record
   * @returns Applicable escalation rule or null
   */
  private findEscalationRule(violationType: string, currentBan: BanRecord): BanEscalationRule | null {
    for (const rule of this.escalationRules) {
      // Check if rule applies to this violation type
      if (rule.violationTypes && !rule.violationTypes.includes(violationType)) {
        continue;
      }

      // Check if rule applies to this ban reason
      if (rule.banReasons && !rule.banReasons.includes(currentBan.reason)) {
        continue;
      }

      // Check if rule applies to this ban count
      const banCount = currentBan.metadata?.banCount || 0;
      if (rule.minBanCount && banCount < rule.minBanCount) {
        continue;
      }

      // Check if rule applies to this ban duration
      if (rule.minBanDuration) {
        const currentDuration = TimeUtils.parseDurationToSeconds(currentBan.duration || '1h');
        const minDuration = TimeUtils.parseDurationToSeconds(rule.minBanDuration);
        if (currentDuration < minDuration) {
          continue;
        }
      }

      return rule;
    }

    return null;
  }

  /**
   * Calculate escalated ban duration
   * @param currentBan - Current ban record
   * @param escalationRule - Escalation rule
   * @returns New ban duration string
   */
  private calculateEscalatedDuration(currentBan: BanRecord, escalationRule: BanEscalationRule): string {
    if (escalationRule.newDuration) {
      return escalationRule.newDuration;
    }

    if (escalationRule.durationMultiplier) {
      const currentDuration = TimeUtils.parseDurationToSeconds(currentBan.duration || '1h');
      const newDuration = Math.floor(currentDuration * escalationRule.durationMultiplier);
      return TimeUtils.secondsToDuration(newDuration);
    }

    // Default escalation: double the current duration
    const currentDuration = TimeUtils.parseDurationToSeconds(currentBan.duration || '1h');
    const newDuration = currentDuration * 2;
    return TimeUtils.secondsToDuration(newDuration);
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): BanConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration
   */
  updateConfig(newConfig: Partial<BanConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.escalationRules = this.config.escalationRules || [];
  }

  /**
   * Get escalation rules
   * @returns Current escalation rules
   */
  getEscalationRules(): BanEscalationRule[] {
    return [...this.escalationRules];
  }

  /**
   * Add escalation rule
   * @param rule - New escalation rule
   */
  addEscalationRule(rule: BanEscalationRule): void {
    this.escalationRules.push(rule);
    this.config.escalationRules = this.escalationRules;
  }

  /**
   * Remove escalation rule
   * @param ruleName - Name of rule to remove
   */
  removeEscalationRule(ruleName: string): void {
    this.escalationRules = this.escalationRules.filter(rule => rule.name !== ruleName);
    this.config.escalationRules = this.escalationRules;
  }

  /**
   * Get the storage instance
   * @returns Storage instance
   */
  getStorage(): StorageInterface {
    return this.storage;
  }

  /**
   * Get the analytics collector
   * @returns Analytics collector
   */
  getAnalytics(): AnalyticsCollector {
    return this.analytics;
  }

  /**
   * Get the notification manager
   * @returns Notification manager
   */
  getNotifications(): NotificationManager {
    return this.notifications;
  }
}