import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  BackgroundJobDefinition,
  BackgroundJobRequest,
} from "./public-api";

export function validateBackgroundJobDefinition(
  definition: BackgroundJobDefinition,
): void {
  if (definition.maxRetries < 0 || definition.timeoutSeconds < 1) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Background job retry and timeout settings are invalid.",
    });
  }
}

export function validateBackgroundJobRequest(
  request: BackgroundJobRequest,
): void {
  if (!request.idempotencyKey) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Background job requests require an idempotency key.",
    });
  }
}
