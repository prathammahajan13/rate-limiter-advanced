export class StorageError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_ERROR';
  public readonly operation: string;
  public readonly key: string | undefined;
  public readonly fallback: boolean;

  constructor(
    message: string,
    operation: string,
    fallback: boolean = false,
    key?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    this.operation = operation;
    this.fallback = fallback;
    this.key = key;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      key: this.key,
      fallback: this.fallback,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageConnectionError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_CONNECTION_ERROR';
  public readonly storageType: string;
  public readonly host: string | undefined;
  public readonly port: number | undefined;

  constructor(
    message: string,
    storageType: string,
    host?: string,
    port?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageConnectionError';
    this.storageType = storageType;
    this.host = host;
    this.port = port;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageConnectionError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      storageType: this.storageType,
      host: this.host,
      port: this.port,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageTimeoutError extends Error {
  public readonly statusCode: number = 504;
  public readonly code: string = 'STORAGE_TIMEOUT';
  public readonly operation: string;
  public readonly timeout: number;
  public readonly key: string | undefined;

  constructor(message: string, operation: string, timeout: number, key?: string) {
    super(message);
    this.name = 'StorageTimeoutError';
    this.operation = operation;
    this.timeout = timeout;
    this.key = key;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageTimeoutError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      timeout: this.timeout,
      key: this.key,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageKeyNotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = 'STORAGE_KEY_NOT_FOUND';
  public readonly key: string;
  public readonly operation: string;

  constructor(message: string, key: string, operation: string) {
    super(message);
    this.name = 'StorageKeyNotFoundError';
    this.key = key;
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageKeyNotFoundError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      key: this.key,
      operation: this.operation,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageKeyExistsError extends Error {
  public readonly statusCode: number = 409;
  public readonly code: string = 'STORAGE_KEY_EXISTS';
  public readonly key: string;
  public readonly operation: string;

  constructor(message: string, key: string, operation: string) {
    super(message);
    this.name = 'StorageKeyExistsError';
    this.key = key;
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageKeyExistsError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      key: this.key,
      operation: this.operation,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'STORAGE_VALIDATION_ERROR';
  public readonly field: string;
  public readonly value: any;
  public readonly operation: string;

  constructor(message: string, field: string, value: any, operation: string) {
    super(message);
    this.name = 'StorageValidationError';
    this.field = field;
    this.value = value;
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageValidationError);
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
      operation: this.operation,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageQuotaExceededError extends Error {
  public readonly statusCode: number = 507;
  public readonly code: string = 'STORAGE_QUOTA_EXCEEDED';
  public readonly quota: string;
  public readonly limit: number;
  public readonly used: number;

  constructor(message: string, quota: string, limit: number, used: number) {
    super(message);
    this.name = 'StorageQuotaExceededError';
    this.quota = quota;
    this.limit = limit;
    this.used = used;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageQuotaExceededError);
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
      timestamp: new Date().toISOString(),
    };
  }
}

export class StoragePermissionError extends Error {
  public readonly statusCode: number = 403;
  public readonly code: string = 'STORAGE_PERMISSION_ERROR';
  public readonly operation: string;
  public readonly key: string | undefined;
  public readonly permission: string;

  constructor(message: string, operation: string, permission: string, key?: string) {
    super(message);
    this.name = 'StoragePermissionError';
    this.operation = operation;
    this.permission = permission;
    this.key = key;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StoragePermissionError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      permission: this.permission,
      key: this.key,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageSerializationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_SERIALIZATION_ERROR';
  public readonly operation: string;
  public readonly data?: any;

  constructor(message: string, operation: string, data?: any) {
    super(message);
    this.name = 'StorageSerializationError';
    this.operation = operation;
    this.data = data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageSerializationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      data: this.data,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageDeserializationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_DESERIALIZATION_ERROR';
  public readonly operation: string;
  public readonly key: string;
  public readonly rawData?: any;

  constructor(message: string, operation: string, key: string, rawData?: any) {
    super(message);
    this.name = 'StorageDeserializationError';
    this.operation = operation;
    this.key = key;
    this.rawData = rawData;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageDeserializationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      key: this.key,
      rawData: this.rawData,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageConfigurationError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_CONFIG_ERROR';
  public readonly storageType: string;
  public readonly configField: string;

  constructor(message: string, storageType: string, configField: string) {
    super(message);
    this.name = 'StorageConfigurationError';
    this.storageType = storageType;
    this.configField = configField;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageConfigurationError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      storageType: this.storageType,
      configField: this.configField,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageMaintenanceError extends Error {
  public readonly statusCode: number = 503;
  public readonly code: string = 'STORAGE_MAINTENANCE';
  public readonly operation: string;
  public readonly estimatedDuration: number | undefined;

  constructor(message: string, operation: string, estimatedDuration?: number) {
    super(message);
    this.name = 'StorageMaintenanceError';
    this.operation = operation;
    this.estimatedDuration = estimatedDuration;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageMaintenanceError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      estimatedDuration: this.estimatedDuration,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageBackupError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_BACKUP_ERROR';
  public readonly operation: string;
  public readonly backupType: string;

  constructor(message: string, operation: string, backupType: string) {
    super(message);
    this.name = 'StorageBackupError';
    this.operation = operation;
    this.backupType = backupType;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageBackupError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      backupType: this.backupType,
      timestamp: new Date().toISOString(),
    };
  }
}

export class StorageRestoreError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'STORAGE_RESTORE_ERROR';
  public readonly operation: string;
  public readonly backupId: string;

  constructor(message: string, operation: string, backupId: string) {
    super(message);
    this.name = 'StorageRestoreError';
    this.operation = operation;
    this.backupId = backupId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageRestoreError);
    }
  }

  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      operation: this.operation,
      backupId: this.backupId,
      timestamp: new Date().toISOString(),
    };
  }
}

// Utility function to check if an error is a storage error
export function isStorageError(error: any): error is StorageError {
  return error instanceof StorageError;
}

// Utility function to check if an error is a storage-related error
export function isStorageRelatedError(error: any): boolean {
  return (
    error instanceof StorageError ||
    error instanceof StorageConnectionError ||
    error instanceof StorageTimeoutError ||
    error instanceof StorageKeyNotFoundError ||
    error instanceof StorageKeyExistsError ||
    error instanceof StorageValidationError ||
    error instanceof StorageQuotaExceededError ||
    error instanceof StoragePermissionError ||
    error instanceof StorageSerializationError ||
    error instanceof StorageDeserializationError ||
    error instanceof StorageConfigurationError ||
    error instanceof StorageMaintenanceError ||
    error instanceof StorageBackupError ||
    error instanceof StorageRestoreError
  );
}

// Utility function to check if a storage error is retryable
export function isStorageErrorRetryable(error: any): boolean {
  if (error instanceof StorageConnectionError) {
    return true;
  }
  if (error instanceof StorageTimeoutError) {
    return true;
  }
  if (error instanceof StorageMaintenanceError) {
    return true;
  }
  if (error instanceof StorageError && error.fallback) {
    return false;
  }
  return false;
}

// Utility function to get storage error response
export function getStorageErrorResponse(error: any): object {
  if (error && typeof error.toJSON === 'function') {
    return error.toJSON();
  }
  
  if (isStorageRelatedError(error)) {
    return {
      error: 'Storage error',
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
