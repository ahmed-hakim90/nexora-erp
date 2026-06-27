export {
  BROWSER_SAFE_BOUNDARY,
  SERVER_ONLY_RUNTIME_BOUNDARY,
  defineRuntimeBoundary,
} from "@/core/boundaries";
export type {
  BoundaryKind,
  RuntimeBoundary,
  RuntimeBoundaryKind,
} from "@/core/boundaries";

export {
  DEFAULT_REQUEST_DIRECTION,
  DEFAULT_REQUEST_LOCALE,
  DEFAULT_REQUEST_TIMEZONE,
  DEFAULT_RUNTIME_SOURCE,
  CORRELATION_ID_HEADER,
  createCorrelationId,
  createCorrelationHeaders,
  createCorrelationMetadata,
  createCorrelationPropagationStrategy,
  isCorrelationId,
  normalizeCorrelationId,
} from "@/core/context";
export type {
  AccessExperience,
  ActorContext,
  ActorType,
  BranchContext,
  CompanyContext,
  CorrelationHeaders,
  CorrelationId,
  CorrelationMetadata,
  CorrelationPropagationStrategy,
  EmployeeContext,
  RequestContext,
  RuntimeSource,
  TenantContext,
} from "@/core/context";

export {
  ApplicationError,
  PlatformError,
  toSafePlatformError,
} from "@/core/errors";
export type {
  ApplicationErrorCode,
  PlatformErrorCode,
  PlatformErrorDetails,
  PlatformErrorParams,
  PlatformErrorSeverity,
  SafePlatformError,
} from "@/core/errors";

export {
  createLogContextFromRequest,
  createPlatformLogger,
  logger,
} from "@/core/logger";
export type { Logger, LogContext, LogLevel } from "@/core/logger";

export {
  fail,
  isPlatformFailure,
  isPlatformSuccess,
  ok,
  platformFail,
  platformOk,
} from "@/core/result";
export type {
  PlatformFailure,
  PlatformResult,
  PlatformResultMeta,
  PlatformSuccess,
  Result,
} from "@/core/result";
