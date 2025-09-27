import moment from 'moment';

export class TimeUtils {
  /**
   * Parse a time window string (e.g., '1h', '30m', '15s') into seconds
   * @param timeWindow - Time window string
   * @returns Number of seconds
   */
  static parseTimeWindow(timeWindow: string): number {
    if (!timeWindow || typeof timeWindow !== 'string') {
      throw new Error('Time window must be a non-empty string');
    }

    const match = timeWindow.match(/^(\d+)([smhdwy])$/i);
    if (!match) {
      throw new Error(`Invalid time window format: ${timeWindow}. Expected format: number followed by unit (s, m, h, d, w, y)`);
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!.toLowerCase();

    if (value <= 0) {
      throw new Error('Time window value must be positive');
    }

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31536000,
    };

    const multiplier = multipliers[unit];
    if (!multiplier) {
      throw new Error(`Unsupported time unit: ${unit}`);
    }

    return value * multiplier;
  }

  /**
   * Format seconds into a human-readable time window string
   * @param seconds - Number of seconds
   * @returns Time window string
   */
  static formatTimeWindow(seconds: number): string {
    if (seconds <= 0) {
      return '0s';
    }

    const units = [
      { unit: 'y', seconds: 31536000 },
      { unit: 'w', seconds: 604800 },
      { unit: 'd', seconds: 86400 },
      { unit: 'h', seconds: 3600 },
      { unit: 'm', seconds: 60 },
      { unit: 's', seconds: 1 },
    ];

    for (const { unit, seconds: unitSeconds } of units) {
      if (seconds >= unitSeconds) {
        const value = Math.floor(seconds / unitSeconds);
        return `${value}${unit}`;
      }
    }

    return `${seconds}s`;
  }

  /**
   * Get the current timestamp in seconds
   * @returns Current timestamp
   */
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get the current timestamp in milliseconds
   * @returns Current timestamp in milliseconds
   */
  static nowMs(): number {
    return Date.now();
  }

  /**
   * Add time to a timestamp
   * @param timestamp - Base timestamp in seconds
   * @param timeWindow - Time window to add
   * @returns New timestamp
   */
  static addTime(timestamp: number, timeWindow: string): number {
    const seconds = this.parseTimeWindow(timeWindow);
    return timestamp + seconds;
  }

  /**
   * Subtract time from a timestamp
   * @param timestamp - Base timestamp in seconds
   * @param timeWindow - Time window to subtract
   * @returns New timestamp
   */
  static subtractTime(timestamp: number, timeWindow: string): number {
    const seconds = this.parseTimeWindow(timeWindow);
    return timestamp - seconds;
  }

  /**
   * Get the start of a time window
   * @param timestamp - Current timestamp
   * @param timeWindow - Time window size
   * @returns Start timestamp of the window
   */
  static getWindowStart(timestamp: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    return Math.floor(timestamp / windowSeconds) * windowSeconds;
  }

  /**
   * Get the end of a time window
   * @param timestamp - Current timestamp
   * @param timeWindow - Time window size
   * @returns End timestamp of the window
   */
  static getWindowEnd(timestamp: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    return this.getWindowStart(timestamp, timeWindow) + windowSeconds - 1;
  }

  /**
   * Check if a timestamp is within a time window
   * @param timestamp - Timestamp to check
   * @param windowStart - Window start timestamp
   * @param timeWindow - Time window size
   * @returns True if within window
   */
  static isWithinWindow(timestamp: number, windowStart: number, timeWindow: string): boolean {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    const windowEnd = windowStart + windowSeconds - 1;
    return timestamp >= windowStart && timestamp <= windowEnd;
  }

  /**
   * Get the remaining time in a window
   * @param timestamp - Current timestamp
   * @param windowStart - Window start timestamp
   * @param timeWindow - Time window size
   * @returns Remaining seconds in the window
   */
  static getRemainingTime(timestamp: number, windowStart: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    const windowEnd = windowStart + windowSeconds - 1;
    return Math.max(0, windowEnd - timestamp);
  }

  /**
   * Get the next window start time
   * @param timestamp - Current timestamp
   * @param timeWindow - Time window size
   * @returns Next window start timestamp
   */
  static getNextWindowStart(timestamp: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    const currentWindowStart = this.getWindowStart(timestamp, timeWindow);
    return currentWindowStart + windowSeconds;
  }

  /**
   * Format a timestamp as a human-readable string
   * @param timestamp - Timestamp in seconds
   * @param format - Moment.js format string
   * @returns Formatted string
   */
  static formatTimestamp(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return moment.unix(timestamp).format(format);
  }

  /**
   * Parse a timestamp string into seconds
   * @param timestampString - Timestamp string
   * @param format - Moment.js format string
   * @returns Timestamp in seconds
   */
  static parseTimestamp(timestampString: string, format: string = 'YYYY-MM-DD HH:mm:ss'): number {
    return moment(timestampString, format).unix();
  }

  /**
   * Get the difference between two timestamps in seconds
   * @param timestamp1 - First timestamp
   * @param timestamp2 - Second timestamp
   * @returns Difference in seconds
   */
  static getDifference(timestamp1: number, timestamp2: number): number {
    return Math.abs(timestamp1 - timestamp2);
  }

  /**
   * Check if a timestamp is in the past
   * @param timestamp - Timestamp to check
   * @returns True if in the past
   */
  static isPast(timestamp: number): boolean {
    return timestamp < this.now();
  }

  /**
   * Check if a timestamp is in the future
   * @param timestamp - Timestamp to check
   * @returns True if in the future
   */
  static isFuture(timestamp: number): boolean {
    return timestamp > this.now();
  }

  /**
   * Get a timestamp for a specific duration from now
   * @param timeWindow - Time window from now
   * @returns Future timestamp
   */
  static getFutureTimestamp(timeWindow: string): number {
    return this.addTime(this.now(), timeWindow);
  }

  /**
   * Get a timestamp for a specific duration ago
   * @param timeWindow - Time window ago
   * @returns Past timestamp
   */
  static getPastTimestamp(timeWindow: string): number {
    return this.subtractTime(this.now(), timeWindow);
  }

  /**
   * Sleep for a specified duration
   * @param timeWindow - Duration to sleep
   * @returns Promise that resolves after the duration
   */
  static async sleep(timeWindow: string): Promise<void> {
    const milliseconds = this.parseTimeWindow(timeWindow) * 1000;
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Create a timeout promise
   * @param timeWindow - Timeout duration
   * @param message - Timeout message
   * @returns Promise that rejects after the duration
   */
  static timeout(timeWindow: string, message: string = 'Operation timed out'): Promise<never> {
    const milliseconds = this.parseTimeWindow(timeWindow) * 1000;
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), milliseconds);
    });
  }

  /**
   * Get the current time in various formats
   * @returns Object with different time formats
   */
  static getCurrentTime(): {
    timestamp: number;
    timestampMs: number;
    iso: string;
    formatted: string;
    moment: moment.Moment;
  } {
    const now = this.now();
    const nowMs = this.nowMs();
    const momentObj = moment.unix(now);

    return {
      timestamp: now,
      timestampMs: nowMs,
      iso: momentObj.toISOString(),
      formatted: momentObj.format('YYYY-MM-DD HH:mm:ss'),
      moment: momentObj,
    };
  }

  /**
   * Validate a time window string
   * @param timeWindow - Time window to validate
   * @returns True if valid
   */
  static isValidTimeWindow(timeWindow: string): boolean {
    try {
      this.parseTimeWindow(timeWindow);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported time units
   * @returns Array of supported time units
   */
  static getSupportedUnits(): string[] {
    return ['s', 'm', 'h', 'd', 'w', 'y'];
  }

  /**
   * Convert between different time units
   * @param value - Value to convert
   * @param fromUnit - Source unit
   * @param toUnit - Target unit
   * @returns Converted value
   */
  static convertTime(value: number, fromUnit: string, toUnit: string): number {
    const fromSeconds = this.parseTimeWindow(`${value}${fromUnit}`);
    const toSeconds = this.parseTimeWindow(`1${toUnit}`);
    return fromSeconds / toSeconds;
  }

  /**
   * Get the duration between two timestamps in a specific unit
   * @param start - Start timestamp
   * @param end - End timestamp
   * @param unit - Unit to return duration in
   * @returns Duration in the specified unit
   */
  static getDuration(start: number, end: number, unit: string): number {
    const seconds = Math.abs(end - start);
    return this.convertTime(seconds, 's', unit);
  }

  /**
   * Round a timestamp to the nearest time window
   * @param timestamp - Timestamp to round
   * @param timeWindow - Time window to round to
   * @returns Rounded timestamp
   */
  static roundToWindow(timestamp: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    return Math.round(timestamp / windowSeconds) * windowSeconds;
  }

  /**
   * Get the number of time windows between two timestamps
   * @param start - Start timestamp
   * @param end - End timestamp
   * @param timeWindow - Time window size
   * @returns Number of windows
   */
  static getWindowCount(start: number, end: number, timeWindow: string): number {
    const windowSeconds = this.parseTimeWindow(timeWindow);
    return Math.floor((end - start) / windowSeconds);
  }

  /**
   * Parse duration string to seconds (alias for parseTimeWindow)
   * @param duration - Duration string (e.g., '1h', '30m', '5s')
   * @returns Duration in seconds
   */
  static parseDurationToSeconds(duration: string): number {
    return this.parseTimeWindow(duration);
  }

  /**
   * Convert seconds to duration string
   * @param seconds - Number of seconds
   * @returns Duration string
   */
  static secondsToDuration(seconds: number): string {
    return this.formatTimeWindow(seconds);
  }
}
