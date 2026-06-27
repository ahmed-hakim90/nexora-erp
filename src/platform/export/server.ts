import "server-only";

import { ApplicationError } from "@/core/errors";

import type { ExportRequest } from "./public-api";

export function validateExportRequest(request: ExportRequest): void {
  if (!request.idempotencyKey) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Export requests require an idempotency key.",
    });
  }
}
