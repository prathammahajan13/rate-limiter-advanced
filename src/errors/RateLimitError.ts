export class RateLimitError extends Error {
  public readonly statusCode: number = 429;
  public readonly code: string = 'RATE_LIMIT_EXCEEDED';
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;
  public readonly resetTime: number;
  public readonly ip: string;
  public readonly endpoint: string;
  public readonly userAgent: string | undefined;

  constructor(
    message: string,
    retryAfter: number,
    limit: number,
    remaining: number,
    resetTime: number,
    ip: string,
    endpoint: string,
    userAgent?: string
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
    this.ip = ip;
    this.endpoint = endpoint;
    this.userAgent = userAgent;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryAfter: this.retryAfter,
      limit: this.limit,
      remaining: this.remaining,
      resetTime: this.resetTime,
      ip: this.ip,
      endpoint: this.endpoint,
      userAgent: this.userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  public toResponse(): object {
    return {
      error: 'Rate limit exceeded',
      message: this.message,
      retryAfter: this.retryAfter,
      limit: this.limit,
      remaining: this.remaining,
      resetTime: this.resetTime,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitConfigurationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_CONFIG_ERROR';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'RateLimitConfigurationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitConfigurationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitStorageError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_STORAGE_ERROR';
  public readonly fallback: boolean;

  constructor(message: string, fallback: boolean = false, public readonly originalError?: Error) {
    super(message);
    this.name = 'RateLimitStorageError';
    this.fallback = fallback;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitStorageError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      fallback: this.fallback,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'RATE_LIMIT_VALIDATION_ERROR';
  public readonly field: string;
  public readonly value: any;

  constructor(message: string, field: string, value: any) {
    super(message);
    this.name = 'RateLimitValidationError';
    this.field = field;
    this.value = value;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitValidationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      field: this.field,
      value: this.value,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitRuleError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_RULE_ERROR';
  public readonly rule: string;
  public readonly endpoint: string;

  constructor(message: string, rule: string, endpoint: string) {
    super(message);
    this.name = 'RateLimitRuleError';
    this.rule = rule;
    this.endpoint = endpoint;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitRuleError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      rule: this.rule,
      endpoint: this.endpoint,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitMiddlewareError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_MIDDLEWARE_ERROR';
  public readonly middleware: string;

  constructor(message: string, middleware: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RateLimitMiddlewareError';
    this.middleware = middleware;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitMiddlewareError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      middleware: this.middleware,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitAnalyticsError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_ANALYTICS_ERROR';
  public readonly operation: string;

  constructor(message: string, operation: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RateLimitAnalyticsError';
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitAnalyticsError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitNotificationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'RATE_LIMIT_NOTIFICATION_ERROR';
  public readonly channel: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    channel: string,
    retryable: boolean = true,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RateLimitNotificationError';
    this.channel = channel;
    this.retryable = retryable;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitNotificationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      channel: this.channel,
      retryable: this.retryable,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitTimeoutError extends Error {
  public readonly statusCode: number = 504;
  public readonly code: string = 'RATE_LIMIT_TIMEOUT';
  public readonly timeout: number;
  public readonly operation: string;

  constructor(message: string, timeout: number, operation: string) {
    super(message);
    this.name = 'RateLimitTimeoutError';
    this.timeout = timeout;
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitTimeoutError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timeout: this.timeout,
      operation: this.operation,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RateLimitQuotaExceededError extends Error {
  public readonly statusCode: number = 429;
  public readonly code: string = 'RATE_LIMIT_QUOTA_EXCEEDED';
  public readonly quota: string;
  public readonly limit: number;
  public readonly used: number;
  public readonly resetTime: number;

  constructor(
    message: string,
    quota: string,
    limit: number,
    used: number,
    resetTime: number
  ) {
    super(message);
    this.name = 'RateLimitQuotaExceededError';
    this.quota = quota;
    this.limit = limit;
    this.used = used;
    this.resetTime = resetTime;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitQuotaExceededError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      quota: this.quota,
      limit: this.limit,
      used: this.used,
      resetTime: this.resetTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// Utility function to check if an error is a rate limit error
export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError;
}

// Utility function to check if an error is retryable
export function isRetryableError(error: any): boolean {
  if (error instanceof RateLimitStorageError) {
    return !error.fallback;
  }
  if (error instanceof RateLimitNotificationError) {
    return error.retryable;
  }
  if (error instanceof RateLimitTimeoutError) {
    return true;
  }
  return false;
}

// Utility function to get error response
export function getErrorResponse(error: any): object {
  if (error && typeof error.toResponse === 'function') {
    return error.toResponse();
  }
  
  return {
    error: 'Internal server error',
    message: error?.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };
}
