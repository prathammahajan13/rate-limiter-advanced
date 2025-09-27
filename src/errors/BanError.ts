export class BanError extends Error {
  public readonly statusCode: number = 403;
  public readonly code: string = 'IP_BANNED';
  public readonly ip: string;
  public readonly reason: string;
  public readonly expiresAt: Date | undefined;
  public readonly appealable: boolean;
  public readonly appealUrl: string | undefined;
  public readonly violationCount: number;
  public readonly lastViolation: Date;

  constructor(
    message: string,
    ip: string,
    reason: string,
    expiresAt?: Date,
    appealable: boolean = true,
    appealUrl?: string,
    violationCount: number = 0,
    lastViolation: Date = new Date()
  ) {
    super(message);
    this.name = 'BanError';
    this.ip = ip;
    this.reason = reason;
    this.expiresAt = expiresAt;
    this.appealable = appealable;
    this.appealUrl = appealUrl;
    this.violationCount = violationCount;
    this.lastViolation = lastViolation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ip: this.ip,
      reason: this.reason,
      expiresAt: this.expiresAt?.toISOString(),
      appealable: this.appealable,
      appealUrl: this.appealUrl,
      violationCount: this.violationCount,
      lastViolation: this.lastViolation.toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  public toResponse(): object {
    return {
      error: 'IP address banned',
      message: this.message,
      reason: this.reason,
      expiresAt: this.expiresAt?.toISOString(),
      appealable: this.appealable,
      appealUrl: this.appealUrl,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanConfigurationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'BAN_CONFIG_ERROR';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'BanConfigurationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanConfigurationError);
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

export class BanStorageError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'BAN_STORAGE_ERROR';
  public readonly operation: string;
  public readonly fallback: boolean;

  constructor(
    message: string,
    operation: string,
    fallback: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BanStorageError';
    this.operation = operation;
    this.fallback = fallback;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanStorageError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      fallback: this.fallback,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'BAN_VALIDATION_ERROR';
  public readonly field: string;
  public readonly value: any;

  constructor(message: string, field: string, value: any) {
    super(message);
    this.name = 'BanValidationError';
    this.field = field;
    this.value = value;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanValidationError);
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

export class BanNotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = 'BAN_NOT_FOUND';
  public readonly ip: string;

  constructor(message: string, ip: string) {
    super(message);
    this.name = 'BanNotFoundError';
    this.ip = ip;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanNotFoundError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ip: this.ip,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanAlreadyExistsError extends Error {
  public readonly statusCode: number = 409;
  public readonly code: string = 'BAN_ALREADY_EXISTS';
  public readonly ip: string;
  public readonly existingBan: any;

  constructor(message: string, ip: string, existingBan: any) {
    super(message);
    this.name = 'BanAlreadyExistsError';
    this.ip = ip;
    this.existingBan = existingBan;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanAlreadyExistsError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ip: this.ip,
      existingBan: this.existingBan,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanEscalationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'BAN_ESCALATION_ERROR';
  public readonly ip: string;
  public readonly currentLevel: number;
  public readonly targetLevel: number;

  constructor(message: string, ip: string, currentLevel: number, targetLevel: number) {
    super(message);
    this.name = 'BanEscalationError';
    this.ip = ip;
    this.currentLevel = currentLevel;
    this.targetLevel = targetLevel;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanEscalationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ip: this.ip,
      currentLevel: this.currentLevel,
      targetLevel: this.targetLevel,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanAppealError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'BAN_APPEAL_ERROR';
  public readonly appealId: string | undefined;
  public readonly banId: string | undefined;
  public readonly ip: string;

  constructor(message: string, ip: string, appealId?: string, banId?: string) {
    super(message);
    this.name = 'BanAppealError';
    this.appealId = appealId;
    this.banId = banId;
    this.ip = ip;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanAppealError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      appealId: this.appealId,
      banId: this.banId,
      ip: this.ip,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanAppealNotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = 'BAN_APPEAL_NOT_FOUND';
  public readonly appealId: string;

  constructor(message: string, appealId: string) {
    super(message);
    this.name = 'BanAppealNotFoundError';
    this.appealId = appealId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanAppealNotFoundError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      appealId: this.appealId,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanAppealExpiredError extends Error {
  public readonly statusCode: number = 410;
  public readonly code: string = 'BAN_APPEAL_EXPIRED';
  public readonly appealId: string;
  public readonly expiredAt: Date;

  constructor(message: string, appealId: string, expiredAt: Date) {
    super(message);
    this.name = 'BanAppealExpiredError';
    this.appealId = appealId;
    this.expiredAt = expiredAt;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanAppealExpiredError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      appealId: this.appealId,
      expiredAt: this.expiredAt.toISOString(),
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanPolicyError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'BAN_POLICY_ERROR';
  public readonly policyName: string;
  public readonly ruleName: string;

  constructor(message: string, policyName: string, ruleName: string) {
    super(message);
    this.name = 'BanPolicyError';
    this.policyName = policyName;
    this.ruleName = ruleName;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanPolicyError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      policyName: this.policyName,
      ruleName: this.ruleName,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanImportError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'BAN_IMPORT_ERROR';
  public readonly source: string;
  public readonly row: number | undefined;
  public readonly data?: any;

  constructor(message: string, source: string, row?: number, data?: any) {
    super(message);
    this.name = 'BanImportError';
    this.source = source;
    this.row = row;
    this.data = data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanImportError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      source: this.source,
      row: this.row,
      data: this.data,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanExportError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'BAN_EXPORT_ERROR';
  public readonly format: string;
  public readonly destination: string;

  constructor(message: string, format: string, destination: string) {
    super(message);
    this.name = 'BanExportError';
    this.format = format;
    this.destination = destination;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BanExportError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      format: this.format,
      destination: this.destination,
      timestamp: new Date().toISOString(),
    };
  }
}

// Utility function to check if an error is a ban error
export function isBanError(error: any): error is BanError {
  return error instanceof BanError;
}

// Utility function to check if an error is a ban-related error
export function isBanRelatedError(error: any): boolean {
  return (
    error instanceof BanError ||
    error instanceof BanConfigurationError ||
    error instanceof BanStorageError ||
    error instanceof BanValidationError ||
    error instanceof BanNotFoundError ||
    error instanceof BanAlreadyExistsError ||
    error instanceof BanEscalationError ||
    error instanceof BanAppealError ||
    error instanceof BanAppealNotFoundError ||
    error instanceof BanAppealExpiredError ||
    error instanceof BanPolicyError ||
    error instanceof BanImportError ||
    error instanceof BanExportError
  );
}

// Utility function to get ban error response
export function getBanErrorResponse(error: any): object {
  if (error && typeof error.toResponse === 'function') {
    return error.toResponse();
  }
  
  if (isBanRelatedError(error)) {
    return {
      error: 'Ban-related error',
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    error: 'Internal server error',
    message: error?.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };
}
