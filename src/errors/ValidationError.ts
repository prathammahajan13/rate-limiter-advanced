export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'VALIDATION_ERROR';
  public readonly field: string;
  public readonly value: any;
  public readonly rule: string;
  public readonly details?: any;

  constructor(
    message: string,
    field: string,
    value: any,
    rule: string,
    details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.rule = rule;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
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
      rule: this.rule,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }

  public toResponse(): object {
    return {
      error: 'Validation failed',
      message: this.message,
      field: this.field,
      rule: this.rule,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class MultipleValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'MULTIPLE_VALIDATION_ERROR';
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'MultipleValidationError';
    this.errors = errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MultipleValidationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      errors: this.errors.map(error => error.toJSON()),
      timestamp: new Date().toISOString(),
    };
  }

  public toResponse(): object {
    return {
      error: 'Multiple validation errors',
      message: this.message,
      errors: this.errors.map(error => error.toResponse()),
      timestamp: new Date().toISOString(),
    };
  }
}

export class IPValidationError extends ValidationError {
  public override readonly code: string = 'IP_VALIDATION_ERROR';
  public readonly ip: string;

  constructor(message: string, ip: string, rule: string, details?: any) {
    super(message, 'ip', ip, rule, details);
    this.name = 'IPValidationError';
    this.ip = ip;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      ip: this.ip,
    };
  }
}

export class CIDRValidationError extends ValidationError {
  public override readonly code: string = 'CIDR_VALIDATION_ERROR';
  public readonly cidr: string;

  constructor(message: string, cidr: string, rule: string, details?: any) {
    super(message, 'cidr', cidr, rule, details);
    this.name = 'CIDRValidationError';
    this.cidr = cidr;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      cidr: this.cidr,
    };
  }
}

export class TimeWindowValidationError extends ValidationError {
  public override readonly code: string = 'TIME_WINDOW_VALIDATION_ERROR';
  public readonly timeWindow: string;

  constructor(message: string, timeWindow: string, rule: string, details?: any) {
    super(message, 'timeWindow', timeWindow, rule, details);
    this.name = 'TimeWindowValidationError';
    this.timeWindow = timeWindow;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      timeWindow: this.timeWindow,
    };
  }
}

export class RuleValidationError extends ValidationError {
  public override readonly code: string = 'RULE_VALIDATION_ERROR';
  public readonly ruleName: string;
  public readonly endpoint: string;

  constructor(
    message: string,
    ruleName: string,
    endpoint: string,
    rule: string,
    details?: any
  ) {
    super(message, 'rule', { ruleName, endpoint }, rule, details);
    this.name = 'RuleValidationError';
    this.ruleName = ruleName;
    this.endpoint = endpoint;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      ruleName: this.ruleName,
      endpoint: this.endpoint,
    };
  }
}

export class ConfigurationValidationError extends ValidationError {
  public override readonly code: string = 'CONFIG_VALIDATION_ERROR';
  public readonly configSection: string;

  constructor(
    message: string,
    configSection: string,
    rule: string,
    details?: any
  ) {
    super(message, 'config', configSection, rule, details);
    this.name = 'ConfigurationValidationError';
    this.configSection = configSection;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      configSection: this.configSection,
    };
  }
}

export class DatabaseValidationError extends ValidationError {
  public override readonly code: string = 'DATABASE_VALIDATION_ERROR';
  public readonly table: string;
  public readonly column: string | undefined;

  constructor(
    message: string,
    table: string,
    column: string | undefined,
    rule: string,
    details?: any
  ) {
    super(message, 'database', { table, column }, rule, details);
    this.name = 'DatabaseValidationError';
    this.table = table;
    this.column = column;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      table: this.table,
      column: this.column,
    };
  }
}

export class RedisValidationError extends ValidationError {
  public override readonly code: string = 'REDIS_VALIDATION_ERROR';
  public readonly key: string | undefined;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    key: string | undefined,
    rule: string,
    details?: any
  ) {
    super(message, 'redis', { operation, key }, rule, details);
    this.name = 'RedisValidationError';
    this.operation = operation;
    this.key = key;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      operation: this.operation,
      key: this.key,
    };
  }
}

export class NotificationValidationError extends ValidationError {
  public override readonly code: string = 'NOTIFICATION_VALIDATION_ERROR';
  public readonly channel: string;
  public readonly template: string | undefined;

  constructor(
    message: string,
    channel: string,
    template: string | undefined,
    rule: string,
    details?: any
  ) {
    super(message, 'notification', { channel, template }, rule, details);
    this.name = 'NotificationValidationError';
    this.channel = channel;
    this.template = template;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      channel: this.channel,
      template: this.template,
    };
  }
}

export class AnalyticsValidationError extends ValidationError {
  public override readonly code: string = 'ANALYTICS_VALIDATION_ERROR';
  public readonly metric: string;
  public readonly query?: any;

  constructor(
    message: string,
    metric: string,
    query: any | undefined,
    rule: string,
    details?: any
  ) {
    super(message, 'analytics', { metric, query }, rule, details);
    this.name = 'AnalyticsValidationError';
    this.metric = metric;
    this.query = query;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      metric: this.metric,
      query: this.query,
    };
  }
}

export class SecurityValidationError extends ValidationError {
  public override readonly code: string = 'SECURITY_VALIDATION_ERROR';
  public readonly securityCheck: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    securityCheck: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    rule: string,
    details?: any
  ) {
    super(message, 'security', { securityCheck, severity }, rule, details);
    this.name = 'SecurityValidationError';
    this.securityCheck = securityCheck;
    this.severity = severity;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      securityCheck: this.securityCheck,
      severity: this.severity,
    };
  }
}

export class PerformanceValidationError extends ValidationError {
  public override readonly code: string = 'PERFORMANCE_VALIDATION_ERROR';
  public readonly metric: string;
  public readonly threshold: number;
  public readonly actual: number;

  constructor(
    message: string,
    metric: string,
    threshold: number,
    actual: number,
    rule: string,
    details?: any
  ) {
    super(message, 'performance', { metric, threshold, actual }, rule, details);
    this.name = 'PerformanceValidationError';
    this.metric = metric;
    this.threshold = threshold;
    this.actual = actual;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      metric: this.metric,
      threshold: this.threshold,
      actual: this.actual,
    };
  }
}

export class SchemaValidationError extends ValidationError {
  public override readonly code: string = 'SCHEMA_VALIDATION_ERROR';
  public readonly schema: string;
  public readonly path: string;

  constructor(
    message: string,
    schema: string,
    path: string,
    rule: string,
    details?: any
  ) {
    super(message, 'schema', { schema, path }, rule, details);
    this.name = 'SchemaValidationError';
    this.schema = schema;
    this.path = path;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      schema: this.schema,
      path: this.path,
    };
  }
}

export class FormatValidationError extends ValidationError {
  public override readonly code: string = 'FORMAT_VALIDATION_ERROR';
  public readonly format: string;
  public readonly expectedFormat: string;

  constructor(
    message: string,
    format: string,
    expectedFormat: string,
    rule: string,
    details?: any
  ) {
    super(message, 'format', { format, expectedFormat }, rule, details);
    this.name = 'FormatValidationError';
    this.format = format;
    this.expectedFormat = expectedFormat;
  }

  public override toJSON(): object {
    return {
      ...super.toJSON(),
      format: this.format,
      expectedFormat: this.expectedFormat,
    };
  }
}

// Utility function to check if an error is a validation error
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

// Utility function to check if an error is a validation-related error
export function isValidationRelatedError(error: any): boolean {
  return (
    error instanceof ValidationError ||
    error instanceof MultipleValidationError ||
    error instanceof IPValidationError ||
    error instanceof CIDRValidationError ||
    error instanceof TimeWindowValidationError ||
    error instanceof RuleValidationError ||
    error instanceof ConfigurationValidationError ||
    error instanceof DatabaseValidationError ||
    error instanceof RedisValidationError ||
    error instanceof NotificationValidationError ||
    error instanceof AnalyticsValidationError ||
    error instanceof SecurityValidationError ||
    error instanceof PerformanceValidationError ||
    error instanceof SchemaValidationError ||
    error instanceof FormatValidationError
  );
}

// Utility function to get validation error response
export function getValidationErrorResponse(error: any): object {
  if (error && typeof error.toResponse === 'function') {
    return error.toResponse();
  }
  
  if (isValidationRelatedError(error)) {
    return {
      error: 'Validation failed',
      message: error.message,
      field: error.field,
      rule: error.rule,
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    error: 'Internal server error',
    message: error?.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };
}

// Utility function to create a validation error
export function createValidationError(
  field: string,
  value: any,
  rule: string,
  message?: string,
  details?: any
): ValidationError {
  const errorMessage = message || `Validation failed for field '${field}' with rule '${rule}'`;
  return new ValidationError(errorMessage, field, value, rule, details);
}

// Utility function to create multiple validation errors
export function createMultipleValidationError(
  errors: ValidationError[],
  message?: string
): MultipleValidationError {
  const errorMessage = message || `Multiple validation errors occurred (${errors.length} errors)`;
  return new MultipleValidationError(errorMessage, errors);
}
