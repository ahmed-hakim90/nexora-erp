import "server-only";

import { logger } from "@/core/logger";

import { PlatformError, toSafePlatformError } from "./application-error";

export type SafeServerError = Readonly<{
  code: string;
  message: string;
  correlationId?: string;
}>;

export function toSafeServerError(
  error: unknown,
  fallbackCorrelationId?: string,
): SafeServerError {
  if (error instanceof PlatformError) {
    const safeError = toSafePlatformError(error);

    return {
      ...safeError,
      correlationId: safeError.correlationId ?? fallbackCorrelationId,
    };
  }

  logger.error("Unexpected server error.", {
    correlationId: fallbackCorrelationId,
    error,
  });

  return {
    code: "UNEXPECTED_ERROR",
    message: "Unexpected server error.",
    correlationId: fallbackCorrelationId,
  };
}
