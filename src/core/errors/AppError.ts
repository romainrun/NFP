export type AppErrorCode =
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE'
  | 'NETWORK'
  | 'SECURITY';

/**
 * Domain error used across layers. UI maps codes to localized messages.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(message = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message);
  }

  static database(message: string, cause?: unknown): AppError {
    return new AppError('DATABASE', message, cause);
  }

  static validation(message: string): AppError {
    return new AppError('VALIDATION', message);
  }

  static network(message: string, cause?: unknown): AppError {
    return new AppError('NETWORK', message, cause);
  }
}
