import { ApplicationError, type PlatformErrorCode } from "./application-error";

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const SECURITY_ERROR_MESSAGES: Readonly<Partial<Record<PlatformErrorCode, string>>> = {
  AUTHENTICATION_ERROR: "Sign in is required to continue.",
  AUTHORIZATION_ERROR: "You do not have permission to access this area.",
  NOT_FOUND: "The requested record could not be found.",
  OPERATIONAL_ERROR: "This action could not be completed. Try again or contact your administrator.",
  UNEXPECTED_ERROR: "Something went wrong. Try again or contact your administrator.",
};

export function sanitizeOperatorMessage(message: string): string {
  return message
    .replace(UUID_PATTERN, "[hidden]")
    .replace(/\bat\s+[^\s]+(?:\/[^\s]+)+\b/gi, "[hidden]")
    .replace(/\b(?:select|insert|update|delete)\b/gi, "[restricted]");
}

export function resolveOperatorSafeSecurityMessage(error: unknown): string {
  if (error instanceof ApplicationError) {
    const mapped = SECURITY_ERROR_MESSAGES[error.code];
    if (mapped) {
      return mapped;
    }

    return sanitizeOperatorMessage(error.message);
  }

  return SECURITY_ERROR_MESSAGES.UNEXPECTED_ERROR ?? "Something went wrong.";
}

export function isAuthorizationError(error: unknown): boolean {
  return error instanceof ApplicationError && error.code === "AUTHORIZATION_ERROR";
}
