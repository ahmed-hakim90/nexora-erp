import "server-only";

import { ApplicationError } from "@/core/errors";

import type { AttachmentMetadata } from "./public-api";

const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

export function validateAttachmentMetadata(metadata: AttachmentMetadata): void {
  if (metadata.sizeBytes <= 0 || metadata.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Attachment size is outside the allowed platform range.",
    });
  }

  if (metadata.version < 1) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Attachment version must be positive.",
    });
  }
}
