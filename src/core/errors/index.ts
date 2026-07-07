export {
  ApplicationError,
  PlatformError,
  toSafePlatformError,
} from "./application-error";
export {
  isAuthorizationError,
  resolveOperatorSafeSecurityMessage,
  sanitizeOperatorMessage,
} from "./operator-security-messages";
export type {
  ApplicationErrorCode,
  PlatformErrorCode,
  PlatformErrorDetails,
  PlatformErrorParams,
  PlatformErrorSeverity,
  SafePlatformError,
} from "./application-error";
