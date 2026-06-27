export type PlatformErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "RATE_LIMITED"
  | "OPERATIONAL_ERROR"
  | "UNEXPECTED_ERROR";

export type PlatformErrorSeverity = "info" | "warning" | "error" | "critical";

export type PlatformErrorDetails = Readonly<Record<string, unknown>>;

export type PlatformErrorParams = Readonly<{
  code: PlatformErrorCode;
  message: string;
  correlationId?: string;
  cause?: unknown;
  details?: PlatformErrorDetails;
  retryable?: boolean;
  severity?: PlatformErrorSeverity;
  source?: string;
}>;

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly correlationId?: string;
  readonly cause?: unknown;
  readonly details?: PlatformErrorDetails;
  readonly retryable: boolean;
  readonly severity: PlatformErrorSeverity;
  readonly source?: string;

  constructor(params: PlatformErrorParams) {
    super(params.message);
    this.name = "PlatformError";
    this.code = params.code;
    this.correlationId = params.correlationId;
    this.cause = params.cause;
    this.details = params.details;
    this.retryable = params.retryable ?? false;
    this.severity = params.severity ?? "error";
    this.source = params.source;
  }
}

export type ApplicationErrorCode = PlatformErrorCode;

export class ApplicationError extends PlatformError {
  constructor(params: PlatformErrorParams) {
    super(params);
    this.name = "ApplicationError";
  }
}

export type SafePlatformError = Readonly<{
  code: PlatformErrorCode;
  message: string;
  correlationId?: string;
  retryable: boolean;
}>;

export function toSafePlatformError(error: PlatformError): SafePlatformError {
  return {
    code: error.code,
    message: error.message,
    correlationId: error.correlationId,
    retryable: error.retryable,
  };
}
